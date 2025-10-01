import { MapSet, MapMap, MapMapMap } from './map';
import { Ticker } from './time';

//----------------------------------------------------------------------------------------------------
// unit main
//----------------------------------------------------------------------------------------------------

export class Unit {
    [key: string]: any;
    
    public _: { [key: string]: any } = {};

    static roots: Unit[] = [];

    constructor(parent: Unit | null, target: Object | null, component?: Function | string, ...args: any[]) {
        let baseTarget: Element | Window | null = null;
        if (target instanceof Element || target instanceof Window) {
            baseTarget = target;
        } else if (parent !== null) {
            baseTarget = parent.element;
        } else if (document instanceof Document) {
            baseTarget = document.currentScript?.parentElement ?? document.body;
        }

        this._ = {
            root: parent?._.root ?? this,
            peers: parent?._.children ?? Unit.roots,
            inputs: { parent, target, component, args }, 
            baseTarget,
            baseContext: UnitScope.get(parent),
        };

        this._.peers.push(this);
        Unit.initialize(this);
    }

    get element(): Element | null {
        if (this._.baseTarget instanceof Element) {
            return this._.nestedElements.length > 0 ? this._.nestedElements[this._.nestedElements.length - 1] : this._.baseTarget;
        } else {
            return null;
        }
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
        this._.peers = this._.peers.filter((unit: Unit) => unit !== this);
    }

    reboot(): void {
        Unit.stop(this);
        Unit.finalize(this);
        Unit.initialize(this);
    }

    on(type: string, listener: EventListener, options?: boolean | AddEventListenerOptions): Unit {
        try {
            if (typeof type === 'string') {
                const list = ['start', 'update', 'stop', 'finalize'];
                const filtered = type.trim().split(/\s+/).filter((type) => list.includes(type));
                filtered.forEach((type) => {
                    this._.system[type].push(listener);
                });
            }

            UnitEvent.on(this, type, listener, options);
        } catch (error) {
            console.error('unit.on(type, listener, option?): ', error);
        }
        return this;
    }

    off(type?: string, listener?: EventListener): Unit {
        try {
            if (typeof type == undefined) {
                this._.system = { start: [], update: [], stop: [], finalize: [] };
            } else if (typeof type === 'string') {
                const list = ['start', 'update', 'stop', 'finalize'];
                const filtered = type.trim().split(/\s+/).filter((type) => list.includes(type));
                filtered.forEach((type) => {
                    if (listener === undefined) {
                        this._.system[type] = [];
                    } else {
                        this._.system[type] = this._.system[type].filter((l: EventListener) => l !== listener);
                    }
                });
            }

            UnitEvent.off(this, type, listener);
        } catch (error) {
            console.error('unit.off(type, listener): ', error);
        }
        return this;
    }

    
    //----------------------------------------------------------------------------------------------------
    // internal
    //----------------------------------------------------------------------------------------------------

    static initialize(unit: Unit): void {
        unit._ = Object.assign(unit._, {
            children: [],       // children units
            state: 'pending',   // [pending -> running <-> stopped -> finalized]
            tostart: true,      // flag for start
            nestedElements: [], // nested html elements
            upcount: 0,         // update count    
            resolved: false,    // promise check
            props: {},          // properties in the component function
            system: {},         // system properties
        });
        
        unit._.system = { start: [], update: [], stop: [], finalize: [] };

        UnitScope.initialize(unit, unit._.baseContext);

        // nest html element
        if (unit.element instanceof Element && typeof unit._.inputs.target === 'string') {
            Unit.nest(unit, unit._.inputs.target);
        }

        // setup component
        if (typeof unit._.inputs.component === 'function') {
            UnitScope.execute({ unit, context: null }, () => Unit.extend(unit, unit._.inputs.component, ...unit._.inputs.args));
        } else if (unit.element instanceof Element && typeof unit._.inputs.component === 'string') {
            unit.element.innerHTML = unit._.inputs.component;
        }

        // whether the unit promise was resolved
        UnitPromise.get(unit)?.then(() => { unit._.resolved = true; });
    }

    static finalize(unit: Unit): void {
        if (unit._.state !== 'finalized' || unit._.state !== 'pre finalized') {
            unit._.state = 'pre finalized';

            unit._.children.forEach((unit: Unit) => unit.finalize());
            unit._.system.finalize.forEach((listener: Function) => {
                UnitScope.execute(UnitScope.snapshot(unit), listener);
            });

            UnitEvent.off(unit);
            UnitScope.finalize(unit);
            UnitComponent.finalize(unit);
            UnitPromise.finalize(unit);

            if (unit._.nestedElements.length > 0) {
                unit._.baseTarget?.removeChild(unit._.nestedElements[0]);
                unit._.nestedElements = [];
            }

            // reset props
            Object.keys(unit._.props).forEach((key) => {
                if (['start', 'update', 'stop', 'finalize'].includes(key) === false) {
                    delete unit[key as keyof Unit];
                }
            });
            unit._.props = {};
            unit._.state = 'finalized';
        }
    }

    static nest(unit: Unit, html: string) : Element | null {
        const match = html.match(/<((\w+)[^>]*?)\/?>/);
        const element = unit.element;
        if (element && match !== null) {
            element.insertAdjacentHTML('beforeend', `<${match[1]}></${match[2]}>`);
            unit._.nestedElements.push(element.children[element.children.length - 1]);
        }
        return unit.element;
    }

    static extend(unit: Unit, component: Function, ...args: any[]): void {
        UnitComponent.add(unit, component);

        const props = component(unit, ...args) ?? {};
        const snapshot = UnitScope.snapshot(unit);

        Object.keys(props).forEach((key) => {
            const descripter = Object.getOwnPropertyDescriptor(props, key);
            if (unit[key as keyof Unit] === undefined) {
                const descriptor: PropertyDescriptor = { configurable: true, enumerable: true };
                if (typeof descripter?.get === 'function') {
                    descriptor.get = (...args: any[]) => UnitScope.execute(snapshot, descripter.get!, ...args);
                } else if (typeof descripter?.set === 'function') {
                    descriptor.set = (...args: any[]) => UnitScope.execute(snapshot, descripter.set!, ...args);
                } else if (typeof descripter?.value === 'function') {
                    descriptor.value = (...args: any[]) => UnitScope.execute(snapshot, descripter.value!, ...args);
                } else if (descripter?.value !== undefined) {
                    descriptor.writable = true;
                    descriptor.value = descripter.value;
                }
                Object.defineProperty(unit._.props, key, descriptor);
                Object.defineProperty(unit, key, descriptor);
            } else {
                throw new Error(`The property "${key}" already exists.`);
            }
        });
    }

    static start(unit: Unit, time: number): void {
        if (unit._.resolved === false || unit._.tostart === false) return;
        if (unit._.state === 'pending' || unit._.state === 'stopped') {
            unit._.state = 'running';
            unit._.children.forEach((child: Unit) => Unit.start(child, time));
            unit._.system.start.forEach((listener: Function) => {
                UnitScope.execute(UnitScope.snapshot(unit), listener);
            });
        } else if (unit._.state === 'running') {
            unit._.children.forEach((child: Unit) => Unit.start(child, time));
        }
    }

    static stop(unit: Unit): void {
        if (unit._.state === 'running') {
            unit._.state = 'stopped';
            unit._.children.forEach((child: Unit) => Unit.stop(child));
            unit._.system.stop.forEach((listener: Function) => {
                UnitScope.execute(UnitScope.snapshot(unit), listener);
            });
        }
    }

    static update(unit: Unit, time: number): void {
        if (['running'].includes(unit._.state) === true) {
            unit._.children.forEach((unit: Unit) => Unit.update(unit, time));

            if (['running'].includes(unit._.state)) {
                unit._.system.update.forEach((listener: Function) => {
                    UnitScope.execute(UnitScope.snapshot(unit), listener, unit._.upcount);
                });
                unit._.upcount++;
            }
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
        Ticker.clear(Unit.ticker)
        Ticker.set(Unit.ticker)
    }
}

Unit.reset();

//----------------------------------------------------------------------------------------------------
// unit scope
//----------------------------------------------------------------------------------------------------

interface Context { stack: Context | null; key: string; value: any; }
interface Snapshot { unit: Unit | null; context: Context  | null; }

export class UnitScope {
    static current: Unit | null = null;
    static contexts: Map<Unit | null, Context > = new Map();
   
    static initialize(unit: Unit | null, context: Context): void {
        UnitScope.contexts.set(unit, context);
    }

    static finalize(unit: Unit): void {
        UnitScope.contexts.delete(unit);
    }

    static set(unit: Unit, context: Context): void {
        UnitScope.contexts.set(unit, context);
    }

    static get(unit: Unit | null): Context | null {
        return UnitScope.contexts.get(unit) ?? null;
    }

    static execute(snapshot: Snapshot, func: Function, ...args: any[]): any {
        const current = UnitScope.current;
        let context: Context | null = null;

        try {
            UnitScope.current = snapshot.unit;

            if (snapshot.unit !== null && snapshot.context !== null) {
                context = UnitScope.get(snapshot.unit);
                UnitScope.contexts.set(snapshot.unit, snapshot.context);
            }
            return func(...args);
        } catch (error) {
            throw error;
        } finally {
            UnitScope.current = current;
            if (snapshot.unit !== null && snapshot.context !== null && context !== null) {
                UnitScope.contexts.set(snapshot.unit, context);
            }
        }
    }

    static snapshot(unit: Unit | null = UnitScope.current): Snapshot {
        return { unit, context: UnitScope.get(unit) };
    }

    static stack(unit: Unit, key: string, value: any): void {
        UnitScope.contexts.set(unit, { stack: UnitScope.get(unit), key, value });
    }

    static trace(unit: Unit, key: string): any {
        for (let context = UnitScope.get(unit); context !== null; context = context.stack) {
            if (context.key === key) {
                return context.value;
            }
        }
    }
}

//----------------------------------------------------------------------------------------------------
// unit component
//----------------------------------------------------------------------------------------------------

export class UnitComponent {
    static components: MapSet<Unit, Function> = new MapSet();
    static units: MapSet<Function, Unit> = new MapSet();
  
    static finalize(unit: Unit): void {
        UnitComponent.components.get(unit)?.forEach((component) => {
            UnitComponent.units.delete(component, unit);
        });
        UnitComponent.components.delete(unit);
    }

    static add(unit: Unit, component: Function): void {
        UnitComponent.components.add(unit, component);
        UnitComponent.units.add(component, unit);
    }
    
    static find(component: Function): Unit[] {
        return [...(UnitComponent.units.get(component) ?? [])];
    }
}

//----------------------------------------------------------------------------------------------------
// unit event
//----------------------------------------------------------------------------------------------------

export class UnitEvent {
    static units: MapSet<string, Unit> = new MapSet();
    static listeners: MapMapMap<Unit, string, Function, [Element | Window | Document | null, (...args: any[]) => void]> = new MapMapMap();

    static on(unit: Unit, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        if (typeof type !== 'string' || (typeof type === 'string' && type.trim() === '')) {
            throw new Error('"type" is invalid.');
        } else if (typeof listener !== 'function') {
            throw new Error('"listener" is invalid.');
        }
        
        const snapshot = UnitScope.snapshot();
        let target: Element | Window | Document | null = null;
        if (unit.element instanceof Element) {
            target = unit.element;
        } else if (unit._.baseTarget instanceof Window || unit._.baseTarget instanceof Document) {
            target = unit._.baseTarget;
        }

        const types = type.trim().split(/\s+/);
        types.forEach((type) => {
            if (UnitEvent.listeners.has(unit, type, listener) === false) {
                const execute = (...args: any[]) => {
                    UnitScope.execute(snapshot, listener, ...args);
                };
                UnitEvent.listeners.set(unit, type, listener, [target, execute]);
                UnitEvent.units.add(type, unit);
                if (/^[A-Za-z]/.test(type[0])) {
                    target?.addEventListener(type, execute, options);
                }
            }
        });
    }

    static off(unit: Unit, type?: string, listener?: Function): void {
        if (typeof type === 'string' && type.trim() === '') {
            throw new Error('"type" is invalid.');
        } else if (listener !== undefined && typeof listener !== 'function') {
            throw new Error('"listener" is invalid.');
        }

        const types = typeof type === 'string' ? type.trim().split(/\s+/) : [...UnitEvent.listeners.keys(unit)];
        types.forEach((type) => {
            const listeners = listener ? [listener] : [...UnitEvent.listeners.keys(unit, type)];
            listeners.forEach((lis) => {
                const tupple = UnitEvent.listeners.get(unit, type, lis);
                if (tupple !== undefined) {
                    const [target, execute] = tupple;
                    UnitEvent.listeners.delete(unit, type, lis);
                    if (target instanceof Element || target instanceof Window || target instanceof Document) {
                        target.removeEventListener(type, execute);
                    }
                }
            });
            if (UnitEvent.listeners.has(unit, type) === false) {
                UnitEvent.units.delete(type, unit);
            }
        });
    }

    static emit(type: string, ...args: any[]): void {
        const unit = UnitScope.current;
        if (typeof type !== 'string') {
            throw new Error('The argument [type] is invalid.');
        } else if (unit?._.state === 'finalized') {
            throw new Error('This function can not be called after finalized.');
        }
        if (type[0] === '+') {
            UnitEvent.units.get(type)?.forEach((unit) => {
                UnitEvent.listeners.get(unit, type)?.forEach(([_, execute]) => execute(...args));
            });
        } else if (type[0] === '-' && unit !== null) {
            UnitEvent.listeners.get(unit, type)?.forEach(([_, execute]) => execute(...args));
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
        const snapshot = UnitScope.snapshot();
        this.promise.then((...args) => UnitScope.execute(snapshot, callback, ...args));
        return this;
    }

    catch(callback: Function): UnitPromise {
        const snapshot = UnitScope.snapshot();
        this.promise.catch((...args) => UnitScope.execute(snapshot, callback, ...args));
        return this;
    }

    finally(callback: Function): UnitPromise {
        const snapshot = UnitScope.snapshot();
        this.promise.finally((...args) => UnitScope.execute(snapshot, callback, ...args));
        return this;
    }

    static promises: MapSet<Unit, Promise<any>> = new MapSet();
   
    static get(unit: Unit) {
        return Promise.all([...(UnitPromise.promises.get(unit) ?? [])]);
    }

    static finalize(unit: Unit) {
        UnitPromise.promises.delete(unit)
    }

    static execute(unit: Unit | null, mix: Promise<any> | ((resolve: (value: any) => void, reject: (reason?: any) => void) => void) | Unit): UnitPromise {
        let promise: Promise<any> | null = null;
        if (mix instanceof Promise) {
            promise = mix;
        } else if (typeof mix === 'function') {
            promise = new Promise(mix);
        } else if (mix instanceof Unit) {
            promise = UnitPromise.get(mix);
        } else {
            throw new Error('"mix" is invalid.');
        }
        if (unit !== null && unit !== mix) {
            UnitPromise.promises.add(unit, promise);
        }
        return new UnitPromise((resolve, reject) => {
            promise.then((...args) => resolve(...args)).catch((...args) => reject(...args));
        });
    }
}
