import { MapSet, MapMap, MapMapMap } from './map';

//----------------------------------------------------------------------------------------------------
// types
//----------------------------------------------------------------------------------------------------

type UnitTarget = Element | Window | Document;

interface UnitContext { unit: Unit | null; data: UnitContextData | null; }
interface UnitContextData { stack: UnitContextData | null; key: string; value: any; }

function isPlainObject(value: any): boolean {
    return value !== null && typeof value === 'object' && value.constructor === Object;
}

//----------------------------------------------------------------------------------------------------
// unit main
//----------------------------------------------------------------------------------------------------

export class Unit {
    [key: string]: any;
    
    public _: { [key: string]: any } = {};

    static increment: number = 0;
    static roots: Unit[] = [];

    constructor(parent: Unit | null, target: Object | null, component?: Function | string, ...args: any[]) {
        let baseTarget: UnitTarget | null = null;
        if (target instanceof Element || target instanceof Window || target instanceof Document) {
            baseTarget = target;
        } else if (parent !== null) {
            baseTarget = parent.element;
        } else if (document instanceof Document) {
            baseTarget = document.currentScript?.parentElement ?? document.body;
        }

        this._ = Object.assign(this._, {
            id: Unit.increment++,
            root: parent?._.root ?? this,
            list: parent?._.children ?? Unit.roots,
            parent,
            target,
            component,
            args,
            baseTarget,
            baseContext: UnitScope.get(parent),
        });

        this._.list.push(this);
        Unit.initialize(this, component, ...args);
    }

    get element(): Element | null {
        return this._.baseTarget instanceof Element ? UnitElement.get(this) : null;
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
        this._.list = this._.list.filter((unit: Unit) => unit !== this);
    }

    reboot(): void {
        Unit.stop(this);
        Unit.finalize(this);
        Unit.initialize(this, this._.component, ...this._.args);
    }

    on(type: string, listener: EventListener, options?: boolean | AddEventListenerOptions): void {
        try {
            UnitEvent.on(this, type, listener, options);
        } catch (error) {
            console.error('unit.on(type, listener, option?): ', error);
        }
    }

    off(type?: string, listener?: EventListener): void {
        try {
            UnitEvent.off(this, type, listener);
        } catch (error) {
            console.error('unit.off(type, listener): ', error);
        }
    }

    //----------------------------------------------------------------------------------------------------
    // internal
    //----------------------------------------------------------------------------------------------------

    static initialize(unit: Unit, component?: Function | string, ...args: any[]): void {
        unit._ = Object.assign(unit._, {
            children: [],       // children units
            state: 'pending',   // [pending -> running <-> stopped -> finalized]
            tostart: true,      // flag for start
            upcount: 0,         // update count    
            resolved: false,    // promise check
            props: {},          // properties in the component function
        });

        UnitScope.initialize(unit, unit._.baseContext);
        UnitElement.initialize(unit, unit._.baseTarget);

        // nest html element
        if (isPlainObject(unit._.target)) {
            UnitElement.nest(unit, unit._.target);
        }

        // setup component
        if (typeof component === 'function') {
            UnitScope.execute({ unit, data: null }, () => Unit.extend(unit, component, ...args));
        } else if (isPlainObject(unit._.target) && typeof component === 'string') {
            unit.element!.innerHTML = component;
        }

        // whether the unit promise was resolved
        UnitPromise.get(unit)?.then(() => { unit._.resolved = true; });
    }

    static finalize(unit: Unit): void {
        if (unit._.state !== 'finalized') {
            unit._.state = 'finalized';

            unit._.children.forEach((unit: Unit) => unit.finalize());

            if (typeof unit._.props.finalize === 'function') {
                UnitScope.execute(UnitScope.snapshot(unit), unit._.props.finalize);
            }

            UnitEvent.off(unit);
            UnitScope.finalize(unit)
            UnitElement.finalize(unit);
            UnitComponent.finalize(unit);
            UnitPromise.finalize(unit);

            // reset props
            Object.keys(unit._.props).forEach((key) => {
                if (['start', 'update', 'stop', 'finalize'].includes(key) === false) {
                    delete unit[key as keyof Unit];
                }
            });
            unit._.props = {};
        }
    }

    static extend(unit: Unit, component: Function, ...args: any[]): void {
        UnitComponent.add(unit, component);

        const props = component(unit, ...args) ?? {};
        const snapshot = UnitScope.snapshot(unit);

        Object.keys(props).forEach((key) => {
            const descripter = Object.getOwnPropertyDescriptor(props, key);
            if (['start', 'update', 'stop', 'finalize'].includes(key) && typeof descripter?.value === 'function') {
                if (typeof descripter?.value === 'function') {
                    const previous = unit._.props[key];
                    if (previous !== undefined) {
                        unit._.props[key] = (...args: any[]) => { previous(...args); descripter.value(...args); };
                    } else {
                        unit._.props[key] = (...args: any[]) => { descripter.value(...args); };
                    }
                } else {
                    throw new Error(`The property "${key}" is invalid.`);
                }
            } else if (unit[key as keyof Unit] === undefined) {
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
            if (typeof unit._.props.start === 'function') {
                UnitScope.execute(UnitScope.snapshot(unit), unit._.props.start);
            }
        } else if (unit._.state === 'running') {
            unit._.children.forEach((child: Unit) => Unit.start(child, time));
        }
    }

    static stop(unit: Unit): void {
        if (unit._.state === 'running') {
            unit._.state = 'stopped';
            unit._.children.forEach((child: Unit) => Unit.stop(child));
            if (typeof unit._.props.stop === 'function') {
                UnitScope.execute(UnitScope.snapshot(unit), unit._.props.stop);
            }
        }
    }

    static update(unit: Unit, time: number): void {
        if (['running'].includes(unit._.state) === true) {
            unit._.children.forEach((unit: Unit) => Unit.update(unit, time));

            if (['running'].includes(unit._.state) && typeof unit._.props.update === 'function') {
                UnitScope.execute(UnitScope.snapshot(unit), unit._.props.update, unit._.upcount++);
            }
        }
    }

    static animation: number | null = null;
    static previous: number = 0.0;

    static reset(): void {
        Unit.roots.forEach((unit) => unit.finalize());
        Unit.roots = [];
       
        if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
            Unit.previous = Date.now();
            if (Unit.animation !== null) {
                cancelAnimationFrame(Unit.animation);
            }
            Unit.animation = requestAnimationFrame(ticker);

            function ticker () {
                const interval = 1000 / 60;
                const time = Date.now();
                if (time - Unit.previous > interval * 0.8) {
                    Unit.roots.forEach((unit) => {
                        Unit.start(unit, time);
                        Unit.update(unit, time);
                    });
                    Unit.previous = time;
                }
                Unit.animation = requestAnimationFrame(ticker);
            }
        }
    }
}

Unit.reset();

//----------------------------------------------------------------------------------------------------
// unit scope
//----------------------------------------------------------------------------------------------------

export class UnitScope {
    static current: Unit | null = null;

    static data: Map<Unit | null, UnitContextData> = new Map();
   
    static initialize(unit: Unit | null, data: UnitContextData): void {
        UnitScope.data.set(unit, data);
    }

    static finalize(unit: Unit): void {
        UnitScope.data.delete(unit);
    }

    static set(unit: Unit, data: UnitContextData): void {
        UnitScope.data.set(unit, data);
    }

    static get(unit: Unit | null): UnitContextData | null {
        return UnitScope.data.get(unit) ?? null;
    }

    static execute(snapshot: UnitContext, func: Function, ...args: any[]): any {
        const backup: UnitContext = { unit: null, data: null };

        try {
            backup.unit = UnitScope.current;
            UnitScope.current = snapshot.unit;

            if (snapshot.unit !== null && snapshot.data !== null && backup.data !== null) {
                backup.data = UnitScope.get(snapshot.unit);
                UnitScope.data.set(snapshot.unit, snapshot.data);
            }
            return func(...args);
        } catch (error) {
            throw error;
        } finally {
            UnitScope.current = backup.unit;
            if (snapshot.unit !== null && snapshot.data !== null && backup.data !== null) {
                UnitScope.data.set(snapshot.unit, backup.data);
            }
        }
    }

    static snapshot(unit: Unit | null = UnitScope.current): UnitContext {
        return { unit, data: UnitScope.get(unit) };
    }

    static stack(unit: Unit, key: string, value: any): void {
        UnitScope.data.set(unit, { stack: UnitScope.get(unit), key, value });
    }

    static trace(unit: Unit, key: string): any {
        for (let data: UnitContextData | null = UnitScope.get(unit); data !== null; data = data.stack) {
            if (data.key === key) {
                return data.value;
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
// unit element
//----------------------------------------------------------------------------------------------------

export class UnitElement {
    static elements: Map<Unit, Element[]> = new Map();

    static initialize(unit: Unit, baseTarget: Element): void {
        UnitElement.elements.set(unit, [baseTarget]);
    }

    static finalize(unit: Unit): void {
        const elements = UnitElement.elements.get(unit);
        if (elements && elements.length > 1) {
            elements[0].removeChild(elements[1]);
        }
        UnitElement.elements.delete(unit);
    }

    static nest(attributes: Record<string, any>): Element {
        const unit = UnitScope.current;
        if (unit === null) {
            throw new Error(`This function can not be called outside xnew.`);
        }
        const current = UnitElement.get(unit);
        if (isPlainObject(attributes) === false) {
            throw new Error(`The argument [attributes] is invalid.`);
        } else if (unit._.state !== 'pending') {
            throw new Error(`This function can not be called after initialized.`);
        }
        const element = UnitElement.append(current, attributes);
        UnitElement.elements.get(unit)?.push(element);
        return element;
    }

    static get(unit: Unit): Element {
        return UnitElement.elements.get(unit)?.slice(-1)[0]!;
    }

    static append(parentElement: Element, attributes: Record<string, any>): Element {
        const tagName = (attributes.tagName ?? 'div').toLowerCase();

        let isNS = false;
        if (tagName === 'svg') {
            isNS = true;
        } else {
            for (let parent: Element | null = parentElement; parent !== null; parent = parent.parentElement) {
                if (parent.tagName.toLowerCase() === 'svg') {
                    isNS = true;
                    break;
                }
            }
        }

        let element: Element;
        if (isNS) {
            element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
        } else {
            element = document.createElement(tagName);
        }

        Object.keys(attributes).forEach((key) => {
            const value = attributes[key];
            if (key === 'tagName' || key === 'class') {
                // Skip
            } else if (key === 'className') {
                if (typeof value === 'string' && value !== '') {
                    element.classList.add(...value.trim().split(/\s+/));
                }
            } else if (key === 'style') {
                if (typeof value === 'string') {
                    (element as HTMLElement).style.cssText = value;
                } else if (isPlainObject(value) === true) {
                    Object.assign((element as HTMLElement).style, value);
                }
            } else {
                const snake = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                if (element[key as keyof Element] === true || element[key as keyof Element] === false) {
                    (element as any)[key] = value;
                } else {
                    if (isNS) {
                        element.setAttributeNS(null, key, value);
                    } else {
                        element.setAttribute(key, value);
                    }
                }
            }
        });
        parentElement.append(element);
        return element;
    }
}

//----------------------------------------------------------------------------------------------------
// unit event
//----------------------------------------------------------------------------------------------------

export class UnitEvent {
    static units: MapSet<string, Unit> = new MapSet();
    static listeners: MapMapMap<Unit, string, Function, [UnitTarget | null, (...args: any[]) => void]> = new MapMapMap();

    static on(unit: Unit, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        if (typeof type !== 'string' || (typeof type === 'string' && type.trim() === '')) {
            throw new Error('"type" is invalid.');
        } else if (typeof listener !== 'function') {
            throw new Error('"listener" is invalid.');
        }
        
        const snapshot = UnitScope.snapshot();
        let target: UnitTarget | null = null;
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
        } else if (type[0] === '-') {
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
