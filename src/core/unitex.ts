import { MapSet, MapMap, MapMapMap } from './map';

//----------------------------------------------------------------------------------------------------
// types
//----------------------------------------------------------------------------------------------------

type Unit = any; // Placeholder for the Unit type

interface UnitContext {
    unit: Unit | null;
    data: UnitData | null;
}

interface UnitData {
    stack: UnitData | null;
    key: string;
    value: any;
}

//----------------------------------------------------------------------------------------------------
// unit scope
//----------------------------------------------------------------------------------------------------

export class UnitScope {
    static current: Unit | null = null;

    static unitToData: Map<Unit | null, UnitData> = new Map();
   
    static execute(snapshot: UnitContext, func: Function, ...args: any[]): any {
        const backup: UnitContext = { unit: null, data: null };

        try {
            backup.unit = UnitScope.current;
            UnitScope.current = snapshot.unit;

            if (snapshot.unit !== null && snapshot.data !== null && backup.data !== null) {
                backup.data = UnitScope.get(snapshot.unit) ?? null;
                UnitScope.set(snapshot.unit, snapshot.data);
            }
            return func(...args);
        } catch (error) {
            throw error;
        } finally {
            UnitScope.current = backup.unit;
            if (snapshot.unit !== null && snapshot.data !== null && backup.data !== null) {
                UnitScope.set(snapshot.unit, backup.data);
            }
        }
    }

    static set(unit: Unit | null, data: UnitData): void {
        UnitScope.unitToData.set(unit, data);
    }

    static get(unit: Unit | null): UnitData | null {
        return UnitScope.unitToData.get(unit) ?? null;
    }

    static snapshot(unit: Unit | null = UnitScope.current): UnitContext {
        return { unit, data: UnitScope.get(unit) };
    }

    static clear(unit: Unit): void {
        UnitScope.unitToData.delete(unit);
    }

    static push(unit: Unit, key: string, value: any): void {
        UnitScope.unitToData.set(unit, { stack: UnitScope.get(unit), key, value });
    }

    static trace(unit: Unit, key: string): any {
        for (let data: UnitData | null = UnitScope.get(unit); data !== null; data = data.stack) {
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

    static add(unit: Unit, component: any): void {
        UnitComponent.unitToComponents.add(unit, component);
        UnitComponent.componentToUnits.add(component, unit);
    }
    
    static clear(unit: Unit): void {
        UnitComponent.unitToComponents.get(unit)?.forEach((component) => {
            UnitComponent.componentToUnits.delete(component, unit);
        });
        UnitComponent.unitToComponents.delete(unit);
    }

    static find(component: any): any[] {
        return [...(UnitComponent.componentToUnits.get(component) ?? [])];
    }
}

//----------------------------------------------------------------------------------------------------
// unit element
//----------------------------------------------------------------------------------------------------

export class UnitElement {

    static unitToElements: Map<Unit, Element[]> = new Map();

    static initialize(unit: Unit, baseElement: Element): void {
        UnitElement.unitToElements.set(unit, [baseElement]);
    }

    static nest(unit: Unit, attributes: Record<string, any>): Element {
        const current = UnitElement.get(unit);
        if (typeof attributes !== 'object') {
            throw new Error(`The argument [attributes] is invalid.`);
        } else {
            const element = UnitElement.create(attributes, current);
            current.append(element);
            UnitElement.unitToElements.get(unit)?.push(element);
            return element;
        }
    }

    static get(unit: Unit): Element {
        return UnitElement.unitToElements.get(unit)?.slice(-1)[0]!;
    }

    static clear(unit: Unit): void {
        const elements = UnitElement.unitToElements.get(unit);
        if (elements && elements.length > 1) {
            elements[0].removeChild(elements[1]);
        }
        UnitElement.unitToElements.delete(unit);
    }

    static create(attributes: Record<string, any>, parentElement: Element | null = null): Element {
        const tagName = (attributes.tagName ?? 'div').toLowerCase();
        let element: Element;

        let nsmode = false;
        if (tagName === 'svg') {
            nsmode = true;
        } else {
            while (parentElement) {
                if (parentElement.tagName.toLowerCase() === 'svg') {
                    nsmode = true;
                    break;
                }
                parentElement = parentElement.parentElement;
            }
        }

        if (nsmode) {
            element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
        } else {
            element = document.createElement(tagName);
        }

        Object.keys(attributes).forEach((key) => {
            const value = attributes[key];
            if (key === 'tagName') {
                // Skip tagName
            } else if (key === 'insert') {
                // Skip insert
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
                    setAttribute(element, key, value);
                }

                function setAttribute(element: Element, key: string, value: any): void {
                    if (nsmode) {
                        element.setAttributeNS(null, key, value);
                    } else {
                        element.setAttribute(key, value);
                    }
                }
            }
        });

        return element;
    }
}

//----------------------------------------------------------------------------------------------------
// unit event
//----------------------------------------------------------------------------------------------------
interface HTMLElementEvent<T extends HTMLElement> extends Event {
	target: T;
}
export class UnitEvent {
    static event: { type: string | null } | null = null;

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
                if (type[0] === '-' || type[0] === '+') {
                    const execute = (...args: any[]) => {
                        const eventbackup = UnitEvent.event;
                        UnitEvent.event = { type };
                        UnitScope.execute(snapshot, listener, ...args);
                        UnitEvent.event = eventbackup;
                    };
                    UnitEvent.unitToListeners.set(unit, type, listener, [element, execute]);
                } else {
                    const execute = (...args: any[]) => {
                        const eventbackup = UnitEvent.event;
                        UnitEvent.event = { type: args[0]?.type ?? null };
                        UnitScope.execute(snapshot, listener, ...args);
                        UnitEvent.event = eventbackup;
                    };
                    UnitEvent.unitToListeners.set(unit, type, listener, [element, execute]);

                    if (element instanceof Element) {
                        function handle(event: any) {
                            execute(event);
                        }
                        element.addEventListener(type, handle, options);
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
                map.forEach((_: any, listener: Function) => internal(type, listener));
            });
        }

        function internal(type: string, listener: Function): void {
            if (UnitEvent.unitToListeners.has(unit, type, listener)) {
                const [element, execute] = UnitEvent.unitToListeners.get(unit, type, listener);
                UnitEvent.unitToListeners.delete(unit, type, listener);
                if (element instanceof Element) {
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
   
    static execute(promise: Promise<any>): UnitPromise {
        const unit = UnitScope.current;
        
        const unitpromise = new UnitPromise((resolve, reject) => {
            promise!.then((...args) => resolve(...args));
            promise!.catch((...args) => reject(...args));
        });
        UnitPromise.unitToPromises.add(unit!, promise);
        return unitpromise;
    }
}
