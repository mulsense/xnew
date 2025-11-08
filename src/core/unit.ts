import { MapSet, MapMap } from './map';
import { Ticker } from './time';

//----------------------------------------------------------------------------------------------------
// defines
//----------------------------------------------------------------------------------------------------

const SYSTEM_EVENTS: string[] = ['start', 'update', 'stop', 'finalize'] as const;

export type UnitElement = HTMLElement | SVGElement;

interface Context { stack: Context | null; key?: string; value?: any; }
interface Snapshot { unit: Unit; context: Context; element: UnitElement; }
interface Capture { checker: (unit: Unit) => boolean; execute: (unit: Unit) => any; }

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
    captures: Capture[];
    elements: UnitElement[];
    components: Function[];
    listeners1: MapMap<string, Function, [UnitElement, Function]>;
    listeners2: MapMap<string, Function, [UnitElement | Window | Document, Function]>;
    defines: Record<string, any>;
    systems: Record<string, Function[]>;
}

export class UnitPromise {
    private promise: Promise<any>;
    constructor(promise: Promise<any>) {
        this.promise = promise;
    }
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
// Unit
//----------------------------------------------------------------------------------------------------

export class Unit {
    [key: string]: any;

    public _!: UnitInternal;

    static current: Unit;

    constructor(parent: Unit | null, target: Object | null, component?: Function | string, props?: Object) {
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
            baseComponent = (self: Unit) => { self.element.textContent = component; };
        } else {
            baseComponent = (self: Unit) => {};
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
        Unit.stop(this);
        const anchorElement = (this._.elements[0]?.nextElementSibling as UnitElement) ?? null;
        Unit.finalize(this);
        Unit.initialize(this, anchorElement);
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
            captures: [],
            components: [],
            listeners1: new MapMap<string, Function, [UnitElement, Function]>(),
            listeners2: new MapMap<string, Function, [UnitElement | Window | Document, Function]>(),
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

        // setup capture
        let captured = false;
        for (let current: Unit | null = unit; current !== null && captured === false; current = current._.parent) {
            for (const capture of current._.captures) {
                if (capture.checker(unit)) {
                    capture.execute(unit);
                    captured = true;
                }
            }
        }
        Unit.current = backup;
    }

    static finalize(unit: Unit): void {
        if (unit._.state !== 'finalized' && unit._.state !== 'pre-finalized') {
            unit._.state = 'pre-finalized';

            unit._.children.forEach((child: Unit) => child.finalize());
            unit._.systems.finalize.forEach((listener: Function) => Unit.scope(Unit.snapshot(unit), listener));

            unit.off();
            Unit.suboff(unit, null);
            unit._.components.forEach((component) => {
                Unit.componentUnits.delete(component, unit);
            });

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
            unit._.state = 'finalized';
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
                wrappedDesc.get = Unit.wrap(unit, descriptor.get);
            }
            if (descriptor?.set) {
                wrappedDesc.set = Unit.wrap(unit, descriptor.set);
            }
            if (typeof descriptor?.value === 'function') {
                wrappedDesc.value = Unit.wrap(unit, descriptor.value);
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
            unit._.systems.start.forEach((listener: Function) => Unit.scope(Unit.snapshot(unit), listener));
        } else if (unit._.state === 'started') {
            unit._.children.forEach((child: Unit) => Unit.start(child, time));
        }
    }

    static stop(unit: Unit): void {
        if (unit._.state === 'started') {
            unit._.state = 'stopped';
            unit._.children.forEach((child: Unit) => Unit.stop(child));
            unit._.systems.stop.forEach((listener: Function) => Unit.scope(Unit.snapshot(unit), listener));
        }
    }

    static update(unit: Unit, time: number): void {
        if (unit._.state === 'started') {
            unit._.children.forEach((child: Unit) => Unit.update(child, time));
            unit._.systems.update.forEach((listener: Function) => Unit.scope(Unit.snapshot(unit), listener));
        }
    }

    static root: Unit | null = null;
   
    static ticker(time: number) {
        if (Unit.root !== null) {
            Unit.start(Unit.root, time);
            Unit.update(Unit.root, time);
        }
    }

    static reset(): void {
        Unit.root?.finalize();
        Unit.root = new Unit(null, null);
        Unit.current = Unit.root;
        Ticker.clear(Unit.ticker);
        Ticker.set(Unit.ticker);
    }

    //----------------------------------------------------------------------------------------------------
    // scope
    //----------------------------------------------------------------------------------------------------

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

    static stack(unit: Unit, key: string, value: any): void {
        unit._.currentContext = { stack: unit._.currentContext, key, value };
    }

    static trace(unit: Unit, key: string): any {
        for (let context: Context | null = unit._.currentContext; context !== null; context = context.stack) {
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
                this._.systems[type].push(listener);
            }
            if (this._.listeners1.has(type, listener) === false) {
                const execute = Unit.wrap(Unit.current, listener);
                this._.listeners1.set(type, listener, [this.element, execute]);
                Unit.typeUnits.add(type, this);
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
            (listener ? [listener] : [...this._.listeners1.keys(type)]).forEach((lis) => {
                const tuple = this._.listeners1.get(type, lis);
                if (tuple !== undefined) {
                    const [target, execute] = tuple;
                    this._.listeners1.delete(type, lis);
                    if (/^[A-Za-z]/.test(type)) {
                        target.removeEventListener(type, execute as EventListener);
                    }
                }
            });
            if (this._.listeners1.has(type) === false) {
                Unit.typeUnits.delete(type, this);
            }
        });
    }

    emit(type: string, ...args: any[]) {
        if (this._.state === 'finalized') return;
        if (type[0] === '+') {
            Unit.typeUnits.get(type)?.forEach((unit) => {
                unit._.listeners1.get(type)?.forEach(([_, execute]) => execute(...args));
            });
        } else if (type[0] === '-') {
            this._.listeners1.get(type)?.forEach(([_, execute]) => execute(...args));
        }
    }

    static subon(unit: Unit, target: UnitElement | Window | Document, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        type.trim().split(/\s+/).forEach((type) => {
            if (unit._.listeners2.has(type, listener) === false) {
                const execute = Unit.wrap(unit, listener);
                unit._.listeners2.set(type, listener, [target, execute]);
                target.addEventListener(type, execute, options);
            }
        });
    }

    static suboff(unit: Unit, target: UnitElement | Window | Document | null, type?: string, listener?: Function): void {
        const types = typeof type === 'string' ? type.trim().split(/\s+/) : [...unit._.listeners2.keys()];
        types.forEach((type) => {
            (listener ? [listener] : [...unit._.listeners2.keys(type)]).forEach((lis) => {
                const tuple = unit._.listeners2.get(type, lis);
                if (tuple !== undefined) {
                    const [element, execute] = tuple;
                    if (target === null || target === element) {
                        unit._.listeners2.delete(type, lis);
                        element.removeEventListener(type, execute as EventListener);
                    }
                }
            });
        });
    }
}

