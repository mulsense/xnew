import { isObject, isNumber, isString, isFunction, error } from '../common';
import { createElement } from './element';
import { Ticker } from './ticker';
import { UnitEvent } from './event';
import { UnitScope } from './scope';
import { UnitComponent } from './component';

export class Unit {
    constructor(parent, target, component, ...args) {
        if (!(parent === null || parent instanceof Unit)) {
            error(`unit constructor: The argument [parent] is invalid.`);
        }
        if (!(target === null || isObject(target) === true || target instanceof Element || target instanceof Window || target instanceof Document)) {
            error(`unit constructor: The argument [target] is invalid.`);
        }
        if (!(component === undefined || isFunction(component) === true || (isObject(target) === true && isString(component) === true))) {
            error(`unit constructor: The argument [component] is invalid.`);
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
        Unit.initialize.call(this, component, ...args);
    }

    //----------------------------------------------------------------------------------------------------
    // base system 
    //----------------------------------------------------------------------------------------------------

    get element() {
        return this._.nestElements.slice(-1)[0] ?? this._.baseElement;
    }

    start() {
        this._.tostart = true;
    }

    stop() {
        this._.tostart = false;
        Unit.stop.call(this);
    }

    finalize() {
        Unit.stop.call(this);
        Unit.finalize.call(this);
        (this._.parent?._.children ?? Unit.roots).delete(this);
    }

    reboot() {
        Unit.stop.call(this);
        Unit.finalize.call(this);
        Unit.initialize.call(this, this._.component, ...this._.args);
    }

    on(type, listener, options) {
        if (isString(type) === false || type.trim() === '') {
            error(`unit.on: The argument [type] is invalid.`);
        } else if (isFunction(listener) === false) {
            error(`unit.on: The argument [listener] is invalid.`);
        } else {
            UnitEvent.on(this, type, listener, options);
        }
    }

    off(type, listener) {
        if (type !== undefined && (isString(type) === false || type.trim() === '')) {
            error(`unit.off: The argument [type] is invalid.`);
        } else if (listener !== undefined && isFunction(listener) === false) {
            error(`unit.off: The argument [listener] is invalid.`);
        } else {
            UnitEvent.off(this, type, listener);
        }
    }

    static autoincrement = 0; // auto increment id
    
    static roots = new Set();   // root units

    static initialize(component, ...args) {
        this._ = Object.assign(this._, {
            children: new Set(),       // children units
            nestElements: [],          // nest elements
            state: 'pending',          // [pending -> running <-> stopped -> finalized]
            tostart: false,            // flag for start
            upcount: 0,                // update count    
            promises: [],              // promises
            resolved: false,           // promise check
            props: {},                 // properties in the component function
        });

        UnitScope.context(this, this._.baseContext);

        if (this._.parent !== null && ['finalized'].includes(this._.parent._.state)) {
            this._.state = 'finalized';
        } else {
            this._.tostart = true;

            // nest html element
            if (isObject(this._.target) === true && this.element instanceof Element) {
                Unit.nest.call(this, this._.target);
            }

            // setup component
            if (isFunction(component) === true) {
                UnitScope.execute({ unit: this }, () => Unit.extend.call(this, component, ...args));
            } else if (isObject(this._.target) === true && isString(component) === true) {
                this.element.innerHTML = component;
            }

            // whether the unit promise was resolved
            const promise = this._.promises.length > 0 ? Promise.all(this._.promises) : Promise.resolve();
            promise.then((response) => { this._.resolved = true; return response; });
        }
    }

    static nest(attributes) {
        const element = createElement(attributes, this.element);
        this.element.append(element);
        this._.nestElements.push(element);
        return element;
    }

    static extend(component, ...args) {
        UnitComponent.add(this, component);

        const props = component(this, ...args) ?? {};

        Object.keys(props).forEach((key) => {
            const descripter = Object.getOwnPropertyDescriptor(props, key);
            if (['start', 'update', 'stop', 'finalize'].includes(key)) {
                if (isFunction(descripter.value)) {
                    const previous = this._.props[key];
                    if (previous !== undefined) {
                        this._.props[key] = (...args) => { previous(...args); descripter.value(...args); };
                    } else {
                        this._.props[key] = (...args) => { descripter.value(...args); };
                    }
                } else {
                    error(`unit.extend: The property [${key}] is invalid.`);
                }
            } else if (this[key] === undefined) {
                const dest = { configurable: true, enumerable: true };
                const snapshot = UnitScope.snapshot(this);
                if (isFunction(descripter.value) === true) {
                    dest.value = (...args) => UnitScope.execute(snapshot, descripter.value, ...args);
                } else if (descripter.value !== undefined) {
                    dest.writable = true;
                    dest.value = descripter.value;
                }
                if (isFunction(descripter.get) === true) {
                    dest.get = (...args) => UnitScope.execute(snapshot, descripter.get, ...args);
                }
                if (isFunction(descripter.set) === true) {
                    dest.set = (...args) => UnitScope.execute(snapshot, descripter.set, ...args);
                }
                Object.defineProperty(this._.props, key, dest);
                Object.defineProperty(this, key, dest);
            } else {
                error(`unit.extend: The property [${key}] already exists.`);
            }
        });
    }

    static start(time) {
        if (this._.resolved === false || this._.tostart === false) {
        } else if (['pending', 'stopped'].includes(this._.state) === true) {
            this._.state = 'running';
            this._.children.forEach((unit) => Unit.start.call(unit, time));
            if (isFunction(this._.props.start) === true) {
                UnitScope.execute(UnitScope.snapshot(this), this._.props.start);
            }
        } else if (['running'].includes(this._.state) === true) {
            this._.children.forEach((unit) => Unit.start.call(unit, time));
        }
    }

    static stop() {
        if (['running'].includes(this._.state) === true) {
            this._.state = 'stopped';
            this._.children.forEach((unit) => Unit.stop.call(unit));

            if (isFunction(this._.props.stop)) {
                UnitScope.execute(UnitScope.snapshot(this), this._.props.stop);
            }
        }
    }

    static update(time) {
        if (['running'].includes(this._.state) === true) {
            this._.children.forEach((unit) => Unit.update.call(unit, time));

            if (['running'].includes(this._.state) && isFunction(this._.props.update) === true) {
                UnitScope.execute(UnitScope.snapshot(this), this._.props.update, this._.upcount++);
            }
        }
    }

    static finalize() {
        if (['finalized'].includes(this._.state) === false) {
            this._.state = 'finalized';

            [...this._.children].forEach((unit) => unit.finalize());
            this._.children.clear();

            if (isFunction(this._.props.finalize)) {
                UnitScope.execute(UnitScope.snapshot(this), this._.props.finalize);
            }
            UnitComponent.clear(this);

            // reset props
            Object.keys(this._.props).forEach((key) => {
                if (['start', 'update', 'stop', 'finalize'].includes(key) === false) {
                    delete this[key];
                }
            });
            this._.props = {};

            this.off();
            UnitScope.clear(this)

            if (this._.nestElements.length > 0) {
                this._.baseElement.removeChild(this._.nestElements[0]);
                this._.nestElements = [];
            }
        }
    }

    static reset() {
        Unit.roots.forEach((unit) => unit.finalize());
        Unit.roots.clear();

        Ticker.clear();
        Ticker.start();
        Ticker.add((time) => {
            Unit.roots.forEach((unit) => {
                Unit.start.call(unit, time);
                Unit.update.call(unit, time);
            });
        });
    }
}

Unit.reset();
