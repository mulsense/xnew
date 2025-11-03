import { MapSet, MapMap } from './map';
import { Ticker } from './time';

//----------------------------------------------------------------------------------------------------
// Definitions
//----------------------------------------------------------------------------------------------------

const SYSTEM_EVENTS: string[] = ['start', 'update', 'stop', 'finalize'] as const;

export type UnitElement = HTMLElement | SVGElement;

interface Context {
    stack: Context | null;
    key: string;
    value: any;
}

interface Snapshot {
    unit: Unit | null;
    context: Context | null;
    element: UnitElement | null;
}

interface Capture {
    checker: (unit: Unit) => boolean;
    execute: (unit: Unit) => any;
}

interface UnitInternal {
    parent: Unit | null;
    children: Unit[];
    target: Object | null;
    props?: Object;
    baseElement: UnitElement;
    baseContext: Context | null;
    baseComponent: Function;
    currentElement: UnitElement;
    nextNest: { element: UnitElement, position: InsertPosition };
    components: Set<Function>;
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

    constructor(target: Object | null, component?: Function | string, props?: Object) {
        const parent = UnitScope.current;

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

        this._ = {
            parent,
            target,
            baseContext: UnitScope.contexts.get(parent) ?? null,
            baseElement,
            baseComponent,
            props,
        } as UnitInternal;

        (parent?._.children ?? Unit.roots).push(this);
        Unit.initialize(this, { element: baseElement, position: 'beforeend' });
    }

    get element(): UnitElement {
        return this._.currentElement;
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
            nextNest,
            children: [],
            components: new Set<Function>(),
            listeners: new MapMap<string, Function, [UnitElement, Function]>(),
            sublisteners: new MapMap<string, Function, [UnitElement | Window | Document, Function]>(),
            captures: [],
            state: 'invoked',
            tostart: true,
            currentElement: unit._.baseElement,
            defines: {},
            system: { start: [], update: [], stop: [], finalize: [] },
        });

        UnitScope.initialize(unit, unit._.baseContext);

        // nest html element
        if (typeof unit._.target === 'string') {
            Unit.nest(unit, unit._.target);
        }

        // setup component
        if (typeof unit._.baseComponent === 'function') {
            UnitScope.execute(
                { unit, context: null, element: null },
                () => Unit.extend(unit, unit._.baseComponent as Function, unit._.props)
            );
        }

        // whether the unit promise was resolved
        UnitPromise.get(unit)?.then(() => unit._.state = 'initialized');

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
    }

    static finalize(unit: Unit): void {
        if (unit._.state !== 'finalized' && unit._.state !== 'pre-finalized') {
            unit._.state = 'pre-finalized';

            unit._.children.forEach((child: Unit) => child.finalize());
            unit._.system.finalize.forEach((listener: Function) => {
                UnitScope.execute(UnitScope.snapshot(unit), listener);
            });

            unit.off();
            Unit.suboff(unit, null);
            unit._.components.forEach((component) => {
                Unit.componentUnits.delete(component, unit);
            });

            UnitScope.finalize(unit);
            UnitPromise.finalize(unit);

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

    static nest(unit: Unit, tag: string): UnitElement | null {
        const match = tag.match(/<((\w+)[^>]*?)\/?>/);
        if (match !== null) {
            let element: HTMLElement;
            unit._.nextNest.element.insertAdjacentHTML(unit._.nextNest.position, `<${match[1]}></${match[2]}>`);
            if (unit._.nextNest.position === 'beforebegin') {
                element = unit._.nextNest.element.previousElementSibling as HTMLElement;
            } else {
                element = unit.element.children[unit.element.children.length - 1] as HTMLElement;
            }
            unit._.nextNest.element = element;
            unit._.nextNest.position = 'beforeend';
            unit._.currentElement = element;
        }
        return unit.element;
    }

    static extend(unit: Unit, component: Function, props?: Object): void {
        unit._.components.add(component);
        Unit.componentUnits.add(component, unit);

        const defines = component(unit, props) ?? {};

        Object.keys(defines).forEach((key) => {
            if (unit[key as keyof Unit] !== undefined && unit._.defines[key] === undefined) {
                throw new Error(`The property "${key}" already exists.`);
            }
            const descriptor = Object.getOwnPropertyDescriptor(defines, key);
            const wrappedDesc: PropertyDescriptor = { configurable: true, enumerable: true };

            if (descriptor?.get) {
                wrappedDesc.get = UnitScope.wrap(descriptor.get);
            }
            if (descriptor?.set) {
                wrappedDesc.set = UnitScope.wrap(descriptor.set);
            }
            if (typeof descriptor?.value === 'function') {
                wrappedDesc.value = UnitScope.wrap(descriptor.value);
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
                UnitScope.execute(UnitScope.snapshot(unit), listener);
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
                UnitScope.execute(UnitScope.snapshot(unit), listener);
            });
        }
    }

    static update(unit: Unit, time: number): void {
        if (unit._.state === 'started') {
            unit._.children.forEach((child: Unit) => Unit.update(child, time));
            unit._.system.update.forEach((listener: Function) => {
                UnitScope.execute(UnitScope.snapshot(unit), listener);
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
    // component
    //----------------------------------------------------------------------------------------------------

    static componentUnits: MapSet<Function, Unit> = new MapSet();

    get components(): Set<Function> {
        return this._.components;
    }

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
                const execute = UnitScope.wrap(listener);
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
                const execute = UnitScope.wrap(listener);
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

//----------------------------------------------------------------------------------------------------
// unit scope
//----------------------------------------------------------------------------------------------------

export class UnitScope {
    static current: Unit | null = null;
    static contexts: Map<Unit | null, Context> = new Map();

    static initialize(unit: Unit | null, context: Context | null): void {
        if (context !== null) {
            UnitScope.contexts.set(unit, context);
        }
    }

    static finalize(unit: Unit): void {
        UnitScope.contexts.delete(unit);
    }

    static wrap(listener: Function): (...args: any[]) => any {
        const snapshot = UnitScope.snapshot();
        return (...args: any[]) => UnitScope.execute(snapshot, listener, ...args);
    }

    static execute(snapshot: Snapshot | null, func: Function, ...args: any[]): any {
        if (snapshot === null) return;
        const current = UnitScope.current;
        let context: Context | null = null;
        let element: UnitElement | null = null;

        try {
            UnitScope.current = snapshot.unit;
            if (snapshot.unit !== null) {
                if (snapshot.context !== null) {
                    context = UnitScope.contexts.get(snapshot.unit) ?? null;
                    UnitScope.contexts.set(snapshot.unit, snapshot.context);
                }
                if (snapshot.element !== null) {
                    element = snapshot.unit._.currentElement;
                    snapshot.unit._.currentElement = snapshot.element;
                }
            }
            return func(...args);
        } catch (error) {
            throw error;
        } finally {
            UnitScope.current = current;
            if (snapshot.unit !== null) {
                if (context !== null) {
                    UnitScope.contexts.set(snapshot.unit, context);
                }
                if (element !== null) {
                    snapshot.unit._.currentElement = element;
                }
            }
        }
    }

    static snapshot(unit: Unit | null = UnitScope.current): Snapshot | null {
        if (unit !== null) {
            return { unit, context: UnitScope.contexts.get(unit) ?? null, element: unit.element };
        }
        return null;
    }

    static stack(unit: Unit, key: string, value: any): void {
        UnitScope.contexts.set(unit, { stack: UnitScope.contexts.get(unit) ?? null, key, value });
    }

    static trace(unit: Unit, key: string): any {
        for (let context = UnitScope.contexts.get(unit) ?? null; context !== null; context = context.stack) {
            if (context.key === key) {
                return context.value;
            }
        }
    }
}

//----------------------------------------------------------------------------------------------------
// unit promise
//----------------------------------------------------------------------------------------------------

export class UnitPromise {
    private promise: Promise<any>;

    constructor(executor: (resolve: (value: any) => void, reject: (reason?: any) => void) => void) {
        this.promise = new Promise(executor);
    }

    then(callback: Function): UnitPromise {
        this.promise = this.promise.then(UnitScope.wrap(callback));
        return this;
    }

    catch(callback: Function): UnitPromise {
        this.promise = this.promise.catch(UnitScope.wrap(callback));
        return this;
    }

    finally(callback: Function): UnitPromise {
        this.promise = this.promise.finally(UnitScope.wrap(callback));
        return this;
    }

    static promises: MapSet<Unit, UnitPromise> = new MapSet();

    static get(unit: Unit) {
        return Promise.all([...(UnitPromise.promises.get(unit) ?? [])].map((unitPromise) => unitPromise.promise));
    }

    static finalize(unit: Unit) {
        UnitPromise.promises.delete(unit);
    }

    static execute(unit: Unit, promise?: Promise<any>): UnitPromise {
        const inner = promise ?? UnitPromise.get(unit);
        const unitPromise = new UnitPromise((resolve, reject) => {
            inner.then((...args) => resolve(...args)).catch((...args) => reject(...args));
        });
        if (promise !== undefined) {
            UnitPromise.promises.add(unit, unitPromise);
        }
        return unitPromise;
    }
}