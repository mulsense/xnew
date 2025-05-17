import { MapSet, MapMap, MapMapMap } from './map';

//----------------------------------------------------------------------------------------------------
// unit types
//----------------------------------------------------------------------------------------------------

interface UnitContext {
    unit: Unit | null;
    data: UnitContextData | null;
}

interface UnitContextData {
    stack: UnitContextData | null;
    key: string;
    value: any;
}

interface UnitInternal {
    [key: string]: any;
}

//----------------------------------------------------------------------------------------------------
// unit main
//----------------------------------------------------------------------------------------------------

export class Unit {
    public _: UnitInternal = {};
    [key: string]: any;

    static autoincrement: number = 0;
 
    constructor(parent: Unit | null, target: Element | Window | Document | null, component?: Function | string, ...args: any[]) {
        try {
            const id = Unit.autoincrement++;
            const root = parent?._.root ?? this;

            let baseElement: Element | Window | Document | null = null;
            if (target instanceof Element || target instanceof Window || target instanceof Document) {
                baseElement = target;
            } else if (parent !== null) {
                baseElement = parent.element;
            } else if (document instanceof Document) {
                baseElement = document.currentScript?.parentElement ?? document.body;
            }
            const baseContext = UnitScope.get(parent);

            this._ = Object.assign(this._, {
                id,             // unit id
                root,           // root unit
                parent,         // parent unit
                target,         // target info
                component,      // component function
                args,           // component arguments
                baseElement,    // base element
                baseContext,    // base context
            });

            (parent?._.children ?? Unit.roots).push(this);
            Unit.initialize(this, component, ...args);

        } catch (error) {
            console.error('unit constructor: ', error);
        }
    }

    //----------------------------------------------------------------------------------------------------
    // base system 
    //----------------------------------------------------------------------------------------------------

    get element(): Element | Window | Document | null {
        if (this._.baseElement instanceof Element || this._.baseElement instanceof Window || this._.baseElement instanceof Document) {
            return UnitElement.get(this);
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
        (this._.parent?._.children ?? Unit.roots).filter((unit: Unit) => unit !== this);
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

    static roots: Unit[] = [];   // root units

    static initialize(unit: Unit, component?: Function | string, ...args: any[]): void {
        unit._ = Object.assign(unit._, {
            children: [],                    // children units
            state: 'pending',                // [pending -> running <-> stopped -> finalized]
            tostart: false,                  // flag for start
            upcount: 0,                      // update count    
            resolved: false,                 // promise check
            props: {},                       // properties in the component function
        });

        UnitScope.initialize(unit, unit._.baseContext);
        UnitElement.initialize(unit, unit._.baseElement);
        UnitComponent.initialize(unit);

        if (unit._.parent !== null && ['finalized'].includes(unit._.parent._.state ?? '')) {
            unit._.state = 'finalized';
        } else {
            unit._.tostart = true;
            // nest html element
            if (!(unit._.target instanceof Element || unit._.target instanceof Window || unit._.target instanceof Document)) {
                if ((unit._.target !== null && typeof unit._.target === 'object') && unit.element instanceof Element) {
                    UnitElement.nest(unit, unit._.target);
                }
            }

            // setup component
            if (typeof component === 'function') {
                UnitScope.execute({ unit, data: null }, () => Unit.extend(unit, component, ...args));
            } else if ((unit._.target !== null && typeof unit._.target === 'object') && typeof component === 'string') {
                if (unit.element instanceof Element) {
                    unit.element!.innerHTML = component;
                }
            }

            // whether the unit promise was resolved
            UnitPromise.execute(unit)?.then(() => { unit._.resolved = true; });
        }
    }

    static extend(unit: Unit, component: Function | any, ...args: any[]): void {
        if (typeof component !== 'function') {
            throw new Error(`The argument [component] is invalid.`);
        } 
        UnitComponent.add(unit, component);

        const props = component(unit, ...args) ?? {};

        Object.keys(props).forEach((key) => {
            const descripter = Object.getOwnPropertyDescriptor(props, key);
            if (['start', 'update', 'stop', 'finalize'].includes(key)) {
                if (typeof descripter?.value === 'function') {
                    const previous = unit._.props[key];
                    if (previous !== undefined) {
                        unit._.props[key] = (...args: any[]) => { previous(...args); descripter.value(...args); };
                    } else {
                        unit._.props[key] = (...args: any[]) => { descripter.value(...args); };
                    }
                } else {
                    console.error(`unit.extend: The property [${key}] is invalid.`);
                }
            } else if (unit[key as keyof Unit] === undefined) {
                const dest: PropertyDescriptor = { configurable: true, enumerable: true };
                const snapshot = UnitScope.snapshot(unit);
                if (typeof descripter?.get === 'function') {
                    dest.get = (...args: any[]) => UnitScope.execute(snapshot, descripter.get!, ...args);
                } else if (typeof descripter?.set === 'function') {
                    dest.set = (...args: any[]) => UnitScope.execute(snapshot, descripter.set!, ...args);
                } else if (typeof descripter?.value === 'function') {
                    dest.value = (...args: any[]) => UnitScope.execute(snapshot, descripter.value!, ...args);
                } else if (descripter?.value !== undefined) {
                    dest.writable = true;
                    dest.value = descripter.value;
                }
                Object.defineProperty(unit._.props, key, dest);
                Object.defineProperty(unit, key, dest);
            } else {
                console.error(`unit.extend: The property [${key}] already exists.`);
            }
        });
    }

    static start(unit: Unit, time: number): void {
        if (unit._.resolved === false || unit._.tostart === false) {
        } else if (['pending', 'stopped'].includes(unit._.state) === true) {
            unit._.state = 'running';
            unit._.children.forEach((unit: Unit) => Unit.start(unit, time));
            if (typeof unit._.props.start === 'function') {
                UnitScope.execute(UnitScope.snapshot(unit), unit._.props.start);
            }
        } else if (['running'].includes(unit._.state) === true) {
            unit._.children.forEach((unit: Unit) => Unit.start(unit, time));
        }
    }

    static stop(unit: Unit): void {
        if (['running'].includes(unit._.state) === true) {
            unit._.state = 'stopped';
            unit._.children.forEach((unit: Unit) => Unit.stop(unit));

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

    static finalize(unit: Unit): void {
        if (['finalized'].includes(unit._.state) === false) {
            unit._.state = 'finalized';

            unit._.children.forEach((unit: Unit) => unit.finalize());
            unit._.children = [];

            if (typeof unit._.props.finalize === 'function') {
                UnitScope.execute(UnitScope.snapshot(unit), unit._.props.finalize);
            }

            UnitEvent.off(unit);
            UnitScope.finalize(unit)
            UnitElement.finalize(unit);
            UnitComponent.finalize(unit);

            // reset props
            Object.keys(unit._.props).forEach((key) => {
                if (['start', 'update', 'stop', 'finalize'].includes(key) === false) {
                    delete unit[key as keyof Unit];
                }
            });
            unit._.props = {};
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
    static unitToComponents: MapSet<Unit | null, any> = new MapSet();
    static componentToUnits: MapSet<any, Unit | null> = new MapSet();
  
    static initialize(unit: Unit | null): void {
    }

    static finalize(unit: Unit): void {
        UnitComponent.unitToComponents.get(unit)?.forEach((component) => {
            UnitComponent.componentToUnits.delete(component, unit);
        });
        UnitComponent.unitToComponents.delete(unit);
    }

    static add(unit: Unit, component: any): void {
        UnitComponent.unitToComponents.add(unit, component);
        UnitComponent.componentToUnits.add(component, unit);
    }
    
    static find(component: any): any[] {
        return [...(UnitComponent.componentToUnits.get(component) ?? [])];
    }
}

//----------------------------------------------------------------------------------------------------
// unit element
//----------------------------------------------------------------------------------------------------

export class UnitElement {

    static elements: Map<Unit, Element[]> = new Map();

    static initialize(unit: Unit, baseElement: Element): void {
        UnitElement.elements.set(unit, [baseElement]);
    }

    static finalize(unit: Unit): void {
        const elements = UnitElement.elements.get(unit);
        if (elements && elements.length > 1) {
            elements[0].removeChild(elements[1]);
        }
        UnitElement.elements.delete(unit);
    }

    static nest(unit: Unit, attributes: Record<string, any>): Element {
        const current = UnitElement.get(unit);
        if (typeof attributes !== 'object') {
            throw new Error(`The argument [attributes] is invalid.`);
        } else {
            const element = UnitElement.append(current, attributes);
            UnitElement.elements.get(unit)?.push(element);
            return element;
         }
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
                } else if (typeof value !== null && typeof value === 'object') {
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
    static typeToUnits: MapSet<string, Unit> = new MapSet();

    static unitToListeners: MapMapMap<Unit, string, Function, any> = new MapMapMap();

    static on(unit: Unit, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        if (typeof type !== 'string' || type.trim() === '') {
            throw new Error(`The argument [type] is invalid.`);
        } else if (typeof listener !== 'function') {
            throw new Error(`The argument [listener] is invalid.`);
        }
        const snapshot = UnitScope.snapshot();

        type.trim().split(/\s+/).forEach((type) => internal(type, listener));

        function internal(type: string, listener: Function): void {
            if (!UnitEvent.unitToListeners.has(unit, type, listener)) {
                const element = unit.element;
                const execute = (...args: any[]) => {
                    UnitScope.execute(snapshot, listener, ...args);
                };
                UnitEvent.unitToListeners.set(unit, type, listener, [element, execute]);
                if (/^[A-Za-z]/.test(type[0])) {
                    if (element instanceof Element || element instanceof Window || element instanceof Document) {
                        element.addEventListener(type, execute, options);
                    }
                }
            }
            if (UnitEvent.unitToListeners.has(unit, type)) {
                UnitEvent.typeToUnits.add(type, unit);
            }
        }
    }
    
    static off(unit: Unit, type?: string, listener?: Function): void {
        if (type !== undefined && (typeof type !== 'string' || type.trim() === '')) {
            throw new Error(`The argument [type] is invalid.`);
        } else if (listener !== undefined && typeof listener !== 'function') {
            throw new Error(`The argument [listener] is invalid.`);
        }
       
        if (typeof type === 'string' && listener !== undefined) {
            type.trim().split(/\s+/).forEach((type) => internal(type, listener));
        } else if (typeof type === 'string' && listener === undefined) {
            type.trim().split(/\s+/).forEach((type) => {
                UnitEvent.unitToListeners.get(unit, type)?.forEach((_: any, listener: Function) => internal(type, listener));
            });
        } else if (type === undefined && listener === undefined) {
            UnitEvent.unitToListeners.get(unit)?.forEach((map: any, type: string) => {
                map?.forEach((_: any, listener: Function) => internal(type, listener));
            });
        }

        function internal(type: string, listener: Function): void {
            if (UnitEvent.unitToListeners.has(unit, type, listener)) {
                const [element, execute] = UnitEvent.unitToListeners.get(unit, type, listener);
                UnitEvent.unitToListeners.delete(unit, type, listener);
                if (element instanceof Element || element instanceof Window || element instanceof Document) {
                    
                    element.removeEventListener(type, execute);
                }
            }
            if (!UnitEvent.unitToListeners.has(unit, type)) {
                UnitEvent.typeToUnits.delete(type, unit);
            }
        }
    }
    
    static emit(unit: Unit, type: string, ...args: any[]): void {
        if (type[0] === '+') {
            UnitEvent.typeToUnits.get(type)?.forEach((unit) => {
                UnitEvent.unitToListeners.get(unit, type)?.forEach(([element, execute]: any) => execute(...args));
            });
        } else if (type[0] === '-') {
            UnitEvent.unitToListeners.get(unit, type)?.forEach(([element, execute]: any) => execute(...args));
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

    static unitToPromises: MapSet<Unit, Promise<any>> = new MapSet();
   
    static execute(mix: Promise<any> | Function | Unit | any): UnitPromise | undefined {
        let promise: Promise<any> | null = null;
        if (mix instanceof Promise) {
            promise = mix;
        } else if (typeof mix === 'function') {
            promise = new Promise(mix);
        } else if (mix instanceof Unit) {
            const promises: any = UnitPromise.unitToPromises.get(mix);
            promise = promises?.size > 0 ? Promise.all([...promises]) : Promise.resolve();
        } else {
            throw new Error(`The argument [mix] is invalid.`);
        }
        
        const unitpromise = new UnitPromise((resolve, reject) => {
            promise.then((...args) => resolve(...args));
            promise.catch((...args) => reject(...args));
        });
        if (UnitScope.current !== null) {
            UnitPromise.unitToPromises.add(UnitScope.current, promise);
        }
        return unitpromise;
    }
}
