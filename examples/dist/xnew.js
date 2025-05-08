(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xnew = factory());
})(this, (function () { 'use strict';

    //----------------------------------------------------------------------------------------------------
    // type check
    //----------------------------------------------------------------------------------------------------

    function isString(value) {
        return typeof value === 'string';
    }

    function isFunction(value) {
        return typeof value === 'function';
    }

    function isObject(value) {
        return value !== null && typeof value === 'object' && value.constructor === Object;
    }

    class Ticker {
        static animation = null;
        static callbacks = [];
        static previous = Date.now();

        static clear() {
            Ticker.callbacks = [];
            Ticker.previous = Date.now();
        }

        static add(callback) {
            Ticker.callbacks.push(callback);
        }

        static start() {
            if (isFunction(requestAnimationFrame) === true && Ticker.animation === null) {
                Ticker.animation = requestAnimationFrame(Ticker.execute);
            }
        }

        static stop() {
            if (isFunction(cancelAnimationFrame) === true && Ticker.animation !== null) {
                cancelAnimationFrame(Ticker.animation);
                Ticker.animation = null;
            }
        }

        static execute() {
            const interval = 1000 / 60;
            const time = Date.now();
            if (time - Ticker.previous > interval * 0.8) {
                Ticker.callbacks.forEach((callback) => callback(time));
                Ticker.previous = time;
            }
            Ticker.animation = requestAnimationFrame(Ticker.execute);
        }
    }

    //----------------------------------------------------------------------------------------------------
    // map set
    //----------------------------------------------------------------------------------------------------

    class MapSet extends Map {
        has(key, value) {
            if (value === undefined) {
                return super.has(key);
            } else {
                return super.has(key) && super.get(key).has(value);
            }
        }

        get(key) {
            if (this.has(key) === false) {
                return new Set();
            } else {
                return super.get(key);
            }
        }

        add(key, value) {
            if (this.has(key) === false) {
                this.set(key, new Set());
            }
            this.get(key).add(value);
        }

        delete(key, value) {
            if (this.has(key, value) === false) {
                return;
            }
            this.get(key).delete(value);
            if (this.get(key).size === 0) {
                super.delete(key);
            }
        }
    }

    //----------------------------------------------------------------------------------------------------
    // map map
    //----------------------------------------------------------------------------------------------------

    class MapMap extends Map {
        has(key1, key2) {
            if (key2 === undefined) {
                return super.has(key1);
            } else {
                return super.has(key1) && super.get(key1).has(key2);
            }
        }

        set(key1, key2, value) {
            if (super.has(key1) === false) {
                super.set(key1, new Map());
            }
            super.get(key1).set(key2, value);
        }

        get(key1, key2) {
            if (super.has(key1) === false) {
                super.set(key1, new Map());
            }
            if (key2 === undefined) {
                return super.get(key1);
            } else {
                return super.get(key1).get(key2);
            }
        }

        delete(key1, key2) {
            if (super.has(key1) === false) {
                return;
            }
            super.get(key1).delete(key2);
            if (super.get(key1).size === 0) {
                super.delete(key1);
            }
        }
    }

    //----------------------------------------------------------------------------------------------------
    // map map map
    //----------------------------------------------------------------------------------------------------

    class MapMapMap extends Map {
        has(key1, key2, key3) {
            if (key2 === undefined) {
                return super.has(key1);
            } else {
                return super.has(key1) && super.get(key1).has(key2, key3);
            }
        }

        set(key1, key2, key3, value) {
            if (super.has(key1) === false) {
                super.set(key1, new MapMap());
            }
            super.get(key1).set(key2, key3, value);
        }

        get(key1, key2, key3) {
            if (super.has(key1) === false) {
                super.set(key1, new MapMap());
            }
            if (key2 === undefined) {
                return super.get(key1);
            } else {
                return super.get(key1).get(key2, key3);
            }
        }

        delete(key1, key2, key3) {
            if (super.has(key1) === false) {
                return;
            }
            super.get(key1).delete(key2, key3);
            if (super.get(key1).size === 0) {
                super.delete(key1);
            }
        }
    }

    //----------------------------------------------------------------------------------------------------
    // unit scope
    //----------------------------------------------------------------------------------------------------

    class UnitScope {
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

    class UnitComponent {
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

    class UnitEvent {
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

    class UnitPromise {
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

    class UnitElement {

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
                if (key === 'tagName') ; else if (key === 'insert') ; else if (key === 'className') {
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
                    key.replace(/([A-Z])/g, '-$1').toLowerCase();
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

    class Unit {
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
            if (unit._.resolved === false || unit._.tostart === false) ; else if (['pending', 'stopped'].includes(unit._.state) === true) {
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

                UnitScope.clear(unit);
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

    class Timer {
        constructor({ timeout, finalize = null, delay = 1, loop = false }) {
            this.timeout = timeout;
            this.finalize = finalize;
            this.delay = delay;
            this.loop = loop;

            this.id = null;
            this.time = null;
            this.offset = 0.0;

            this.status = 0;

            if (document !== undefined) {
                this.listener = () => document.hidden === false ? this._start() : this._stop();
                document.addEventListener('visibilitychange', this.listener);
            }

            this.start();
        }

        clear() {
            if (this.id !== null) {
                clearTimeout(this.id);
                this.id = null;
                this.finalize?.();
            }
            if (document !== undefined) {
                document.removeEventListener('visibilitychange', this.listener);
            }
        }

        elapsed() {
            return this.offset + (this.id !== null ? (Date.now() - this.time) : 0);
        }

        start() {
            this.status = 1;
            this._start();
        }

        stop() {
            this._stop();
            this.status = 0;
        }

        _start() {
            if (this.status === 1 && this.id === null) {
                this.id = setTimeout(() => {
                    this.timeout();

                    this.id = null;
                    this.time = null;
                    this.offset = 0.0;

                    this.loop ? this.start() : this.finalize?.();
                }, this.delay - this.offset);
                this.time = Date.now();
            }
        }

        _stop() {
            if (this.status === 1 && this.id !== null) {
                this.offset = this.offset + Date.now() - this.time;
                clearTimeout(this.id);

                this.id = null;
                this.time = null;
            }
        }
    }

    //----------------------------------------------------------------------------------------------------
    // xnew main
    //----------------------------------------------------------------------------------------------------

    function xnew(...args) {
        let parent = UnitScope.current;
        if (isFunction(args[0]) === false && args[0] instanceof Unit) {
            parent = args.shift();
        } else if (args[0] === null) {
            parent = args.shift();
        } else if (args[0] === undefined) {
            args.shift();
        }

        let target = null;
        if (args[0] instanceof Element || args[0] instanceof Window || args[0] instanceof Document) {
            // an existing html element
            target = args.shift();
        } else if (isString(args[0]) === true) {
            // a string for an existing html element
            const key = args.shift();
            target = document.querySelector(key);
            if (target == null) {
                console.error(`xnew: '${key}' can not be found.`);
            }
        } else if (isObject(args[0]) === true) {
            // an attributes for a new html element
            target = args.shift();
        } else if (args[0] === null || args[0] === undefined) {
            args.shift();
        }

        try {
            return new Unit(parent, target, ...args);
        } catch (error) {
            console.error(`xnew: ${error.message}`);
        }
    }

    //----------------------------------------------------------------------------------------------------
    // members
    //----------------------------------------------------------------------------------------------------

    Object.defineProperty(xnew, 'root', { get: () => UnitScope.current?._.root });
    Object.defineProperty(xnew, 'parent', { get: () => UnitScope.current?._.parent });
    Object.defineProperty(xnew, 'current', { get: () => UnitScope.current });

    Object.defineProperty(xnew, 'nest', { value: nest });
    Object.defineProperty(xnew, 'extend', { value: extend });

    Object.defineProperty(xnew, 'context', { value: context });
    Object.defineProperty(xnew, 'promise', { value: promise });
    Object.defineProperty(xnew, 'find', { value: find });
    Object.defineProperty(xnew, 'event', { get: () => UnitEvent.event });
    Object.defineProperty(xnew, 'emit', { value: emit });
    Object.defineProperty(xnew, 'scope', { value: scope });

    Object.defineProperty(xnew, 'timer', { value: timer });
    Object.defineProperty(xnew, 'interval', { value: interval });
    Object.defineProperty(xnew, 'transition', { value: transition });

    function nest(attributes) {
        try {
            const current = UnitScope.current;
            if (current._.state === 'pending') {
                return UnitElement.nest(current, attributes);
            } else {
                throw new Error(`This function can not be called after initialized.`);
            }
        } catch (error) {
            console.error(`xnew.nest(attributes): ${error.message}`);
        }
    }

    function extend(component, ...args) {
        try {
            const current = UnitScope.current;
            if (current._.state === 'pending') {
                return Unit.extend(current, component, ...args);
            } else {
                throw new Error(`This function can not be called after initialized.`);
            }
        } catch (error) {
            console.error(`xnew.extend(component, ...args): ${error.message}`);
        }
    }

    function context(key, value = undefined) {
        if (isString(key) === false) {
            console.error(`xnew.context(key, value?): The argument [key] is invalid.`);
        } else {
            if (value !== undefined) {
                UnitScope.push(key, value);
            } else {
                return UnitScope.trace(key);
            }
        }
    }

    function promise(mix) {
        try {
            return UnitPromise.execute(mix);
        } catch (error) {
            console.error(`xnew.promise(mix): ${error.message}`);
        }
    }

    function find(component) {
        if (isFunction(component) === false) {
            console.error(`xnew.find: The argument [component] is invalid.`);
        } else if (isFunction(component) === true) {
            return UnitComponent.find(component);
        }
    }

    function emit(type, ...args) {
        const unit = UnitScope.current;
        if (isString(type) === false) {
            console.error(`xnew.emit: The argument [type] is invalid.`);
        } else if (unit?._.state === 'finalized') {
            console.error(`xnew.emit: This function can not be called after finalized.`);
        } else {
            UnitEvent.emit(unit, type, ...args);
        }
    }

    function scope(callback) {
        const snapshot = UnitScope.snapshot();
        return (...args) => UnitScope.execute(snapshot, callback, ...args);
    }

    function timer(callback, delay) {
        const snapshot = UnitScope.snapshot();
        const unit = xnew((self) => {
            const timer = new Timer({
                timeout: () => UnitScope.execute(snapshot, callback),
                finalize: () => self.finalize(),
                delay,
            });
            return {
                finalize() {
                    timer.clear();
                }
            };
        });
        return { clear: () => unit.finalize() };
    }

    function interval(callback, delay) {
        const snapshot = UnitScope.snapshot();
        const unit = xnew((self) => {
            const timer = new Timer({
                timeout: () => UnitScope.execute(snapshot, callback),
                finalize: () => self.finalize(),
                delay,
                loop: true,
            });
            return {
                finalize() {
                    timer.clear();
                }
            };
        });
        return { clear: () => unit.finalize() };
    }

    function transition(callback, interval) {
        const snapshot = UnitScope.snapshot();
        const unit = xnew((self) => {
            const timer = new Timer({
                timeout: () => UnitScope.execute(snapshot, callback, 1.0),
                finalize: () => self.finalize(),
                delay: interval,
            });

            UnitScope.execute(snapshot, callback, 0.0);

            const updater = xnew(null, (self) => {
                return {
                    update() {
                        const progress = timer.elapsed() / interval;
                        if (progress < 1.0) {
                            UnitScope.execute(snapshot, callback, progress);
                        }
                    },
                }
            });
            return {
                finalize() {
                    timer.clear();
                    updater.finalize();
                }
            };
        });

        return { clear: () => unit.finalize() };
    }

    function ResizeEvent(self) {
        const observer = new ResizeObserver(xnew.scope((entries) => {
            for (const entry of entries) {
                xnew.emit('-resize');
                break;
            }
        }));

        if (self.element) {
            observer.observe(self.element);
        }
        return {
            finalize() {
                if (self.element) {
                    observer.unobserve(self.element);
                }
            }
        }
    }

    function UserEvent(self) {
        const unit = xnew();
        unit.on('pointerdown', (event) => xnew.emit('-pointerdown', { event, position: getPosition(self.element, event) }));
        unit.on('pointermove', (event) => xnew.emit('-pointermove', { event, position: getPosition(self.element, event) }));
        unit.on('pointerup', (event) => xnew.emit('-pointerup', { event, position: getPosition(self.element, event) }));
        unit.on('wheel', (event) => xnew.emit('-wheel', { event, delta: { x: event.wheelDeltaX, y: event.wheelDeltaY } }));

        const drag = xnew(DragEvent);
        drag.on('-dragstart', (...args) => xnew.emit('-dragstart', ...args));
        drag.on('-dragmove', (...args) => xnew.emit('-dragmove', ...args));
        drag.on('-dragend', (...args) => xnew.emit('-dragend', ...args));
        drag.on('-dragcancel', (...args) => xnew.emit('-dragcancel', ...args));

        const gesture = xnew(GestureEvent);
        gesture.on('-gesturestart', (...args) => xnew.emit('-gesturestart', ...args));
        gesture.on('-gesturemove', (...args) => xnew.emit('-gesturemove', ...args));
        gesture.on('-gestureend', (...args) => xnew.emit('-gestureend', ...args));
        gesture.on('-gesturecancel', (...args) => xnew.emit('-gesturecancel', ...args));  
        
        const keyborad = xnew(Keyboard);
        keyborad.on('-keydown', (...args) => xnew.emit('-keydown', ...args));
        keyborad.on('-keyup', (...args) => xnew.emit('-keyup', ...args));
        keyborad.on('-arrowkeydown', (...args) => xnew.emit('-arrowkeydown', ...args));
        keyborad.on('-arrowkeyup', (...args) => xnew.emit('-arrowkeyup', ...args));
    }

    function DragEvent(self) {
        xnew().on('pointerdown', (event) => {
            const id = event.pointerId;
            const position = getPosition(self.element, event);
            let previous = position;

            const win = xnew(window);
            win.on('pointermove', (event) => {
                if (event.pointerId === id) {
                    const position = getPosition(self.element, event);
                    const movement = { x: position.x - previous.x, y: position.y - previous.y };
                    xnew.emit('-dragmove', { event, position, movement });
                    previous = position;
                }
            });
            win.on('pointerup', (event) => {
                if (event.pointerId === id) {
                    const position = getPosition(self.element, event);
                    xnew.emit('-dragend', { event, position, });
                    win.finalize();
                }
            });
            win.on('pointercancel', (event) => {
                if (event.pointerId === id) {
                    const position = getPosition(self.element, event);
                    xnew.emit('-dragcancel', { event, position, });
                    win.finalize();
                }
            });
            xnew.emit('-dragstart', { event, position });
        });
    }

    function GestureEvent(self) {
        const drag = xnew(DragEvent);

        let isActive = false;
        const map = new Map();

        drag.on('-dragstart', ({ event, position }) => {
            map.set(event.pointerId, { ...position });

            isActive = map.size === 2 ? true : false;
            if (isActive === true) {
                xnew.emit('-gesturestart', {});
            }
        });

        drag.on('-dragmove', ({ event, position, movement }) => {
            if (isActive === true) {
                const a = map.get(event.pointerId);
                const b = getOthers(event.pointerId)[0];

                let scale = 0.0;
                {
                    const v = { x: a.x - b.x, y: a.y - b.y };
                    const s = v.x * v.x + v.y * v.y;
                    scale = 1 + (s > 0.0 ? (v.x * movement.x + v.y * movement.y) / s : 0);
                }
                {
                    const c = { x: a.x + movement.x, y: a.y + movement.y };
                    ({ x: a.x - b.x, y: a.y - b.y });
                    ({ x: c.x - b.x, y: c.y - b.y });
                }

                xnew.emit('-gesturemove', { event, position, movement, scale });
            }
            map.set(event.pointerId, position);
        });

        drag.on('-dragend', ({ event }) => {
            if (isActive === true) {
                xnew.emit('-gesturemend', { event });
            }
            isActive = false;
            map.delete(event.pointerId);
        });

        drag.on('-dragcancel', ({ event }) => {
            if (isActive === true) {
                xnew.emit('-gesturecancel', { event });
            }
            isActive = false;
            map.delete(event.pointerId);
        });

        function getOthers(id) {
            const backup = map.get(id);
            map.delete(id);
            const others = [...map.values()];
            map.set(id, backup);
            return others;
        }
    }

    function Keyboard(self) {
        const state = {};

        const win = xnew(window);
        win.on('keydown', (event) => {
            state[event.code] = 1;
            xnew.emit('-keydown', { event, code: event.code });
        });
        win.on('keyup', (event) => {
            state[event.code] = 0;
            xnew.emit('-keyup', { event, code: event.code });
        });
        win.on('keydown', (event) => {
            xnew.emit('-arrowkeydown', { event, code: event.code, vector: getVector() });
        });
        win.on('keyup', (event) => {
            xnew.emit('-arrowkeyup', { event, code: event.code, vector: getVector() });
        });

        function getVector() {
            return {
                x: (state['ArrowLeft'] ? -1 : 0) + (state['ArrowRight'] ? +1 : 0),
                y: (state['ArrowUp'] ? -1 : 0) + (state['ArrowDown'] ? +1 : 0)
            };
        }
    }

    function getPosition(element, event) {
        const rect = element.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function Screen(self, { width = 640, height = 480, fit = 'contain' } = {}) {
        const wrapper = xnew.nest({
            style: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }
        });
        const absolute = xnew.nest({
            style: { position: 'absolute', margin: 'auto' } 
        });

        const canvas = xnew({
            tagName: 'canvas', width, height,
            style: { width: '100%', height: '100%', verticalAlign: 'bottom' }
        });

        const observer = xnew(wrapper, ResizeEvent);
        observer.on('-resize', resize);
        resize();

        function resize() {
            const aspect = canvas.element.width / canvas.element.height;
            const style = { width: '100%', height: '100%', top: 0, left: 0, bottom: 0, right: 0 };
            
            if (fit === 'contain') {
                if (wrapper.clientWidth < wrapper.clientHeight * aspect) {
                    style.height = Math.floor(wrapper.clientWidth / aspect) + 'px';
                } else {
                    style.width = Math.floor(wrapper.clientHeight * aspect) + 'px';
                }
            } else if (fit === 'cover') {
                if (wrapper.clientWidth < wrapper.clientHeight * aspect) {
                    style.width = Math.floor(wrapper.clientHeight * aspect) + 'px';
                    style.left = Math.floor((wrapper.clientWidth - wrapper.clientHeight * aspect) / 2) + 'px';
                    style.right = 'auto';
                } else {
                    style.height = Math.floor(wrapper.clientWidth / aspect) + 'px';
                    style.top = Math.floor((wrapper.clientHeight - wrapper.clientWidth / aspect) / 2) + 'px';
                    style.bottom = 'auto';
                }
            } else ;
            Object.assign(absolute.style, style);
        }

        return {
            get canvas() {
                return canvas.element;
            },
            resize(width, height) {
                canvas.element.width = width;
                canvas.element.height = height;
                resize();
            },
            get scale() {
                return { x: canvas.element.width / canvas.element.clientWidth, y: canvas.element.height / canvas.element.clientHeight };
            }
        }
    }

    function Modal(self, {} = {}) {
        xnew.nest({
            style: {
                position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            },
        });
        
        xnew().on('click', () => {
            self.close();
        });

        xnew.nest({});

        xnew().on('click', (event) => {
            event.stopPropagation(); 
        });

        return {
            close() {
                self.finalize();
            }
        }
    }

    function Accordion(self, { status = 'open', duration = 200, easing = 'ease-in-out' } = {}) {
        const outer = xnew.nest({ style: { display: status === 'open' ? 'block' : 'none', overflow: 'hidden', }});
        const inner = xnew.nest({ style: { padding: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' } });
         
        let transition = false;
        return {
            get status() {
                return status;
            },
            open() {
                if (transition === false) {
                    transition = true;
                    status = 'open';
                    outer.style.display = 'block';
                    xnew.transition((progress) => {
                        outer.style.height = inner.offsetHeight * process(progress) + 'px';
                        outer.style.opacity = process(progress);
                        if (progress === 1) {
                            outer.style.height = 'auto';
                            transition = false;
                        }
                    }, duration);
                }
            },
            close() {
                if (transition === false) {
                    transition = true;
                    xnew.transition((progress) => {
                        outer.style.height = inner.offsetHeight * (1 - process(progress)) + 'px';
                        outer.style.opacity = 1 - process(progress);
                        if (progress === 1) {
                            status = 'closed';
                            outer.style.display = 'none';
                            outer.style.height = '0px';
                            transition = false;
                        }
                    }, duration);
                }
            },
            toggle() {
                status === 'open' ? self.close() : self.open();
            },
        };
        function process(progress) {
            if (easing === 'ease-out') {
                return Math.pow((1.0 - Math.pow((1.0 - progress), 2.0)), 0.5);
            } else if (easing === 'ease-in') {
                return Math.pow((1.0 - Math.pow((1.0 - progress), 0.5)), 2.0);
            } else if (easing === 'ease-in-out') {
                return - (Math.cos(progress * Math.PI) - 1.0) / 2.0;
            } else {
                return progress;
            }
        }
    }

    Object.defineProperty(xnew, 'Screen', { enumerable: true, value: Screen });
    Object.defineProperty(xnew, 'UserEvent', { enumerable: true, value: UserEvent });
    Object.defineProperty(xnew, 'ResizeEvent', { enumerable: true, value: ResizeEvent });
    Object.defineProperty(xnew, 'Modal', { enumerable: true, value: Modal });
    Object.defineProperty(xnew, 'Accordion', { enumerable: true, value: Accordion });

    return xnew;

}));
