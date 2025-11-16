import { MapSet, MapMap } from './map';
import { Ticker, Timer } from './time';

//----------------------------------------------------------------------------------------------------
// utils
//----------------------------------------------------------------------------------------------------

const SYSTEM_EVENTS: string[] = ['start', 'update', 'stop', 'finalize'] as const;

export type UnitElement = HTMLElement | SVGElement;

interface Context { stack: Context | null; key?: string; value?: any; }
interface Snapshot { unit: Unit; context: Context; element: UnitElement; }

interface UnitInternal {
    parent: Unit | null;
    target: Object | null;
    props?: Object;
    baseElement: UnitElement;
    baseContext: Context;
    baseComponent: Function;
    currentElement: UnitElement;
    currentContext: Context;

    anchor: UnitElement | null;
    state: string;
    tostart: boolean;

    children: Unit[];
    promises: Promise<any>[];
    elements: UnitElement[];
    components: Function[];
    listeners1: MapMap<string, Function, { element: UnitElement, execute: Function }>;
    listeners2: MapMap<string, Function, { element: UnitElement | Window | Document, execute: Function }>;
    defines: Record<string, any>;
    systems: Record<string, Function[]>;
}

//----------------------------------------------------------------------------------------------------
// unit
//----------------------------------------------------------------------------------------------------

export class Unit {
    [key: string]: any;
    public _: UnitInternal;

    constructor(parent: Unit | null, ...args: any[]) {
        let target: Object | string | null;
        if (args[0] instanceof HTMLElement || args[0] instanceof SVGElement) {
            target = args.shift(); // an existing html element
        } else if (typeof args[0] === 'string' && args[0].match(/<((\w+)[^>]*?)\/?>/)) {
            target = args.shift();
        } else if (typeof args[0] === 'string') {
            const query = args.shift();
            target = document.querySelector(query);
            if (target === null) throw new Error(`'${query}' can not be found.`);
        } else {
            target = null;
        }

        const component: Function | string | undefined = args.shift();
        const props: Object | undefined = args.shift();

        let baseElement: UnitElement;
        if (target instanceof HTMLElement || target instanceof SVGElement) {
            baseElement = target;
        } else if (parent !== null) {
            baseElement = parent._.currentElement;
        } else {
            baseElement = document.body;
        }

        let baseComponent: Function;
        if (typeof component === 'function') {
            baseComponent = component;
        } else if (typeof component === 'string') {
            baseComponent = (unit: Unit) => { unit.element.textContent = component; };
        } else {
            baseComponent = (unit: Unit) => {};
        }

        const baseContext = parent?._.currentContext ?? { stack: null };
        
        this._ = { parent, target, baseElement, baseContext, baseComponent, props } as UnitInternal;
        parent?._.children.push(this);
        Unit.initialize(this, null);
    }

    get element(): UnitElement {
        return this._.currentElement;
    }

    get components(): Function[] {
        return this._.components;
    }

    start(): void {
        this._.tostart = true;
    }

    stop(): void {
        this._.tostart = false;
        Unit.stop(this);
    }

    finalize(): void {
        Unit.stop(this);
        Unit.finalize(this);
        if (this._.parent) {
            this._.parent._.children = this._.parent._.children.filter((unit: Unit) => unit !== this);
        }
    }

    reboot(): void {
        const anchor = (this._.elements[0]?.nextElementSibling as UnitElement) ?? null;
        Unit.stop(this);
        Unit.finalize(this);
        Unit.initialize(this, anchor);
    }

    append(...args: any[]): void {
        new Unit(this, ...args)
    }

    static initialize(unit: Unit, anchor: UnitElement | null): void {
        const backup = Unit.current;
        Unit.current = unit;
        unit._ = Object.assign(unit._, {
            currentElement: unit._.baseElement,
            currentContext: unit._.baseContext,
            anchor,
            state: 'invoked',
            tostart: true,
            children: [],
            elements: [],
            promises: [],
            components: [],
            listeners1: new MapMap(),
            listeners2: new MapMap(),
            defines: {},
            systems: { start: [], update: [], stop: [], finalize: [] },
        });

        // nest html element
        if (typeof unit._.target === 'string') {
            Unit.nest(unit, unit._.target); 
        }

        // setup component
        Unit.extend(unit, unit._.baseComponent, unit._.props); 

        // whether the unit promise was resolved
        Promise.all(unit._.promises).then(() => unit._.state = 'initialized');

        Unit.current = backup;
    }

    static finalize(unit: Unit): void {
        if (unit._.state !== 'finalized') {
            unit._.state = 'finalized';

            unit._.children.forEach((child: Unit) => child.finalize());
            unit._.systems.finalize.forEach((listener: Function) => Unit.scope(Unit.snapshot(unit), listener));

            unit.off();
            Unit.suboff(unit, null);
            unit._.components.forEach((component) => Unit.component2units.delete(component, unit));

            if (unit._.elements.length > 0) {
                unit._.baseElement.removeChild(unit._.elements[0]);
                unit._.currentElement = unit._.baseElement;
            }

            // reset defines
            Object.keys(unit._.defines).forEach((key) => {
                if (SYSTEM_EVENTS.includes(key) === false) {
                    delete unit[key as keyof Unit];
                }
            });
            unit._.defines = {};
        }
    }

    static nest(unit: Unit, tag: string): UnitElement {
        const match = tag.match(/<((\w+)[^>]*?)\/?>/);
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
            unit._.elements.push(element);
            return element;
        } else {
            throw new Error(`Invalid tag: ${tag}`);
        }
    }

    static extend(unit: Unit, component: Function, props?: Object): { [key: string]: any } {
        unit._.components.push(component);
        Unit.component2units.add(component, unit);

        const defines = component(unit, props) ?? {};
        Object.keys(defines).forEach((key) => {
            if (unit[key] !== undefined && unit._.defines[key] === undefined) {
                throw new Error(`The property "${key}" already exists.`);
            }
            const descriptor = Object.getOwnPropertyDescriptor(defines, key);
            const wrapper: PropertyDescriptor = { configurable: true, enumerable: true };

            if (descriptor?.get) wrapper.get = Unit.wrap(unit, descriptor.get);
            if (descriptor?.set) wrapper.set = Unit.wrap(unit, descriptor.set);

            if (typeof descriptor?.value === 'function') {
                wrapper.value = Unit.wrap(unit, descriptor.value);
            } else if (descriptor?.value !== undefined) {
                wrapper.writable = true;
                wrapper.value = descriptor.value;
            }
            Object.defineProperty(unit._.defines, key, wrapper);
            Object.defineProperty(unit, key, wrapper);
        });
        return Object.assign({}, unit._.defines);
    }

    static start(unit: Unit): void {
        if (unit._.tostart === false) return;
        if (unit._.state === 'initialized' || unit._.state === 'stopped') {
            unit._.state = 'started';
            unit._.children.forEach((child: Unit) => Unit.start(child));
            unit._.systems.start.forEach((listener: Function) => Unit.scope(Unit.snapshot(unit), listener));
        } else if (unit._.state === 'started') {
            unit._.children.forEach((child: Unit) => Unit.start(child));
        }
    }

    static stop(unit: Unit): void {
        if (unit._.state === 'started') {
            unit._.state = 'stopped';
            unit._.children.forEach((child: Unit) => Unit.stop(child));
            unit._.systems.stop.forEach((listener: Function) => Unit.scope(Unit.snapshot(unit), listener));
        }
    }

    static update(unit: Unit): void {
        if (unit._.state === 'started') {
            unit._.children.forEach((child: Unit) => Unit.update(child));
            unit._.systems.update.forEach((listener: Function) => Unit.scope(Unit.snapshot(unit), listener));
        }
    }

    static root: Unit;
    static current: Unit;
    static ticker: Ticker;

    static reset(): void {
        Unit.root?.finalize();
        Unit.current = Unit.root = new Unit(null, null);
        Unit.ticker?.clear();
        Unit.ticker = new Ticker((time: number) => {
            Unit.start(Unit.root);
            Unit.update(Unit.root);
        });
    }

    static wrap(unit: Unit, listener: Function): (...args: any[]) => any {
        const snapshot = Unit.snapshot(unit);
        return (...args: any[]) => Unit.scope(snapshot, listener, ...args);
    }

    static scope(snapshot: Snapshot, func: Function, ...args: any[]): any {
        const current = Unit.current;
        const backup = Unit.snapshot(snapshot.unit);
        try {
            Unit.current = snapshot.unit;
            snapshot.unit._.currentContext = snapshot.context;
            snapshot.unit._.currentElement = snapshot.element;
            return func(...args);
        } catch (error) {
            throw error;
        } finally {
            Unit.current = current;
            snapshot.unit._.currentContext = backup.context;
            snapshot.unit._.currentElement = backup.element;
        }
    }

    static snapshot(unit: Unit): Snapshot {
        return { unit, context: unit._.currentContext, element: unit._.currentElement };
    }

    static context(unit: Unit, key: string, value?: any): any {
        if (value !== undefined) {
            unit._.currentContext = { stack: unit._.currentContext, key, value };
        } else {
            for (let context = unit._.currentContext; context.stack !== null; context = context.stack) {
                if (context.key === key) return context.value;
            }
        }
    }

    static component2units: MapSet<Function, Unit> = new MapSet();

    static find(component: Function): Unit[] {
        return [...(Unit.component2units.get(component) ?? [])];
    }

    //----------------------------------------------------------------------------------------------------
    // event
    //----------------------------------------------------------------------------------------------------
    
    static type2units = new MapSet<string, Unit>();
  
    on(type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        type.trim().split(/\s+/).forEach((type) => {
            if (SYSTEM_EVENTS.includes(type)) {
                this._.systems[type].push(listener);
            }
            if (this._.listeners1.has(type, listener) === false) {
                const execute = Unit.wrap(Unit.current, listener);
                this._.listeners1.set(type, listener, { element: this.element, execute });
                Unit.type2units.add(type, this);
                if (/^[A-Za-z]/.test(type)) {
                    this.element.addEventListener(type, execute, options);
                }
            }
        });
    }

    off(type?: string, listener?: Function): void {
        const types = typeof type === 'string' ? type.trim().split(/\s+/) : [...this._.listeners1.keys()];
        types.forEach((type) => {
            if (SYSTEM_EVENTS.includes(type)) {
                this._.systems[type] = this._.systems[type].filter((lis: Function) => listener ? lis !== listener : false);
            }
            (listener ? [listener] : [...this._.listeners1.keys(type)]).forEach((listener) => {
                const item = this._.listeners1.get(type, listener);
                if (item !== undefined) {
                    this._.listeners1.delete(type, listener);
                    if (/^[A-Za-z]/.test(type)) {
                        item.element.removeEventListener(type, item.execute as EventListener);
                    }
                }
            });
            if (this._.listeners1.has(type) === false) {
                Unit.type2units.delete(type, this);
            }
        });
    }

    emit(type: string, ...args: any[]) {
        if (type[0] === '+') {
            Unit.type2units.get(type)?.forEach((unit) => {
                unit._.listeners1.get(type)?.forEach((item) => item.execute(...args));
            });
        } else if (type[0] === '-') {
            this._.listeners1.get(type)?.forEach((item) => item.execute(...args));
        }
    }

    static subon(unit: Unit, target: UnitElement | Window | Document, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        type.trim().split(/\s+/).forEach((type) => {
            if (unit._.listeners2.has(type, listener) === false) {
                const execute = Unit.wrap(unit, listener);
                unit._.listeners2.set(type, listener, { element: target, execute });
                target.addEventListener(type, execute, options);
            }
        });
    }

    static suboff(unit: Unit, target: UnitElement | Window | Document | null, type?: string, listener?: Function): void {
        const types = typeof type === 'string' ? type.trim().split(/\s+/) : [...unit._.listeners2.keys()];
        types.forEach((type) => {
            (listener ? [listener] : [...unit._.listeners2.keys(type)]).forEach((listener) => {
                const item = unit._.listeners2.get(type, listener);
                if (item !== undefined && (target === null || target === item.element)) {
                    unit._.listeners2.delete(type, listener);
                    item.element.removeEventListener(type, item.execute as EventListener);
                }
            });
        });
    }
}

//----------------------------------------------------------------------------------------------------
// unit promise
//----------------------------------------------------------------------------------------------------

export class UnitPromise {
    private promise: Promise<any>;
    constructor(promise: Promise<any>) { this.promise = promise; }
    then(callback: Function): UnitPromise {
        this.promise = this.promise.then(Unit.wrap(Unit.current, callback));
        return this;
    }
    catch(callback: Function): UnitPromise {
        this.promise = this.promise.catch(Unit.wrap(Unit.current, callback));
        return this;
    }
    finally(callback: Function): UnitPromise {
        this.promise = this.promise.finally(Unit.wrap(Unit.current, callback));
        return this;
    }
}

//----------------------------------------------------------------------------------------------------
// unit timer
//----------------------------------------------------------------------------------------------------

export class UnitTimer {
    private unit: Unit;
    private stack: Object[] = [];

    constructor(
        { transition, timeout, duration, easing, loop }:
        { transition?: Function, timeout?: Function, duration: number, easing?: string, loop?: boolean }
    ) {
        this.unit = new Unit(Unit.current, UnitTimer.Component, { snapshot: Unit.snapshot(Unit.current), transition, timeout, duration, easing, loop });
    }

    clear() {
        this.stack = [];
        this.unit.finalize();
    }

    timeout(timeout: Function, duration: number = 0) {
        UnitTimer.execute(this, { timeout, duration })
        return this;
    }

    transition(transition: Function, duration: number = 0, easing: string = 'linear') {
        UnitTimer.execute(this, { transition, duration, easing })
        return this;
    }

    static execute(timer: UnitTimer,
        { transition, timeout, duration, easing, loop }:
        { transition?: Function, timeout?: Function, duration: number, easing?: string, loop?: boolean }
    ) {
        if (timer.unit._.state === 'finalized') {
            timer.unit = new Unit(Unit.current, UnitTimer.Component, { snapshot: Unit.snapshot(Unit.current), transition, timeout, duration, easing, loop });
        } else if (timer.stack.length === 0) {
            timer.stack.push({ snapshot: Unit.snapshot(Unit.current), transition, timeout, duration, easing, loop });  
            timer.unit.on('finalize', () => { UnitTimer.next(timer); });
        } else {
            timer.stack.push({ snapshot: Unit.snapshot(Unit.current), transition, timeout, duration, easing, loop });  
        }
    }

    static next(timer: UnitTimer) {
        if (timer.stack.length > 0) {
            timer.unit = new Unit(Unit.current, UnitTimer.Component, timer.stack.shift());
            timer.unit.on('finalize', () => { UnitTimer.next(timer); });
        }
    }

    static Component(unit: Unit,
        { snapshot, transition, timeout, duration, loop, easing }:
        { snapshot: Snapshot, transition?: Function, timeout?: Function, duration?: number, loop?: boolean, easing?: string }
    ) {
        const timer = new Timer((x: number) => {
            if (transition !== undefined) Unit.scope(snapshot, transition, x);
        }, () => {
            if (transition !== undefined) Unit.scope(snapshot, transition, 1.0);
            if (timeout !== undefined) Unit.scope(snapshot, timeout);
            if (loop === false) {
                unit.finalize();
            }
        }, duration, { loop, easing });

        unit.on('finalize', () => timer.clear());
    }
}

