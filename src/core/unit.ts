import { MapSet, MapMap } from './map';
import { AnimationTicker, Timer, TimerOptions } from './time';
import { Eventor } from './event';

//----------------------------------------------------------------------------------------------------
// utils
//----------------------------------------------------------------------------------------------------

export const SYSTEM_EVENTS: string[] = ['start', 'update', 'render', 'stop', 'finalize'] as const;

export type UnitElement = HTMLElement | SVGElement;

export class UnitPromise {
    public promise: Promise<any>;
    public Component: Function | null;
    constructor(promise: Promise<any>, Component: Function | null) {
        this.promise = promise;
        this.Component = Component;
    }
    public then(callback: Function): UnitPromise { return this.wrap('then', callback); }
    public catch(callback: Function): UnitPromise { return this.wrap('catch', callback); }
    public finally(callback: Function): UnitPromise { return this.wrap('finally', callback); }
    
    private wrap(key: 'then' | 'catch' | 'finally', callback: Function): UnitPromise {
        const snapshot = Unit.snapshot(Unit.currentUnit);
        this.promise = (this.promise[key] as Function)((...args: any[]) => Unit.scope(snapshot, callback, ...args));
        return this;
    }
}

export class UnitTimer {
    private unit: Unit | null = null;
    private stack: Object[] = [];

    public clear() {
        this.stack = [];
        this.unit?.finalize();
        this.unit = null;
    }

    public timeout(callback: Function, duration: number = 0) {
        return UnitTimer.execute(this, { callback, duration }, 1)
    }
    public interval(callback: Function, duration: number = 0, iterations: number = 0) {
        return UnitTimer.execute(this, { callback, duration }, iterations)
    }
    public transition(transition: Function, duration: number = 0, easing?: string) {
        return UnitTimer.execute(this, { transition, duration, easing }, 1)
    }

    private static execute(timer: UnitTimer, options: TimerOptions, iterations: number) {
        const props = { options, iterations, snapshot: Unit.snapshot(Unit.currentUnit) };
        if (timer.unit === null || timer.unit._.state === 'finalized') {
            timer.unit = new Unit(Unit.currentUnit, null, UnitTimer.Component, props);
        } else if (timer.stack.length === 0) {
            timer.stack.push(props);
            timer.unit.on('finalize', () => UnitTimer.next(timer));
        } else {
            timer.stack.push(props);  
        }
        return timer;
    }

    private static next(timer: UnitTimer) {
        if (timer.stack.length > 0) {
            timer.unit = new Unit(Unit.currentUnit, null, UnitTimer.Component, timer.stack.shift());
            timer.unit.on('finalize', () => UnitTimer.next(timer));
        }
    }

    private static Component(unit: Unit, { options, iterations, snapshot }: { options: TimerOptions, iterations: number,snapshot: Snapshot }) {
        let counter = 0;
        let timer = new Timer({ callback, transition, duration: options.duration, easing: options.easing });
        
        function callback() {
            if (options.callback) Unit.scope(snapshot, options.callback);
            if (iterations <= 0 || counter < iterations - 1) {
                timer = new Timer({ callback, transition, duration: options.duration, easing: options.easing });
            } else {
                unit.finalize();
            }
            counter++;
        }
        function transition(value: number) {
            if (options.transition) Unit.scope(snapshot, options.transition, { value });
        }

        unit.on('finalize', () => timer.clear());
    }
}

interface Context { stack: Context | null; key?: any; value?: any; }
interface Snapshot { unit: Unit; context: Context; element: UnitElement; component: Function | null; }

interface Internal {
    parent: Unit | null;
    target: Object | null;
    props?: Object;

    baseElement: UnitElement;
    baseContext: Context;
    baseComponent: Function;
    currentElement: UnitElement;
    currentContext: Context;
    currentComponent: Function | null;
    anchor: UnitElement | null;
    state: string;
    tostart: boolean;
    protected: boolean;

    ancestors: Unit[];
    children: Unit[];
    promises: UnitPromise[];
    nestElements: { element: UnitElement, owned: boolean }[];
    components: Function[];
    listeners: MapMap<string, Function, { element: UnitElement, component: Function | null, execute: Function }>;
    defines: Record<string, any>;
    systems: Record<string, { listener: Function, execute: Function }[]>;

    eventor: Eventor;
}

function DefaultComponent(unit: Unit, { text }: { text?: string }) {
    if (text !== undefined) {
        unit.element.textContent = text;
    }
}

//----------------------------------------------------------------------------------------------------
// unit
//----------------------------------------------------------------------------------------------------

export class Unit {
    [key: string]: any;
    public _: Internal;

    constructor(parent: Unit | null, target: UnitElement | string | null, component?: Function | string | number, props?: Object) {
        let baseElement: UnitElement;
        if (target instanceof HTMLElement || target instanceof SVGElement) {
            baseElement = target;
        } else if (parent !== null) {
            baseElement = parent._.currentElement;
        } else {
            baseElement = document?.body ? document.body : null as unknown as UnitElement;
        }

        let baseComponent: Function;
        if (typeof component === 'function') {
            baseComponent = component;
        } else if (typeof component === 'string' || typeof component === 'number') {
            baseComponent = DefaultComponent;
            props = { text: component.toString() };
        } else {
            baseComponent = DefaultComponent;
        }

        const baseContext = parent?._.currentContext ?? { stack: null };
        
        this._ = { parent, target, baseElement, baseContext, baseComponent, props } as Internal;
        parent?._.children.push(this);
        
        Unit.initialize(this, null);

    }

    public get element(): UnitElement {
        return this._.currentElement;
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
        if (this._.parent) {
            this._.parent._.children = this._.parent._.children.filter((unit: Unit) => unit !== this);
        }
    }

    public reboot(): void {
        let anchor: UnitElement | null = null;
        if (this._.nestElements[0] && this._.nestElements[0].owned === true) {
            anchor = this._.nestElements[0].element.nextElementSibling as UnitElement
        }
        Unit.stop(this);
        Unit.finalize(this);
        Unit.initialize(this, anchor);
    }

    static initialize(unit: Unit, anchor: UnitElement | null): void {
        const backup = Unit.currentUnit;
        Unit.currentUnit = unit;

        unit._ = Object.assign(unit._, {
            currentElement: unit._.baseElement,
            currentContext: unit._.baseContext,
            currentComponent: null,
            anchor,
            state: 'invoked',
            tostart: true,
            protected: false,
            ancestors: unit._.parent ? [unit._.parent, ...unit._.parent._.ancestors] : [],
            children: [],
            nestElements: [],
            promises: [],
            components: [],
            listeners: new MapMap(),
            defines: {},
            systems: { start: [], update: [], render: [], stop: [], finalize: [] },
            eventor: new Eventor(),
        });

        // nest html element
        if (typeof unit._.target === 'string') {
            Unit.nest(unit, unit._.target); 
        }

        // setup component
        Unit.extend(unit, unit._.baseComponent, unit._.props); 

        // whether the unit promise was resolved
        Promise.all(unit._.promises.map(p => p.promise)).then(() => unit._.state = 'initialized');

        Unit.currentUnit = backup;
    }

    static finalize(unit: Unit): void {
        if (unit._.state !== 'finalized' && unit._.state !== 'finalizing') {
            unit._.state = 'finalizing';

            [...unit._.children].reverse().forEach((child: Unit) => child.finalize());
            [...unit._.systems.finalize].reverse().forEach(({ execute }) => execute());

            unit.off();
            unit._.components.forEach((component) => Unit.component2units.delete(component, unit));

            for (const { element, owned } of unit._.nestElements.reverse()) {
                if (owned === true) {
                    element.remove();
                }
            }
            unit._.currentElement = unit._.baseElement;

            // reset defines
            Object.keys(unit._.defines).forEach((key) => {
                delete unit[key as keyof Unit];
            });
            unit._.defines = {};
            unit._.state = 'finalized';
        }
    }

    static nest(unit: Unit, target: UnitElement | string, textContent?: string | number): UnitElement {
        if (target instanceof HTMLElement || target instanceof SVGElement) {
            unit._.nestElements.push({ element: target, owned: false });
            unit._.currentElement = target;
            return target;
        } else {
            const match = target.match(/<((\w+)[^>]*?)\/?>/);
            if (match !== null) {
                let element: UnitElement;
                if (unit._.anchor !== null) {
                    unit._.anchor.insertAdjacentHTML('beforebegin', `<${match[1]}></${match[2]}>`);
                    element = unit._.anchor.previousElementSibling as UnitElement;
                    unit._.anchor = null;
                } else {
                    unit._.currentElement.insertAdjacentHTML('beforeend', `<${match[1]}></${match[2]}>`);
                    element = unit._.currentElement.children[unit._.currentElement.children.length - 1] as UnitElement;
                }
                unit._.currentElement = element;
                if (textContent !== undefined) {
                    element.textContent = textContent.toString();
                }
                unit._.nestElements.push({ element, owned: true });
                return element;
            } else {
                throw new Error(`xnew.nest: invalid html string [${target}]`);
            }
        }
    }

    static currentComponent: Function = () => {};
   
    static extend(unit: Unit, Component: Function, props?: Object): { [key: string]: any } {
        if (unit._.components.includes(Component) === true) {
            throw new Error(`The component is already extended.`);
        } else {
            const backupComponent = unit._.currentComponent;
            unit._.currentComponent = Component;

            const defines = Component(unit, props ?? {}) ?? {};
            if (unit._.parent && Component !== DefaultComponent) {
                if (Component === unit._.baseComponent) {
                    Unit.context(unit._.parent as Unit, Component, unit);
                } else {
                    Unit.context(unit, Component, unit);
                    Unit.context(unit._.parent as Unit, Component, unit);
                }
            }

            unit._.currentComponent = backupComponent;

            Unit.component2units.add(Component, unit);
            unit._.components.push(Component);

            Object.keys(defines).forEach((key) => {
                if (unit[key] !== undefined && unit._.defines[key] === undefined) {
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
                    throw new Error(`Only function properties can be defined as component defines. [${key}]`);
                }
                Object.defineProperty(unit._.defines, key, wrapper);
                Object.defineProperty(unit, key, wrapper);
            });

            return defines;
        }
    }

    static start(unit: Unit): void {
        if (unit._.tostart === false) return;
        if (unit._.state === 'initialized' || unit._.state === 'stopped') {
            unit._.state = 'started';
            unit._.children.forEach((child: Unit) => Unit.start(child));
            unit._.systems.start.forEach(({ execute }) => execute());
        } else if (unit._.state === 'started') {
            unit._.children.forEach((child: Unit) => Unit.start(child));
        }
    }

    static stop(unit: Unit): void {
        if (unit._.state === 'started') {
            unit._.state = 'stopped';
            unit._.children.forEach((child: Unit) => Unit.stop(child));
            unit._.systems.stop.forEach(({ execute }) => execute());
        }
    }

    static update(unit: Unit): void {
        if (unit._.state === 'started') {
            unit._.children.forEach((child: Unit) => Unit.update(child));
            unit._.systems.update.forEach(({ execute }) => execute());
        }
    }

    static render(unit: Unit): void {
        if (unit._.state === 'started' || unit._.state === 'started' || unit._.state === 'stopped') {
            unit._.children.forEach((child: Unit) => Unit.render(child));
            unit._.systems.render.forEach(({ execute }) => execute());
        }
    }

    static rootUnit: Unit;
    static currentUnit: Unit;

    static reset(): void {
        Unit.rootUnit?.finalize();
        Unit.currentUnit = Unit.rootUnit = new Unit(null, null);
        const ticker = new AnimationTicker(() => {
            Unit.start(Unit.rootUnit);
            Unit.update(Unit.rootUnit);
            Unit.render(Unit.rootUnit);
        });
        Unit.rootUnit.on('finalize', () => ticker.clear());
    }

    static scope(snapshot: Snapshot, func: Function, ...args: any[]): any {
        if (snapshot.unit._.state === 'finalized') {
            return;
        } 
        const currentUnit = Unit.currentUnit;
        const backup = Unit.snapshot(snapshot.unit);
        try {
            Unit.currentUnit = snapshot.unit;
            snapshot.unit._.currentContext = snapshot.context;
            snapshot.unit._.currentElement = snapshot.element;
            snapshot.unit._.currentComponent = snapshot.component;
            return func(...args);
        } catch (error) {
            throw error;
        } finally {
            Unit.currentUnit = currentUnit;
            snapshot.unit._.currentContext = backup.context;
            snapshot.unit._.currentElement = backup.element;
            snapshot.unit._.currentComponent = backup.component;
        }
    }

    static snapshot(unit: Unit): Snapshot {
        return { unit, context: unit._.currentContext, element: unit._.currentElement, component: unit._.currentComponent };
    }

    static context(unit: Unit, key: any, value?: any): any {
        if (value !== undefined) {
            unit._.currentContext = { stack: unit._.currentContext, key, value };
        } else {
            for (let context = unit._.currentContext; context.stack !== null; context = context.stack) {
                if (context.key === key) return context.value;
            }
        }
    }

    static component2units: MapSet<Function, Unit> = new MapSet();

    static find(Component: Function): Unit[] {
        return [...(Unit.component2units.get(Component) ?? [])];
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
        if (SYSTEM_EVENTS.includes(type)) {
            unit._.systems[type].push({ listener, execute });
        }
        if (unit._.listeners.has(type, listener) === false) {
            unit._.listeners.set(type, listener, { element: unit.element, component: unit._.currentComponent, execute });
            Unit.type2units.add(type, unit);
            if (/^[A-Za-z]/.test(type)) {
                unit._.eventor.add(unit.element, type, execute, options);
            }
        }
    }

    static off(unit: Unit, type: string, listener?: Function): void {
        if (SYSTEM_EVENTS.includes(type)) {
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
            Unit.type2units.get(type)?.forEach((unit) => {
                const find = [unit, ...unit._.ancestors].find(u => u._.protected === true);
                if (find === undefined || current._.ancestors.includes(find) === true || current === find) {
                    unit._.listeners.get(type)?.forEach((item) => item.execute(props));
                }
            });
        } else if (type[0] === '-') {
            current._.listeners.get(type)?.forEach((item) => item.execute(props));
        }
    }
}
