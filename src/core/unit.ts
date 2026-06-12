//----------------------------------------------------------------------------------------------------
// Unit — the lifecycle, ownership, and scoping primitive of xnew
//
// Unit は DOM 要素・Component・子 unit・リスナ・promise を 1 つに束ね、状態機械
// invoked → initialized → started ↔ stopped → finalizing → finalized で駆動する。
// 遅延コールバック（DOM イベント・timer・promise 継続）は Snapshot 経由で Unit.scope に再入し、
// 非同期を跨いでも元のコンポーネント内にいるかのように実行される。
//
// - Unit        : core class — lifecycle, listeners, contexts, emit
// - UnitPromise : 元の Unit スコープで再開する promise ラッパー
// - UnitTimer   : xnew.timeout / interval / transition が使うキュー式タイマー
//----------------------------------------------------------------------------------------------------

import { MapSet, MapMap } from './map';
import { Ticker, Timer } from './time';
import { Eventor, isDomElement, DomElement } from './dom';

//----------------------------------------------------------------------------------------------------
// definitions
//----------------------------------------------------------------------------------------------------

interface Context { previous: Context | null; key?: any; value?: any; }

interface Snapshot { unit: Unit; context: Context; element: DomElement; Component: Function | null; }

// lifecycle phase: invoked → initialized → started ↔ stopped → finalizing → finalized
export type Status = 'invoked' | 'initialized' | 'started' | 'stopped' | 'finalizing' | 'finalized';

// engine mode: 'server'(権威) / 'client'(複製) / null(スタンドアロン)
export type Mode = 'server' | 'client' | null;

// Unit 構築時の補助パラメータ。
// - mode  : サブツリールートのエンジンモード（親 mode が null のときの fallback）
// - setup : 構築直後・body 実行前に呼ばれるフック（sync.ts が boot 登録 / state プリシードに使う）
export interface UnitOptions {
    mode?: Mode;
    setup?: (unit: Unit) => void;
}

// Component 関数の型。戻り値 defines は xnew(...) の戻り値に合成される(Unit & A)。
export type ComponentFn<P extends object = any, A extends object = {}> =
    (unit: Unit, props: P) => A | void;

// Component の defines 型を取り出す（void は {} に落とす）。
export type DefinesOf<C> =
    C extends (...args: any[]) => infer R
        ? ([R] extends [void] ? {} : Exclude<R, void | undefined>)
        : {};

// Component の props 型を取り出す（無い場合は {}）。
export type PropsOf<C> =
    C extends (unit: Unit, props: infer P, ...rest: any[]) => any ? P : {};

const SYSTEM_EVENTS = ['start', 'update', 'render', 'stop', 'finalize'] as const;
type SystemEvent = typeof SYSTEM_EVENTS[number];
function isSystemEvent(type: string): type is SystemEvent {
    return (SYSTEM_EVENTS as readonly string[]).includes(type);
}

//----------------------------------------------------------------------------------------------------
// unit
//----------------------------------------------------------------------------------------------------

export class Unit {

    public _: {
        parent: Unit | null;
        children: Unit[];

        status: Status;
        tostart: boolean;
        protected: boolean;
        promises: UnitPromise[];
        defines: Record<string, any>;
        systems: Record<SystemEvent, { listener: Function, execute: Function }[]>;

        currentElement: DomElement;
        currentContext: Context;
        currentComponent: Function | null;

        afterSnapshot: Snapshot | null;

        nestElements: { element: DomElement, owned: boolean }[];
        Components: Function[];
        listeners: MapMap<string, Function, { element: DomElement, Component: Function | null, execute: Function }>;
        eventor: Eventor;

        key: any;   // reserved prop for find(key) (global unique assumed)
        mode: Mode;   // engine mode: 'server'(権威) / 'client'(複製) / null(スタンドアロン)。親から継承
    };

    constructor(options: UnitOptions | null, parent: Unit | null, ...args: any[]) {
        let target: DomElement | string | null;
        let Component: Function | string | number | undefined;
        let props: Object | undefined;

        // parse arguments: (target,) Component, props 
        if (isDomElement(args[0]) || typeof args[0] === 'string') {
            target = args[0] as DomElement | string;
            Component = args[1] as Function | string | number | undefined;
            props = args[2] as Object | undefined;
        } else {
            target = null;
            Component = args[0] as Function | string | number | undefined;
            props = args[1] as Object | undefined;
        }

        const backup = Unit.currentUnit;
        Unit.currentUnit = this;

        parent?._.children.push(this);

        let baseElement: DomElement;
        if (isDomElement(target)) {
            baseElement = target;
        } else if (parent !== null) {
            baseElement = parent._.currentElement;
        } else if (globalThis.document?.body) {
            baseElement = globalThis.document.body;
        } else {
            baseElement = null as unknown as DomElement;
        }

        let baseComponent: Function;
        if (typeof Component === 'function') {
            baseComponent = Component;
        } else if (typeof Component === 'string' || typeof Component === 'number') {
            baseComponent = (unit: Unit) => { unit.element.textContent = Component.toString(); };
        } else {
            baseComponent = (unit: Unit) => {};
        }

        const baseContext = parent?._.currentContext ?? { previous: null };

        const key = (props as any)?.key ?? null;
     
        this._ = {
            parent,
            status: 'invoked',
            tostart: true,
            protected: false,
            currentElement: baseElement,
            currentContext: baseContext,
            currentComponent: null,
            afterSnapshot: null,
            children: [],
            nestElements: [],
            promises: [],
            Components: [],
            listeners: new MapMap(),
            defines: {},
            systems: { start: [], update: [], render: [], stop: [], finalize: [] },
            eventor: new Eventor(),
            key,
            mode: parent ? (parent._.mode ?? options?.mode ?? null) : null,
        };

        if (options?.setup !== undefined) {
            options.setup(this);
        }

        if (typeof target === 'string') {
            Unit.nest(this, target);
        }

        Unit.extend(this, baseComponent, props);

        if (this._.status === 'invoked') {
            this._.status = 'initialized';
        }
        this._.afterSnapshot = Unit.snapshot(this);
        Unit.currentUnit = backup;
    }

    public get parent(): Unit | null {
        return this._.parent;
    }
    
    public get element(): DomElement {
        return this._.currentElement;
    }

    // この unit に登録された全 promise を集約した UnitPromise。
    // .then は keyed results で resolve / どれか reject で reject するので .catch・.finally もこれ 1 つで足りる。
    public get promise(): UnitPromise {
        return UnitPromise.results(this._.promises);
    }

    public start(): void {
        this._.tostart = true;
    }

    public stop(): void {
        this._.tostart = false;
        Unit.stop(this);
    }

    public finalize(): void {
        Unit.stop(this);
        Unit.finalize(this);
    }

    static finalize(unit: Unit): void {
        if (unit._.status !== 'finalized' && unit._.status !== 'finalizing') {
            unit._.status = 'finalizing';

            [...unit._.children].reverse().forEach((child: Unit) => child.finalize());
            [...unit._.systems.finalize].reverse().forEach(({ execute }) => execute());
            unit.off();

            [...unit._.nestElements].reverse().filter(item => item.owned).forEach(item => item.element.remove());
            unit._.Components.forEach((Component) => Unit.component2units.delete(Component, unit));
            
            // remove contexts
            const contexts = Unit.unit2Contexts.get(unit);
            contexts?.forEach((context: Context) => {
                let temp = context.previous;
                while(temp !== null) {
                    if (contexts.has(temp) === false && temp.key !== undefined) {
                        context.previous = temp;
                        context.key = undefined;
                        context.value = undefined;
                        break;
                    }
                    temp = temp.previous;
                }
            });
            Unit.unit2Contexts.delete(unit);
            unit._.currentContext = { previous: null };

            Object.keys(unit._.defines).forEach((key) => {
                delete unit[key as keyof Unit];
            });
            unit._.defines = {};
            unit._.status = 'finalized';

            if (unit._.parent) {
                unit._.parent._.children = unit._.parent._.children.filter((u: Unit) => u !== unit);
            }
        }
    }

    static nest(unit: Unit, target: DomElement | string, textContent?: string | number): DomElement {
        if (isDomElement(target)) {
            unit._.nestElements.push({ element: target, owned: false });
            unit._.currentElement = target;
            return target;
        } else {
            const match = target.match(/<((\w+)[^>]*?)\/?>/);
            if (match !== null) {
                unit._.currentElement.insertAdjacentHTML('beforeend', `<${match[1]}></${match[2]}>`);
                const element = unit._.currentElement.children[unit._.currentElement.children.length - 1] as DomElement;
                unit._.currentElement = element;
                if (textContent !== undefined) {
                    element.textContent = textContent.toString();
                }
                unit._.nestElements.push({ element, owned: true });
                return element;
            } else {
                throw new Error(`xnew.nest: invalid tag string [${target}]`);
            }
        }
    }

    static extend(unit: Unit, Component: Function, props?: Object): { [key: string]: any } {
        const backupComponent = unit._.currentComponent;
        unit._.currentComponent = Component;

        if (unit._.parent !== null) {
            Unit.addContext(unit._.parent, unit, Component, unit);
        }
        Unit.addContext(unit, unit, Component, unit);

        const defines = Component(unit, props ?? {}) ?? {};

        unit._.currentComponent = backupComponent;

        Unit.component2units.add(Component, unit);
        unit._.Components.push(Component);

        Object.keys(defines).forEach((key) => {
            if ((unit as any)[key] !== undefined && unit._.defines[key] === undefined) {
                throw new Error(`The property "${key}" already exists.`);
            }
            const descriptor = Object.getOwnPropertyDescriptor(defines, key);
            const wrapper: PropertyDescriptor = { configurable: true, enumerable: true };
            const snapshot = Unit.snapshot(unit);

            if (descriptor?.get || descriptor?.set) {
                if (descriptor?.get) wrapper.get = (...args: any[]) => Unit.scope(snapshot, descriptor.get as Function, ...args);
                if (descriptor?.set) wrapper.set = (...args: any[]) => Unit.scope(snapshot, descriptor.set as Function, ...args);
            } else if (typeof descriptor?.value === 'function') {
                wrapper.value = (...args: any[]) => Unit.scope(snapshot, descriptor.value, ...args);
            } else {
                throw new Error(`Only function properties can be defined as Component defines. [${key}]`);
            }
            Object.defineProperty(unit._.defines, key, wrapper);
            Object.defineProperty(unit, key, wrapper);
        });

        let clone = {};
        Object.defineProperties(clone, Object.getOwnPropertyDescriptors(unit._.defines));
        return clone;
    }

    static start(unit: Unit): void {
        if (unit._.tostart === false) return;
        if (unit._.status === 'initialized' || unit._.status === 'stopped') {
            unit._.status = 'started';
            unit._.children.forEach((child: Unit) => Unit.start(child));
            unit._.systems.start.forEach(({ execute }) => execute());
        } else if (unit._.status === 'started') {
            unit._.children.forEach((child: Unit) => Unit.start(child));
        }
    }

    static stop(unit: Unit): void {
        if (unit._.status === 'started') {
            unit._.status = 'stopped';
            unit._.children.forEach((child: Unit) => Unit.stop(child));
            unit._.systems.stop.forEach(({ execute }) => execute());
        }
    }

    static update(unit: Unit): void {
        if (unit._.status === 'started') {
            unit._.children.forEach((child: Unit) => Unit.update(child));
            unit._.systems.update.forEach(({ execute }) => execute());
        }
    }

    static render(unit: Unit): void {
        if (unit._.status === 'started' || unit._.status === 'stopped') {
            unit._.children.forEach((child: Unit) => Unit.render(child));
            unit._.systems.render.forEach(({ execute }) => execute());
        }
    }

    static engineRoot: Unit;
    static currentUnit: Unit;
    static reset(): void {
        Unit.engineRoot?.finalize();
        Unit.currentUnit = Unit.engineRoot = new Unit(null, null);
        const ticker = new Ticker(() => {
            Unit.start(Unit.engineRoot);
            Unit.update(Unit.engineRoot);
            Unit.render(Unit.engineRoot);
        });
        Unit.engineRoot.on('finalize', () => ticker.clear());
    }

    static scope(snapshot: Snapshot, func: Function, ...args: any[]): any {
        if (snapshot.unit._.status === 'finalized') {
            return;
        } 
        const currentUnit = Unit.currentUnit;
        const backup = Unit.snapshot(snapshot.unit);
        try {
            Unit.currentUnit = snapshot.unit;
            snapshot.unit._.currentContext = snapshot.context;
            snapshot.unit._.currentElement = snapshot.element;
            snapshot.unit._.currentComponent = snapshot.Component;
            return func(...args);
        } finally {
            Unit.currentUnit = currentUnit;
            snapshot.unit._.currentContext = backup.context;
            snapshot.unit._.currentElement = backup.element;
            snapshot.unit._.currentComponent = backup.Component;
        }
    }

    static snapshot(unit: Unit): Snapshot {
        return { unit, context: unit._.currentContext, element: unit._.currentElement, Component: unit._.currentComponent };
    }

    static unit2Contexts: MapSet<Unit, Context> = new MapSet();

    static addContext(unit: Unit, orner: Unit, key: any, value?: Unit): void {
        unit._.currentContext = { previous: unit._.currentContext, key, value };
        Unit.unit2Contexts.add(orner, unit._.currentContext);
    }

    static getContext(unit: Unit, key: any): any {
        for (let context = unit._.currentContext; context.previous !== null; context = context.previous) {
            if (context.value === Unit.currentUnit && key === unit._.currentComponent) continue;
            if (key === context.key) return context.value;
        }
    }

    static component2units: MapSet<Function, Unit> = new MapSet();

    // 祖先列（unit 自身は含まない）。
    static ancestors(unit: Unit | null): Unit[] {
        const ancestors: Unit[] = [];
        for (let u = unit?._.parent ?? null; u !== null; u = u._.parent) ancestors.push(u);
        return ancestors;
    }

    // from から遡って最初の protect 境界（無ければ undefined）。
    static protectBoundary(from: Unit | null): Unit | undefined {
        for (let u = from; u !== null; u = u._.parent) {
            if (u._.protected === true) return u;
        }
        return undefined;
    }

    // boundary 内の対象が current（とその祖先列）から可視か。
    static isVisible(boundary: Unit | undefined, current: Unit | null, ancestors: Unit[]): boolean {
        return boundary === undefined || ancestors.includes(boundary) === true || current === boundary;
    }

    static find(Component: Function, key?: any): Unit[] {
        const current = Unit.currentUnit;
        const ancestors = Unit.ancestors(current);
        return [...(Unit.component2units.get(Component) ?? [])].filter((unit) => {
            if (key !== undefined && unit._.key !== key) {
                return false;
            }
            return Unit.isVisible(Unit.protectBoundary(unit._.parent), current, ancestors);
        });
    }

    //----------------------------------------------------------------------------------------------------
    // event
    //----------------------------------------------------------------------------------------------------
    
    static type2units = new MapSet<string, Unit>();
  
    public on(type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        const types = type.trim().split(/\s+/);
        
        types.forEach((type) => Unit.on(this, type, listener, options));
    }

    public off(type?: string, listener?: Function): void {
        const types = typeof type === 'string' ? type.trim().split(/\s+/) : [...this._.listeners.keys()];
    
        types.forEach((type) => Unit.off(this, type, listener));
    }
    
    static on(unit: Unit, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        const snapshot = Unit.snapshot(Unit.currentUnit);
        const execute = (props: object) => {
            Unit.scope(snapshot, listener, Object.assign({ type }, props));
        }
        if (isSystemEvent(type)) {
            unit._.systems[type].push({ listener, execute });
        }
        if (unit._.listeners.has(type, listener) === false) {
            unit._.listeners.set(type, listener, { element: unit.element, Component: unit._.currentComponent, execute });
            Unit.type2units.add(type, unit);
            if (/^[A-Za-z]/.test(type) && unit.element !== null) {
                unit._.eventor.add(unit.element, type, execute, options);
            }
        }
    }

    static off(unit: Unit, type: string, listener?: Function): void {
        if (isSystemEvent(type)) {
            unit._.systems[type] = unit._.systems[type].filter(({ listener: lis }) => listener ? lis !== listener : false);
        }
        (listener ? [listener] : [...unit._.listeners.keys(type)]).forEach((listener) => {
            const item = unit._.listeners.get(type, listener);
            if (item === undefined) return;
            unit._.listeners.delete(type, listener);
            if (/^[A-Za-z]/.test(type)) {
                unit._.eventor.remove(type, item.execute);
            }
        });
        if (unit._.listeners.has(type) === false) {
            Unit.type2units.delete(type, unit);
        }
    }

    static emit(type: string, props: object = {}): void {
        const current = Unit.currentUnit;
        if (type[0] === '+') {
            const ancestors = Unit.ancestors(current);
            Unit.type2units.get(type)?.forEach((unit) => {
                if (Unit.isVisible(Unit.protectBoundary(unit), current, ancestors)) {
                    unit._.listeners.get(type)?.forEach((item) => item.execute(props));
                }
            });
        } else if (type[0] === '-') {
            current._.listeners.get(type)?.forEach((item) => item.execute(props));
        }
    }
}

//----------------------------------------------------------------------------------------------------
// extensions
//----------------------------------------------------------------------------------------------------

export class UnitPromise {
    private promise: Promise<any>;
    public key?: string;
    constructor(promise: Promise<any>, key?: string) { this.promise = promise; this.key = key; }

    public then(callback: Function): UnitPromise { return this.wrap('then', callback); }
    public catch(callback: Function): UnitPromise { return this.wrap('catch', callback); }
    public finally(callback: Function): UnitPromise { return this.wrap('finally', callback); }

    public static all(promises: UnitPromise[]): UnitPromise {
        return new UnitPromise(Promise.all(promises.map(p => p.promise)));
    }

    // キー付き promise だけを { key: 最終チェーン値 } に集約した UnitPromise を返す。
    public static results(promises: UnitPromise[]): UnitPromise {
        return new UnitPromise(
            Promise.all(promises.map(p => p.promise)).then((values) => {
                const out: Record<string, any> = {};
                promises.forEach((p, i) => {
                    if (p.key !== undefined) { out[p.key] = values[i]; }
                });
                return out;
            })
        );
    }

    private wrap(method: 'then' | 'catch' | 'finally', callback: Function): UnitPromise {
        const snapshot = Unit.snapshot(Unit.currentUnit);
        this.promise = (this.promise[method] as Function)((...args: any[]) => Unit.scope(snapshot, callback, ...args));
        return this;
    }
}

export class UnitTimer {
    private unit: Unit | null = null;
    private queue: Function[] = [];

    public clear() {
        this.queue = [];
        this.unit?.finalize();
        this.unit = null;
    }

    public timeout(timeout: Function, duration: number = 0) {
        return UnitTimer.execute(this, timeout, null, duration, undefined, 1);
    }
    public interval(timeout: Function, duration: number = 0, iterations: number = 0) {
        return UnitTimer.execute(this, timeout, null, duration, undefined, iterations);
    }
    public transition(transition: Function, duration: number = 0, easing?: string) {
        return UnitTimer.execute(this, null, transition, duration, easing, 1);
    }

    private static execute(timer: UnitTimer, timeout: Function | null, transition: Function | null, duration: number, easing: string | undefined, iterations: number) {
        const snapshot = Unit.snapshot(Unit.currentUnit);

        // タイマーのパラメータはクロージャで捕捉し、props では渡さない。
        const Component = (unit: Unit) => {
            let counter = 0;
            let current = new Timer(onTimeout, onTransition, duration, easing);

            function onTimeout() {
                if (timeout) Unit.scope(snapshot, timeout);
                if (iterations <= 0 || counter < iterations - 1) {
                    current = new Timer(onTimeout, onTransition, duration, easing);
                } else {
                    unit.finalize();
                }
                counter++;
            }
            function onTransition(value: number) {
                if (transition) Unit.scope(snapshot, transition, { value });
            }

            unit.on('finalize', () => current.clear());
        };

        if (timer.unit === null || timer.unit._.status === 'finalized') {
            timer.unit = new Unit(null, Unit.currentUnit, Component);
        } else if (timer.queue.length === 0) {
            timer.queue.push(Component);
            timer.unit.on('finalize', () => UnitTimer.next(timer));
        } else {
            timer.queue.push(Component);
        }
        return timer;
    }

    private static next(timer: UnitTimer) {
        if (timer.queue.length > 0) {
            timer.unit = new Unit(null, Unit.currentUnit, timer.queue.shift());
            timer.unit.on('finalize', () => UnitTimer.next(timer));
        }
    }
}

