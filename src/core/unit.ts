import { MapSet, MapMap, MapMapMap } from './map';
import { Ticker } from './time';

//----------------------------------------------------------------------------------------------------
// Constants
//----------------------------------------------------------------------------------------------------

const LIFECYCLE_EVENTS = ['start', 'update', 'stop', 'finalize'] as const;
type LifecycleEvent = typeof LIFECYCLE_EVENTS[number];

const LIFECYCLE_STATES = {
    INVOKED: 'invoked',
    INITIALIZED: 'initialized',
    STARTED: 'started',
    STOPPED: 'stopped',
    PRE_FINALIZED: 'pre finalized',
    FINALIZED: 'finalized',
} as const;

const CUSTOM_EVENT_PREFIX = {
    GLOBAL: '+',
    INTERNAL: '-',
} as const;

//----------------------------------------------------------------------------------------------------
// Interfaces
//----------------------------------------------------------------------------------------------------

interface UnitInternal {
    root: Unit;
    peers: Unit[];
    inputs: {
        parent: Unit | null;
        target: Object | null;
        component?: Function | string;
        props?: Object;
    };
    baseElement: HTMLElement | SVGElement;
    baseContext: Context | null;
    children: Unit[];
    state: string;
    tostart: boolean;
    currentElement: HTMLElement | SVGElement;
    upcount: number;
    resolved: boolean;
    defines: Record<string, any>;
    system: Record<LifecycleEvent, Function[]>;
}

interface Context {
    stack: Context | null;
    key: string;
    value: any;
}

interface Snapshot {
    unit: Unit | null;
    context: Context | null;
    element: HTMLElement | SVGElement | null;
}

//----------------------------------------------------------------------------------------------------
// unit main
//----------------------------------------------------------------------------------------------------

export class Unit {
    [key: string]: any;

    public _!: UnitInternal;

    static roots: Unit[] = [];

    constructor(parent: Unit | null, target: Object | null, component?: Function | string, props?: Object) {
        let baseElement: HTMLElement | SVGElement;
        if (target instanceof HTMLElement || target instanceof SVGElement) {
            baseElement = target;
        } else if (parent !== null) {
            baseElement = parent._.currentElement ?? parent._.baseElement;
        } else {
            baseElement = document.currentScript?.parentElement ?? document.body;
        }

        this._ = {
            root: parent?._.root ?? this,
            peers: parent?._.children ?? Unit.roots,
            inputs: { parent, target, component, props },
            baseElement,
            baseContext: UnitScope.get(parent),
        } as UnitInternal;

        this._.peers.push(this);
        Unit.initialize(this);
    }

    get element(): HTMLElement | SVGElement {
        return this._.currentElement;
    }

    start(): void {
        this._.tostart = true;
    }

    stop(): void {
        this._.tostart = false;
        Unit.stop(this);
    }

    get state(): string {
        return this._.state;
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

    on(type: string, listener: Function, options?: boolean | AddEventListenerOptions): Unit {
        try {
            if (typeof type === 'string') {
                const filtered = type.trim().split(/\s+/).filter((type) => LIFECYCLE_EVENTS.includes(type as LifecycleEvent));
                filtered.forEach((type) => {
                    this._.system[type as LifecycleEvent].push(listener);
                });
            }

            UnitEvent.on(this, type, listener, options);
        } catch (error) {
            console.error('unit.on(type, listener, option?): ', error);
        }
        return this;
    }

    off(type?: string, listener?: Function): Unit {
        try {
            if (type === undefined) {
                this._.system = { start: [], update: [], stop: [], finalize: [] };
            } else if (typeof type === 'string') {
                const filtered = type.trim().split(/\s+/).filter((type) => LIFECYCLE_EVENTS.includes(type as LifecycleEvent));
                filtered.forEach((type) => {
                    if (listener === undefined) {
                        this._.system[type as LifecycleEvent] = [];
                    } else {
                        this._.system[type as LifecycleEvent] = this._.system[type as LifecycleEvent].filter((l: Function) => l !== listener);
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
            children: [],
            state: LIFECYCLE_STATES.INVOKED,
            tostart: true,
            currentElement: unit._.baseElement,
            upcount: 0,
            resolved: false,
            defines: {},
            system: { start: [], update: [], stop: [], finalize: [] },
        });

        UnitScope.initialize(unit, unit._.baseContext);

        // nest html element
        if (typeof unit._.inputs.target === 'string') {
            Unit.nest(unit, unit._.inputs.target);
        }

        // setup component
        if (typeof unit._.inputs.component === 'function') {
            UnitScope.execute(
                { unit, context: null, element: null },
                () => Unit.extend(unit, unit._.inputs.component as Function, unit._.inputs.props)
            );
        } else if (typeof unit._.inputs.component === 'string') {
            unit.element.innerHTML = unit._.inputs.component;
        }

        // whether the unit promise was resolved
        UnitPromise.get(unit)?.then(() => {
            unit._.resolved = true;
        });
    }

    static finalize(unit: Unit): void {
        const { state } = unit._;
        if (state !== LIFECYCLE_STATES.FINALIZED && state !== LIFECYCLE_STATES.PRE_FINALIZED) {
            unit._.state = LIFECYCLE_STATES.PRE_FINALIZED;

            unit._.children.forEach((child: Unit) => child.finalize());
            unit._.system.finalize.forEach((listener: Function) => {
                UnitScope.execute(UnitScope.snapshot(unit), listener);
            });

            UnitEvent.off(unit);
            UnitSubEvent.off(unit, null);
            UnitScope.finalize(unit);
            UnitComponent.finalize(unit);
            UnitPromise.finalize(unit);

            while (unit._.currentElement !== unit._.baseElement && unit._.currentElement.parentElement !== null) {
                const parent = unit._.currentElement.parentElement;
                parent.removeChild(unit._.currentElement);
                unit._.currentElement = parent;
            }

            // reset defines
            Object.keys(unit._.defines).forEach((key) => {
                if (!LIFECYCLE_EVENTS.includes(key as LifecycleEvent)) {
                    delete unit[key as keyof Unit];
                }
            });
            unit._.defines = {};
            unit._.state = LIFECYCLE_STATES.FINALIZED;
        }
    }

    static nest(unit: Unit, html: string, innerHTML?: string): HTMLElement | SVGElement | null {
        const match = html.match(/<((\w+)[^>]*?)\/?>/);
        if (match !== null) {
            unit.element.insertAdjacentHTML('beforeend', `<${match[1]}></${match[2]}>`);
            unit._.currentElement = unit.element.children[unit.element.children.length - 1] as HTMLElement | SVGElement;
            if (typeof innerHTML === 'string') {
                unit.element.innerHTML = innerHTML;
            }
        }
        return unit.element;
    }

    static extend(unit: Unit, component: Function, props?: Object): void {
        UnitComponent.add(unit, component);

        const defines = component(unit, props) ?? {};
        const snapshot = UnitScope.snapshot(unit);

        Object.keys(defines).forEach((key) => {
            const descriptor = Object.getOwnPropertyDescriptor(defines, key);

            if (unit[key as keyof Unit] !== undefined && unit._.defines[key] === undefined) {
                throw new Error(`The property "${key}" already exists.`);
            }

            const newDescriptor: PropertyDescriptor = { configurable: true, enumerable: true };

            if (descriptor?.get) {
                newDescriptor.get = (...args: any[]) => UnitScope.execute(snapshot, descriptor.get!, ...args);
            } else if (descriptor?.set) {
                newDescriptor.set = (...args: any[]) => UnitScope.execute(snapshot, descriptor.set!, ...args);
            } else if (typeof descriptor?.value === 'function') {
                newDescriptor.value = (...args: any[]) => UnitScope.execute(snapshot, descriptor.value, ...args);
            } else if (descriptor?.value !== undefined) {
                newDescriptor.writable = true;
                newDescriptor.value = descriptor.value;
            }

            Object.defineProperty(unit._.defines, key, newDescriptor);
            Object.defineProperty(unit, key, newDescriptor);
        });
    }

    static start(unit: Unit, time: number): void {
        if (!unit._.resolved || !unit._.tostart) return;

        const { state } = unit._;
        if (state === LIFECYCLE_STATES.INVOKED || state === LIFECYCLE_STATES.INITIALIZED || state === LIFECYCLE_STATES.STOPPED) {
            unit._.state = LIFECYCLE_STATES.STARTED;
            unit._.children.forEach((child: Unit) => Unit.start(child, time));
            unit._.system.start.forEach((listener: Function) => {
                UnitScope.execute(UnitScope.snapshot(unit), listener);
            });
        } else if (state === LIFECYCLE_STATES.STARTED) {
            unit._.children.forEach((child: Unit) => Unit.start(child, time));
        }
    }

    static stop(unit: Unit): void {
        if (unit._.state === LIFECYCLE_STATES.STARTED) {
            unit._.state = LIFECYCLE_STATES.STOPPED;
            unit._.children.forEach((child: Unit) => Unit.stop(child));
            unit._.system.stop.forEach((listener: Function) => {
                UnitScope.execute(UnitScope.snapshot(unit), listener);
            });
        }
    }

    static update(unit: Unit, time: number): void {
        if (unit._.state === LIFECYCLE_STATES.STARTED) {
            unit._.children.forEach((child: Unit) => Unit.update(child, time));

            if (unit._.state === LIFECYCLE_STATES.STARTED) {
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
        Ticker.clear(Unit.ticker);
        Ticker.set(Unit.ticker);
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

    static set(unit: Unit, context: Context): void {
        UnitScope.contexts.set(unit, context);
    }

    static get(unit: Unit | null): Context | null {
        return UnitScope.contexts.get(unit) ?? null;
    }

    static execute(snapshot: Snapshot | null, func: Function, ...args: any[]): any {
        if (!snapshot) return;

        const current = UnitScope.current;
        let context: Context | null = null;
        let element: HTMLElement | SVGElement | null = null;

        try {
            UnitScope.current = snapshot.unit;

            if (snapshot.unit !== null) {
                if (snapshot.context !== null) {
                    context = UnitScope.get(snapshot.unit);
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
            return { unit, context: UnitScope.get(unit), element: unit.element };
        }
        return null;
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
    static units: MapSet<string, Unit> = new MapSet;
    static listeners: MapMapMap<Unit, string, Function, [HTMLElement | SVGElement, (...args: any[]) => void]> =
        new MapMapMap;

    static on(unit: Unit, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        if (typeof type !== 'string' || type.trim() === '') {
            throw new Error('"type" is invalid.');
        } else if (typeof listener !== 'function') {
            throw new Error('"listener" is invalid.');
        }

        const snapshot = UnitScope.snapshot();
        const types = type.trim().split(/\s+/);
        types.forEach((type) => {
            if (!UnitEvent.listeners.has(unit, type, listener)) {
                const execute = (...args: any[]) => {
                    UnitScope.execute(snapshot, listener, ...args);
                };
                UnitEvent.listeners.set(unit, type, listener, [unit.element, execute]);
                UnitEvent.units.add(type, unit);
                if (/^[A-Za-z]/.test(type)) {
                    unit.element.addEventListener(type, execute, options);
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
                const tuple = UnitEvent.listeners.get(unit, type, lis);
                if (tuple !== undefined) {
                    const [target, execute] = tuple;
                    UnitEvent.listeners.delete(unit, type, lis);
                    if (/^[A-Za-z]/.test(type)) {
                        target.removeEventListener(type, execute);
                    }
                }
            });
            if (!UnitEvent.listeners.has(unit, type)) {
                UnitEvent.units.delete(type, unit);
            }
        });
    }

    static emit(type: string, ...args: any[]): void {
        const unit = UnitScope.current;
        if (typeof type !== 'string') {
            throw new Error('The argument [type] is invalid.');
        } else if (unit?._.state === LIFECYCLE_STATES.FINALIZED) {
            throw new Error('This function can not be called after finalized.');
        }
        if (type[0] === CUSTOM_EVENT_PREFIX.GLOBAL) {
            UnitEvent.units.get(type)?.forEach((unit) => {
                UnitEvent.listeners.get(unit, type)?.forEach(([_, execute]) => execute(...args));
            });
        } else if (type[0] === CUSTOM_EVENT_PREFIX.INTERNAL && unit !== null) {
            UnitEvent.listeners.get(unit, type)?.forEach(([_, execute]) => execute(...args));
        }
    }
}
export class UnitSubEvent {
    static listeners: MapMapMap<Unit | null, string, Function, [Window | Document, (...args: any[]) => void]> =
        new MapMapMap;

    static on(unit: Unit | null, target: Window | Document, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        if (typeof type !== 'string' || type.trim() === '') {
            throw new Error('"type" is invalid.');
        } else if (typeof listener !== 'function') {
            throw new Error('"listener" is invalid.');
        }

        const snapshot = UnitScope.snapshot();
        const types = type.trim().split(/\s+/);
        types.forEach((type) => {
            if (!UnitSubEvent.listeners.has(unit, type, listener)) {
                const execute = (...args: any[]) => {
                    UnitScope.execute(snapshot, listener, ...args);
                };
                UnitSubEvent.listeners.set(unit, type, listener, [target, execute]);
                target.addEventListener(type, execute, options);
            }
        });
    }

    static off(unit: Unit | null, target: Window | Document | null, type?: string, listener?: Function): void {
        if (typeof type === 'string' && type.trim() === '') {
            throw new Error('"type" is invalid.');
        } else if (listener !== undefined && typeof listener !== 'function') {
            throw new Error('"listener" is invalid.');
        }

        const types = typeof type === 'string' ? type.trim().split(/\s+/) : [...UnitSubEvent.listeners.keys(unit)];
        types.forEach((type) => {
            const listeners = listener ? [listener] : [...UnitSubEvent.listeners.keys(unit, type)];
            listeners.forEach((lis) => {
                const tuple = UnitSubEvent.listeners.get(unit, type, lis);
                if (tuple !== undefined) {
                    const [element, execute] = tuple;
                    if (target === null || target === element) {
                        UnitSubEvent.listeners.delete(unit, type, lis);
                        element.removeEventListener(type, execute);
                    }
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
        UnitPromise.promises.delete(unit);
    }

    static execute(
        unit: Unit | null,
        mix: Promise<any> | ((resolve: (value: any) => void, reject: (reason?: any) => void) => void) | Unit
    ): UnitPromise {
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
