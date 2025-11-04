import { MapSet, MapMap } from './map';
import { Ticker } from './time';

//----------------------------------------------------------------------------------------------------
// Utils
//----------------------------------------------------------------------------------------------------

const SYSTEM_EVENTS: string[] = ['start', 'update', 'stop', 'finalize'] as const;

export type UnitElement = HTMLElement | SVGElement;

interface Context {
    stack: Context | null;
    key?: string;
    value?: any;
}

interface Snapshot {
    unit: Unit;
    context: Context;
    element: UnitElement;
}

interface Capture {
    checker: (unit: Unit) => boolean;
    execute: (unit: Unit) => any;
}

export class UnitPromise {
    private promise: Promise<any>;

    constructor(promise: Promise<any>) {
        this.promise = promise;
    }
    then(callback: Function): UnitPromise {
        this.promise = this.promise.then(Unit.wrap(callback));
        return this;
    }
    catch(callback: Function): UnitPromise {
        this.promise = this.promise.catch(Unit.wrap(callback));
        return this;
    }
    finally(callback: Function): UnitPromise {
        this.promise = this.promise.finally(Unit.wrap(callback));
        return this;
    }
}

interface UnitInternal {
    parent: Unit | null;
    children: Unit[];
    target: Object | null;
    props?: Object;
    baseElement: UnitElement;
    baseContext: Context;
    baseComponent: Function;
    currentElement: UnitElement;
    currentContext: Context;

    promises: Promise<any>[];
    components: Function[];
    listeners: MapMap<string, Function, [UnitElement, Function]>;
    sublisteners: MapMap<string, Function, [UnitElement | Window | Document, Function]>;
    captures: Capture[];
    state: string;
    tostart: boolean;
    defines: Record<string, any>;
    system: Record<string, Function[]>;
}

//----------------------------------------------------------------------------------------------------
// Unit
//----------------------------------------------------------------------------------------------------

export class Unit {
    [key: string]: any;

    public _!: UnitInternal;

    static roots: Unit[] = [];
    static current: Unit | null = null;

    constructor(target: Object | null, component?: Function | string, props?: Object) {
        const parent = Unit.current;

        let baseElement: UnitElement;
        if (target instanceof HTMLElement || target instanceof SVGElement) {
            baseElement = target;
        } else if (parent !== null) {
            baseElement = parent._.currentElement ?? parent._.baseElement;
        } else {
            baseElement = document.body;
        }

        let baseComponent: Function;
        if (typeof component === 'function') {
            baseComponent = component;
        } else if (typeof component === 'string') {
            baseComponent = (self: Unit) => { self.element.textContent = component; };
        } else {
            baseComponent = (self: Unit) => {};
        }

        const baseContext = parent ? parent._.currentContext : { stack: null };

        this._ = { parent, target, baseElement, baseContext, baseComponent, props } as UnitInternal;

        (parent?._.children ?? Unit.roots).push(this);
        Unit.initialize(this, { element: baseElement, position: 'beforeend' });
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
        } else {
            Unit.roots = Unit.roots.filter((unit: Unit) => unit !== this);
        }
    }

    reboot(): void {
        Unit.stop(this);
        let first: Element = this._.currentElement;
        while (first.parentElement && first.parentElement !== this._.baseElement) {
            first = first.parentElement as Element;
        }

        let nextNest: { element: UnitElement, position: InsertPosition };
        if (first.parentElement === this._.baseElement && first.nextElementSibling) {
            nextNest = { element: first.nextElementSibling as UnitElement, position: 'beforebegin' as InsertPosition };
        } else {
            nextNest = { element: this._.baseElement, position: 'beforeend' as InsertPosition };
        }

        Unit.finalize(this);
        Unit.initialize(this, nextNest);
    }

    static initialize(unit: Unit, nextNest: { element: UnitElement, position: InsertPosition }): void {
        unit._ = Object.assign(unit._, {
            currentElement: unit._.baseElement,
            currentContext: unit._.baseContext,
            children: [],
            promises: [],
            components: [],
            listeners: new MapMap<string, Function, [UnitElement, Function]>(),
            sublisteners: new MapMap<string, Function, [UnitElement | Window | Document, Function]>(),
            captures: [],
            state: 'invoked',
            tostart: true,
            defines: {},
            system: { start: [], update: [], stop: [], finalize: [] },
        });
        Unit.current = unit;

        // nest html element
        if (typeof unit._.target === 'string') {
            Unit.nest(unit, nextNest.element, nextNest.position, unit._.target);
        }

        // setup component
        Unit.extend(unit, unit._.baseComponent, unit._.props);

        // whether the unit promise was resolved
        Promise.all(unit._.promises).then(() => unit._.state = 'initialized');

        // setup capture
        let current = unit;
        while (1) {
            let captured = false;
            for (const capture of current._.captures) {
                if (capture.checker(unit)) {
                    capture.execute(unit);
                    captured = true;
                }
            }
            if (captured === false && current._.parent !== null) {
                current = current._.parent;
            } else {
                break;
            }
        }
        Unit.current = unit._.parent;
    }

    static finalize(unit: Unit): void {
        if (unit._.state !== 'finalized' && unit._.state !== 'pre-finalized') {
            unit._.state = 'pre-finalized';

            unit._.children.forEach((child: Unit) => child.finalize());
            unit._.system.finalize.forEach((listener: Function) => {
                Unit.scope(Unit.snapshot(unit), listener);
            });

            unit.off();
            Unit.suboff(unit, null);
            unit._.components.forEach((component) => {
                Unit.componentUnits.delete(component, unit);
            });

            while (unit._.currentElement !== unit._.baseElement && unit._.currentElement.parentElement !== null) {
                const parent = unit._.currentElement.parentElement;
                parent.removeChild(unit._.currentElement);
                unit._.currentElement = parent;
            }

            // reset defines
            Object.keys(unit._.defines).forEach((key) => {
                if (SYSTEM_EVENTS.includes(key) === false) {
                    delete unit[key as keyof Unit];
                }
            });
            unit._.defines = {};
            unit._.state = 'finalized';
        }
    }

    static nest(unit: Unit, baseElement: Element, position: InsertPosition, tag: string): UnitElement | null {
        const match = tag.match(/<((\w+)[^>]*?)\/?>/);
        if (match !== null) {
            let element: UnitElement;
            baseElement.insertAdjacentHTML(position, `<${match[1]}></${match[2]}>`);
            if (position === 'beforebegin') {
                element = baseElement.previousElementSibling as UnitElement;
            } else {
                element = baseElement.children[baseElement.children.length - 1] as UnitElement;
            }
            unit._.currentElement = element;
        }
        return unit.element;
    }

    static extend(unit: Unit, component: Function, props?: Object): void {
        unit._.components.push(component);
        Unit.componentUnits.add(component, unit);

        const defines = component(unit, props) ?? {};

        Object.keys(defines).forEach((key) => {
            if (unit[key as keyof Unit] !== undefined && unit._.defines[key] === undefined) {
                throw new Error(`The property "${key}" already exists.`);
            }
            const descriptor = Object.getOwnPropertyDescriptor(defines, key);
            const wrappedDesc: PropertyDescriptor = { configurable: true, enumerable: true };

            if (descriptor?.get) {
                wrappedDesc.get = Unit.wrap(descriptor.get);
            }
            if (descriptor?.set) {
                wrappedDesc.set = Unit.wrap(descriptor.set);
            }
            if (typeof descriptor?.value === 'function') {
                wrappedDesc.value = Unit.wrap(descriptor.value);
            } else if (descriptor?.value !== undefined) {
                wrappedDesc.writable = true;
                wrappedDesc.value = descriptor.value;
            }
            Object.defineProperty(unit._.defines, key, wrappedDesc);
            Object.defineProperty(unit, key, wrappedDesc);
        });
    }

    static start(unit: Unit, time: number): void {
        if (unit._.tostart === false) return;
        if (unit._.state === 'initialized' || unit._.state === 'stopped') {
            unit._.state = 'started';
            unit._.children.forEach((child: Unit) => Unit.start(child, time));
            unit._.system.start.forEach((listener: Function) => {
                Unit.scope(Unit.snapshot(unit), listener);
            });
        } else if (unit._.state === 'started') {
            unit._.children.forEach((child: Unit) => Unit.start(child, time));
        }
    }

    static stop(unit: Unit): void {
        if (unit._.state === 'started') {
            unit._.state = 'stopped';
            unit._.children.forEach((child: Unit) => Unit.stop(child));
            unit._.system.stop.forEach((listener: Function) => {
                Unit.scope(Unit.snapshot(unit), listener);
            });
        }
    }

    static update(unit: Unit, time: number): void {
        if (unit._.state === 'started') {
            unit._.children.forEach((child: Unit) => Unit.update(child, time));
            unit._.system.update.forEach((listener: Function) => {
                Unit.scope(Unit.snapshot(unit), listener);
            });
        }
    }

    static ticker(time: number) {
        Unit.roots.forEach((unit) => {
            Unit.start(unit, time);
            Unit.update(unit, time);
        });
    }

    static reset(): void {
        Unit.roots.forEach((unit) => unit.finalize());
        Unit.roots = [];
        Ticker.clear(Unit.ticker);
        Ticker.set(Unit.ticker);
    }

    //----------------------------------------------------------------------------------------------------
    // scope
    //----------------------------------------------------------------------------------------------------

    static wrap(listener: Function): (...args: any[]) => any {
        const snapshot = Unit.snapshot(Unit.current as Unit);
        return (...args: any[]) => Unit.scope(snapshot, listener, ...args);
    }

    static scope(snapshot: Snapshot | null, func: Function, ...args: any[]): any {
        if (snapshot === null) return;
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

    static stack(unit: Unit, key: string, value: any): void {
        unit._.currentContext = { stack: unit._.currentContext, key, value };
    }

    static trace(unit: Unit, key: string): any {
        for (let context = unit._.currentContext; context !== null; context = context.stack) {
            if (context.key === key) {
                return context.value;
            }
        }
    }

    static componentUnits: MapSet<Function, Unit> = new MapSet();

    static find(component: Function): Unit[] {
        return [...(Unit.componentUnits.get(component) ?? [])];
    }

    //----------------------------------------------------------------------------------------------------
    // event
    //----------------------------------------------------------------------------------------------------
    
    static typeUnits = new MapSet<string, Unit>();
  
    on(type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        if (this._.state === 'finalized') return;
        type.trim().split(/\s+/).forEach((type) => {
            if (SYSTEM_EVENTS.includes(type)) {
                this._.system[type].push(listener);
            }
            if (this._.listeners.has(type, listener) === false) {
                const execute = Unit.wrap(listener);
                this._.listeners.set(type, listener, [this.element, execute]);
                Unit.typeUnits.add(type, this);
                if (/^[A-Za-z]/.test(type)) {
                    this.element.addEventListener(type, execute, options);
                }
            }
        });
    }

    off(type?: string, listener?: Function): void {
        const types = typeof type === 'string' ? type.trim().split(/\s+/) : [...this._.listeners.keys()];
        types.forEach((type) => {
            if (SYSTEM_EVENTS.includes(type)) {
                this._.system[type] = this._.system[type].filter((lis: Function) => listener ? lis !== listener : false);
            }
            (listener ? [listener] : [...this._.listeners.keys(type)]).forEach((lis) => {
                const tuple = this._.listeners.get(type, lis);
                if (tuple !== undefined) {
                    const [target, execute] = tuple;
                    this._.listeners.delete(type, lis);
                    if (/^[A-Za-z]/.test(type)) {
                        target.removeEventListener(type, execute as EventListener);
                    }
                }
            });
            if (this._.listeners.has(type) === false) {
                Unit.typeUnits.delete(type, this);
            }
        });
    }

    emit(type: string, ...args: any[]) {
        if (this._.state === 'finalized') return;
        if (type[0] === '+') {
            Unit.typeUnits.get(type)?.forEach((unit) => {
                unit._.listeners.get(type)?.forEach(([_, execute]) => execute(...args));
            });
        } else if (type[0] === '-') {
            this._.listeners.get(type)?.forEach(([_, execute]) => execute(...args));
        }
    }

    static subon(unit: any, target: UnitElement | Window | Document, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        type.trim().split(/\s+/).forEach((type) => {
            if (unit._.sublisteners.has(type, listener) === false) {
                const execute = Unit.wrap(listener);
                unit._.sublisteners.set(type, listener, [target, execute]);
                target.addEventListener(type, execute as EventListener, options);
            }
        });
    }

    static suboff(unit: any, target: UnitElement | Window | Document | null, type?: string, listener?: Function): void {
        const types = typeof type === 'string' ? type.trim().split(/\s+/) : [...unit._.sublisteners.keys()];
        types.forEach((type) => {
            (listener ? [listener] : [...unit._.sublisteners.keys(type)]).forEach((lis) => {
                const tuple = unit._.sublisteners.get(type, lis);
                if (tuple !== undefined) {
                    const [element, execute] = tuple;
                    if (target === null || target === element) {
                        unit._.sublisteners.delete(type, lis);
                        element.removeEventListener(type, execute as EventListener);
                    }
                }
            });
        });
    }
}

Unit.reset();
