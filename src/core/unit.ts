import { MapSet, MapMap } from './map';
import { Ticker, Timer, TimerOptions } from './time';

//----------------------------------------------------------------------------------------------------
// utils
//----------------------------------------------------------------------------------------------------

const SYSTEM_EVENTS: string[] = ['start', 'process', 'update', 'stop', 'finalize'] as const;

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
    currentComponent: Function | null;

    anchor: UnitElement | null;
    state: string;
    tostart: boolean;
    protected: boolean;

    ancestors: Unit[];
    children: Unit[];
    promises: UnitPromise[];
    elements: UnitElement[];
    components: Function[];
    listeners: MapMap<string, Function, { element: UnitElement, execute: Function }>;
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

    static initialize(unit: Unit, anchor: UnitElement | null): void {
        const backup = Unit.current;
        Unit.current = unit;
        unit._ = Object.assign(unit._, {
            currentElement: unit._.baseElement,
            currentContext: unit._.baseContext,
            currentComponent: null,
            anchor,
            state: 'invoked',
            tostart: true,
            protected: false,
            ancestors: [...(unit._.parent ? [unit._.parent] : []), ...(unit._.parent?._.ancestors ?? [])],
            children: [],
            elements: [],
            promises: [],
            components: [],
            listeners: new MapMap(),
            defines: {},
            systems: { start: [], process: [], update: [], stop: [], finalize: [] },
        });

        // nest html element
        if (typeof unit._.target === 'string') {
            Unit.nest(unit, unit._.target); 
        }

        // setup component
        Unit.extend(unit, unit._.baseComponent, unit._.props); 

        // whether the unit promise was resolved
        Promise.all(unit._.promises.map(p => p.promise)).then(() => unit._.state = 'initialized');

        Unit.current = backup;
    }

    static finalize(unit: Unit): void {
        if (unit._.state !== 'finalized' && unit._.state !== 'finalizing') {
            unit._.state = 'finalizing';

            unit._.children.forEach((child: Unit) => child.finalize());
            unit._.systems.finalize.forEach((listener: Function) => Unit.scope(Unit.snapshot(unit), listener));

            unit.off();
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
            unit._.state = 'finalized';
        }
    }

    static nest(unit: Unit, tag: string): UnitElement {
        if (unit._.state !== 'invoked') {
            throw new Error('This function can not be called after initialized.');
        } 

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
        if (unit._.state !== 'invoked') {
            throw new Error('This function can not be called after initialized.');
        } 
        
        unit._.components.push(component);
        Unit.component2units.add(component, unit);

        const backupComponent = unit._.currentComponent;
        unit._.currentComponent = component;
        const defines = component(unit, props) ?? {};
        unit._.currentComponent = backupComponent;

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

    static process(unit: Unit): void {
        if (unit._.state === 'started') {
            unit._.children.forEach((child: Unit) => Unit.process(child));
            unit._.systems.process.forEach((listener: Function) => Unit.scope(Unit.snapshot(unit), listener));
        }
    }

    static root: Unit;
    static current: Unit;
    static ticker: Ticker;

    static reset(): void {
        Unit.root?.finalize();
        Unit.current = Unit.root = new Unit(null, null);
        Unit.ticker?.clear();
        Unit.ticker = new Ticker(() => {
            Unit.start(Unit.root);
            Unit.process(Unit.root);
            Unit.update(Unit.root);
        });
    }

    static wrap(unit: Unit, listener: Function): (...args: any[]) => any {
        const snapshot = Unit.snapshot(unit);
        return (...args: any[]) => Unit.scope(snapshot, listener, ...args);
    }

    static scope(snapshot: Snapshot, func: Function, ...args: any[]): any {
        if (snapshot.unit._.state === 'finalized') {
            return;
        } 
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
            if (this._.listeners.has(type, listener) === false) {
                const execute = Unit.wrap(Unit.current, listener);
                this._.listeners.set(type, listener, { element: this.element, execute });
                Unit.type2units.add(type, this);
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
                this._.systems[type] = this._.systems[type].filter((lis: Function) => listener ? lis !== listener : false);
            }
            (listener ? [listener] : [...this._.listeners.keys(type)]).forEach((listener) => {
                const item = this._.listeners.get(type, listener);
                if (item !== undefined) {
                    this._.listeners.delete(type, listener);
                    if (/^[A-Za-z]/.test(type)) {
                        item.element.removeEventListener(type, item.execute as EventListener);
                    }
                }
            });
            if (this._.listeners.has(type) === false) {
                Unit.type2units.delete(type, this);
            }
        });
    }

    static emit(type: string, ...args: any[]) {
        const current = Unit.current;
        if (type[0] === '+') {
            Unit.type2units.get(type)?.forEach((unit) => {
                const find = [unit, ...unit._.ancestors].find(u => u._.protected === true);
                if (find === undefined || current._.ancestors.includes(find) === true || current === find) {
                    unit._.listeners.get(type)?.forEach((item) => item.execute(...args));
                }
            });
        } else if (type[0] === '-') {
            current._.listeners.get(type)?.forEach((item) => item.execute(...args));
        }
    }
}

//----------------------------------------------------------------------------------------------------
// unit promise
//----------------------------------------------------------------------------------------------------

export class UnitPromise {
    public promise: Promise<any>;
    public component: Function | null;
    constructor(promise: Promise<any>, component: Function | null) {
        this.promise = promise;
        this.component = component;
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
// unit timer
//----------------------------------------------------------------------------------------------------

export class UnitTimer {
    private unit: Unit;
    private stack: Object[] = [];

    constructor(options: TimerOptions) {
        this.unit = new Unit(Unit.current, UnitTimer.Component, { snapshot: Unit.snapshot(Unit.current), ...options });
    }

    clear() {
        this.stack = [];
        this.unit.finalize();
    }

    timeout(timeout: Function, duration: number = 0) {
        UnitTimer.execute(this, { timeout, duration, iterations: 1 })
        return this;
    }

    iteration(timeout: Function, duration: number = 0, iterations: number = -1) {
        UnitTimer.execute(this, { timeout, duration, iterations })
        return this;
    }

    transition(transition: Function, duration: number = 0, easing?: string) {
        UnitTimer.execute(this, { transition, duration, iterations: 1, easing })
        return this;
    }

    static execute(timer: UnitTimer, options: TimerOptions) {
        if (timer.unit._.state === 'finalized') {
            timer.unit = new Unit(Unit.current, UnitTimer.Component, { snapshot: Unit.snapshot(Unit.current), ...options });
        } else if (timer.stack.length === 0) {
            timer.stack.push({ snapshot: Unit.snapshot(Unit.current), ...options });
            timer.unit.on('finalize', () => { UnitTimer.next(timer); });
        } else {
            timer.stack.push({ snapshot: Unit.snapshot(Unit.current), ...options });  
        }
    }

    static next(timer: UnitTimer) {
        if (timer.stack.length > 0) {
            timer.unit = new Unit(Unit.current, UnitTimer.Component, timer.stack.shift());
            timer.unit.on('finalize', () => { UnitTimer.next(timer); });
        }
    }

    static Component(unit: Unit, options: TimerOptions & { snapshot: Snapshot }) {
        let counter = 0;
        const timer = new Timer({
            transition: (p: number) => {
                if (options.transition) Unit.scope(options.snapshot, options.transition, p);
            }, 
            timeout: () => {
                if (options.transition) Unit.scope(options.snapshot, options.transition, 1.0);
                if (options.timeout) Unit.scope(options.snapshot, options.timeout);
                if (options.iterations && counter >= options.iterations - 1) {
                    unit.finalize();
                }
                counter++;
            }, duration: options.duration, iterations: options.iterations, easing: options.easing
        });

        unit.on('finalize', () => timer.clear());
    }
}
