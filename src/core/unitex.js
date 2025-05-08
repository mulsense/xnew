import { isObject, isNumber, isString, isFunction } from '../common';
import { MapSet, MapMap, MapMapMap } from './map';
import { Unit } from './unit';

//----------------------------------------------------------------------------------------------------
// unit scope
//----------------------------------------------------------------------------------------------------

export class UnitScope {
    static current = null;

    static unitToContext = new Map();
   
    static execute(snapshot, func, ...args) {
        const backup = { unit: null, context: null };

        try {
            backup.unit = UnitScope.current;
            UnitScope.current = snapshot.unit;
            if (snapshot.unit && snapshot.context !== undefined) {
                backup.context = UnitScope.context(snapshot.unit);
                UnitScope.context(snapshot.unit, snapshot.context);
            }
            return func(...args);
        } catch (error) {
            throw error;
        } finally {
            UnitScope.current = backup.unit;
            if (snapshot.unit && snapshot.context !== undefined) {
                UnitScope.context(snapshot.unit, backup.context);
            }
        }
    }
    
    static context(unit, context = undefined) {
        if (context !== undefined) {
            UnitScope.unitToContext.set(unit, context);
        } else {
            return UnitScope.unitToContext.get(unit) ?? null;
        }
    }

    static snapshot(unit = UnitScope.current) {
        return { unit, context: UnitScope.context(unit) };
    }

    static clear(unit) {
        UnitScope.unitToContext.delete(unit);
    }

    static push(key, value) {
        const unit = UnitScope.current;
        UnitScope.unitToContext.set(unit, { previous: UnitScope.unitToContext.get(unit), key, value });
    }

    static trace(key) {
        const unit = UnitScope.current;
        for (let context = UnitScope.unitToContext.get(unit); context !== null; context = context.previous) {
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
    static unitToComponents = new MapSet();
    static componentToUnits = new MapSet();

    static add(unit, component) {
        UnitComponent.unitToComponents.add(unit, component);
        UnitComponent.componentToUnits.add(component, unit);
    }
    
    static clear(unit) {
        UnitComponent.unitToComponents.get(unit).forEach((component) => {
            UnitComponent.componentToUnits.delete(component, unit);
        });
        UnitComponent.unitToComponents.delete(unit);
    }

    static find(component) {
        return [...UnitComponent.componentToUnits.get(component)];
    }
}

//----------------------------------------------------------------------------------------------------
// unit event
//----------------------------------------------------------------------------------------------------

export class UnitEvent {
    static event = null;

    static typeToUnits = new MapSet();

    static unitToListeners = new MapMapMap();

    static on(unit, type, listener, options) {
        if (isString(type) === false || type.trim() === '') {
            throw new Error(`The argument [type] is invalid.`);
        } else if (isFunction(listener) === false) {
            throw new Error(`The argument [listener] is invalid.`);
        }

        const listeners = UnitEvent.unitToListeners.get(unit);
        const snapshot = UnitScope.snapshot();

        type.trim().split(/\s+/).forEach((type) => internal(type, listener));

        function internal(type, listener) {
            if (listeners.has(type, listener) === false) {
                const element = unit.element;
                if (type[0] === '-' || type[0] === '+') {
                    const execute = (...args) => {
                        const eventbackup = UnitEvent.event;
                        UnitEvent.event = { type };
                        UnitScope.execute(snapshot, listener, ...args);
                        UnitEvent.event = eventbackup;
                    };
                    listeners.set(type, listener, [element, execute]);
                } else {
                    const execute = (...args) => {
                        const eventbackup = UnitEvent.event;
                        UnitEvent.event = { type: args[0]?.type ?? null };
                        UnitScope.execute(snapshot, listener, ...args);
                        UnitEvent.event = eventbackup;
                    };
                    listeners.set(type, listener, [element, execute]);
                    element.addEventListener(type, execute, options);
                }
            }
            if (listeners.has(type) === true) {
                UnitEvent.typeToUnits.add(type, unit);
            }
        }
    }
    
    static off(unit, type, listener) {
        if (type !== undefined && (isString(type) === false || type.trim() === '')) {
            throw new Error(`The argument [type] is invalid.`);
        } else if (listener !== undefined && isFunction(listener) === false) {
            throw new Error(`The argument [listener] is invalid.`);
        }

        const listeners = UnitEvent.unitToListeners.get(unit);
       
        if (isString(type) === true && listener !== undefined) {
            type.trim().split(/\s+/).forEach((type) => internal(type, listener));
        } else if (isString(type) === true && listener === undefined) {
            type.trim().split(/\s+/).forEach((type) => {
                listeners.get(type)?.forEach((_, listener) => internal(type, listener));
            });
        } else if (type === undefined && listener === undefined) {
            listeners.forEach((map, type) => {
                map.forEach((_, listener) => internal(type, listener));
            });
        }

        function internal(type, listener) {

            if (listeners.has(type, listener) === true) {
                const [element, execute] = listeners.get(type, listener);
                listeners.delete(type, listener);
                element.removeEventListener(type, execute);
            }
            if (listeners.has(type) === false) {
                UnitEvent.typeToUnits.delete(type, unit);
            }
        }
    }
    
    static emit(unit, type, ...args) {
        if (type[0] === '+') {
            UnitEvent.typeToUnits.get(type)?.forEach((unit) => {
                const listeners = UnitEvent.unitToListeners.get(unit);
                listeners.get(type)?.forEach(([element, execute]) => execute(...args));
            });
        } else if (type[0] === '-') {
            const listeners = UnitEvent.unitToListeners.get(unit);
            listeners.get(type)?.forEach(([element, execute]) => execute(...args));
        }
    }
}

//----------------------------------------------------------------------------------------------------
// unit promise
//----------------------------------------------------------------------------------------------------

export class UnitPromise {
    constructor(excutor) {
        this.promise = new Promise(excutor);
    }

    then(callback) {
        const snapshot = UnitScope.snapshot();
        this.promise.then((...args) => UnitScope.execute(snapshot, callback, ...args));
        return this;
    }

    catch(callback) {
        const snapshot = UnitScope.snapshot();
        this.promise.catch((...args) => UnitScope.execute(snapshot, callback, ...args));
        return this;
    }

    finally(callback) {
        const snapshot = UnitScope.snapshot();
        this.promise.finally((...args) => UnitScope.execute(snapshot, callback, ...args));
        return this;
    }

    static unitToPromises = new MapSet();
   
    static execute(mix) {
        const unit = UnitScope.current;
        
        let promise = null;
        if (mix instanceof Promise) {
            promise = mix;
        } else if (isFunction(mix) === true) {
            promise = new Promise(mix);
        } else if (mix instanceof Unit) {
            const promises = UnitPromise.unitToPromises.get(mix);
            promise = promises.size > 0 ? Promise.all([...promises]) : Promise.resolve();
        } else {
            throw new Error(`The argument [mix] is invalid.`);
        }
        if (promise) {
            const scopedpromise = new UnitPromise((resolve, reject) => {
                promise.then((...args) => resolve(...args));
                promise.catch((...args) => reject(...args));
            });
            UnitPromise.unitToPromises.add(unit, promise);
            return scopedpromise;
        }
    }
}

//----------------------------------------------------------------------------------------------------
// unit element
//----------------------------------------------------------------------------------------------------

export class UnitElement {

    static unitToElements = new Map();

    static initialize(unit, baseElement) {
        UnitElement.unitToElements.set(unit, [baseElement]);
    }

    static nest(unit, attributes) {
        const current = UnitElement.get(unit);
        if (current instanceof Window || current instanceof Document) {
            throw new Error(`No elements are added to window or document.`);
        } else if (isObject(attributes) === false) {
            throw new Error(`The argument [attributes] is invalid.`);
        } else {
            const element = UnitElement.create(attributes, current);
            current.append(element);
            UnitElement.unitToElements.get(unit).push(element);
            return element;
        }
    }

    static get(unit) {
        return UnitElement.unitToElements.get(unit).slice(-1)[0];
    }

    static clear(unit) {
        const elements = UnitElement.unitToElements.get(unit);
        if (elements.length > 1) {
            elements[0].removeChild(elements[1]);
        }
        UnitElement.unitToElements.delete(unit);
    }
    
    static create(attributes, parentElement = null) {
        const tagName = (attributes.tagName ?? 'div').toLowerCase();
        let element = null;
    
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
    
        if (nsmode === true) {
            element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
        } else {
            element = document.createElement(tagName);
        }
    
        Object.keys(attributes).forEach((key) => {
            const value = attributes[key];
            if (key === 'tagName') {
            } else if (key === 'insert') {
            } else if (key === 'className') {
                if (isString(value) === true && value !== '') {
                    element.classList.add(...value.trim().split(/\s+/));
                }
            } else if (key === 'style') {
                if (isString(value) === true) {
                    element.style = value;
                } else if (isObject(value) === true) {
                    Object.assign(element.style, value);
                }
            } else {
                const snake = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                if (element[key] === true || element[key] === false) {
                    element[key] = value;
                } else {
                    setAttribute(element, key, value);
                }
    
                function setAttribute(element, key, value) {
                    if (nsmode === true) {
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
