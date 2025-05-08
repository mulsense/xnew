import { isObject, isNumber, isString, isFunction } from '../common';
import { Ticker } from './ticker';
import { UnitElement, UnitComponent, UnitEvent, UnitScope, UnitPromise } from './unitex';

export class Unit {
    constructor(parent, target, component, ...args) {
        try {
            if (!(parent === null || parent instanceof Unit)) {
                throw new Error(`The argument [parent] is invalid.`);
            }
            if (!(target === null || isObject(target) === true || target instanceof Element || target instanceof Window || target instanceof Document)) {
                throw new Error(`The argument [target] is invalid.`);
            }
            if (!(component === undefined || isFunction(component) === true || (isObject(target) === true && isString(component) === true))) {
                throw new Error(`The argument [component] is invalid.`);
            }
    
            const id = Unit.autoincrement++;
            const root = parent?._.root ?? this;
    
            let baseElement = null;
            if (target instanceof Element || target instanceof Window || target instanceof Document) {
                baseElement = target;
            } else if (parent !== null) {
                baseElement = parent.element;
            } else if (document instanceof Document) {
                baseElement = document.currentScript?.parentElement ?? document.body;
            }
    
            const baseContext = UnitScope.context(parent);
    
            this._ = {
                id,             // unit id
                root,           // root unit
                parent,         // parent unit
                target,         // target info
                component,      // component function
                args,           // component arguments
                baseElement,    // base element
                baseContext,    // base context
            };
    
            (parent?._.children ?? Unit.roots).add(this);
            Unit.initialize(this, component, ...args);

        } catch (error) {
            console.error(`unit constructor: ${error.message}`);
        }
    }

    //----------------------------------------------------------------------------------------------------
    // base system 
    //----------------------------------------------------------------------------------------------------

    get element() {
        return UnitElement.get(this);
    }

    start() {
        this._.tostart = true;
    }

    stop() {
        this._.tostart = false;
        Unit.stop(this);
    }

    finalize() {
        Unit.stop(this);
        Unit.finalize(this);
        (this._.parent?._.children ?? Unit.roots).delete(this);
    }

    reboot() {
        Unit.stop(this);
        Unit.finalize(this);
        Unit.initialize(this, this._.component, ...this._.args);
    }

    on(type, listener, options) {
        try {
            UnitEvent.on(this, type, listener, options);
        } catch (error) {
            console.error(`unit.on(type, listener, options): ${error.message}`);
        }
    }

    off(type, listener) {
        try {
            UnitEvent.off(this, type, listener);
        } catch (error) {
            console.error(`unit.off(type, listener): ${error.message}`);
        }
    }

    static autoincrement = 0; // auto increment id
    
    static roots = new Set();   // root units

    static initialize(unit, component, ...args) {
        unit._ = Object.assign(unit._, {
            children: new Set(),       // children units
            state: 'pending',          // [pending -> running <-> stopped -> finalized]
            tostart: false,            // flag for start
            upcount: 0,                // update count    
            resolved: false,           // promise check
            props: {},                 // properties in the component function
        });

        UnitElement.initialize(unit, unit._.baseElement);
        UnitScope.context(unit, unit._.baseContext);

        if (unit._.parent !== null && ['finalized'].includes(unit._.parent._.state)) {
            unit._.state = 'finalized';
        } else {
            unit._.tostart = true;

            // nest html element
            if (isObject(unit._.target) === true && unit.element instanceof Element) {
                UnitElement.nest(unit, unit._.target);
            }

            // setup component
            if (isFunction(component) === true) {
                UnitScope.execute({ unit }, () => Unit.extend(unit, component, ...args));
            } else if (isObject(unit._.target) === true && isString(component) === true) {
                unit.element.innerHTML = component;
            }

            // whether the unit promise was resolved
            UnitPromise.execute(unit).then((response) => { unit._.resolved = true; });
        }
    }

    static extend(unit, component, ...args) {
        if (isFunction(component) === false) {
            throw new Error(`The argument [component] is invalid.`);
        } 
        UnitComponent.add(unit, component);

        const props = component(unit, ...args) ?? {};

        Object.keys(props).forEach((key) => {
            const descripter = Object.getOwnPropertyDescriptor(props, key);
            if (['start', 'update', 'stop', 'finalize'].includes(key)) {
                if (isFunction(descripter.value)) {
                    const previous = unit._.props[key];
                    if (previous !== undefined) {
                        unit._.props[key] = (...args) => { previous(...args); descripter.value(...args); };
                    } else {
                        unit._.props[key] = (...args) => { descripter.value(...args); };
                    }
                } else {
                    console.error(`unit.extend: The property [${key}] is invalid.`);
                }
            } else if (unit[key] === undefined) {
                const dest = { configurable: true, enumerable: true };
                const snapshot = UnitScope.snapshot(unit);
                if (isFunction(descripter.get) === true) {
                    dest.get = (...args) => UnitScope.execute(snapshot, descripter.get, ...args);
                } else if (isFunction(descripter.set) === true) {
                    dest.set = (...args) => UnitScope.execute(snapshot, descripter.set, ...args);
                } else if (isFunction(descripter.value) === true) {
                    dest.value = (...args) => UnitScope.execute(snapshot, descripter.value, ...args);
                } else if (descripter.value !== undefined) {
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

    static start(unit, time) {
        if (unit._.resolved === false || unit._.tostart === false) {
        } else if (['pending', 'stopped'].includes(unit._.state) === true) {
            unit._.state = 'running';
            unit._.children.forEach((unit) => Unit.start(unit, time));
            if (isFunction(unit._.props.start) === true) {
                UnitScope.execute(UnitScope.snapshot(unit), unit._.props.start);
            }
        } else if (['running'].includes(unit._.state) === true) {
            unit._.children.forEach((unit) => Unit.start(unit, time));
        }
    }

    static stop(unit) {
        if (['running'].includes(unit._.state) === true) {
            unit._.state = 'stopped';
            unit._.children.forEach((unit) => Unit.stop(unit));

            if (isFunction(unit._.props.stop)) {
                UnitScope.execute(UnitScope.snapshot(unit), unit._.props.stop);
            }
        }
    }

    static update(unit, time) {
        if (['running'].includes(unit._.state) === true) {
            unit._.children.forEach((unit) => Unit.update(unit, time));

            if (['running'].includes(unit._.state) && isFunction(unit._.props.update) === true) {
                UnitScope.execute(UnitScope.snapshot(unit), unit._.props.update, unit._.upcount++);
            }
        }
    }

    static finalize(unit) {
        if (['finalized'].includes(unit._.state) === false) {
            unit._.state = 'finalized';

            [...unit._.children].forEach((unit) => unit.finalize());
            unit._.children.clear();

            if (isFunction(unit._.props.finalize)) {
                UnitScope.execute(UnitScope.snapshot(unit), unit._.props.finalize);
            }

            unit.off();
            UnitElement.clear(unit);
            UnitComponent.clear(unit);

            // reset props
            Object.keys(unit._.props).forEach((key) => {
                if (['start', 'update', 'stop', 'finalize'].includes(key) === false) {
                    delete unit[key];
                }
            });
            unit._.props = {};

            UnitScope.clear(unit)
        }
    }

    static reset() {
        Unit.roots.forEach((unit) => unit.finalize());
        Unit.roots.clear();

        Ticker.clear();
        Ticker.start();
        Ticker.add((time) => {
            Unit.roots.forEach((unit) => {
                Unit.start(unit, time);
                Unit.update(unit, time);
            });
        });
    }
}

Unit.reset();
