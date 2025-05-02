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

    //----------------------------------------------------------------------------------------------------
    // error 
    //----------------------------------------------------------------------------------------------------

    function error(name, text, target = undefined) {
        const message = name + (target !== undefined ? ` [${target}]` : '') + ': ' + text;
        console.error(message);
    }

    //----------------------------------------------------------------------------------------------------
    // create element from attributes
    //----------------------------------------------------------------------------------------------------

    function createElement(attributes, parentElement = null) {
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

    class Ticker {
        static animation = null;
        static callbacks = [];
        static previous = Date.now();

        static clear() {
            Ticker.callbacks = [];
            Ticker.previous = Date.now();
        }

        static push(callback) {
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

    class UnitScope {
        static current = null;

        static execute(unit, context, func, ...args) {
            const stack = [UnitScope.current, UnitScope.context(unit)];

            try {
                UnitScope.current = unit;
                if (unit && context !== undefined) {
                    UnitScope.context(unit, context);
                }
                return func(...args);
            } catch (error) {
                throw error;
            } finally {
                UnitScope.current = stack[0];
                if (unit && context !== undefined) {
                    UnitScope.context(unit, stack[1]);
                }
            }
        }
        
        static map = new Map();

        static context(unit, context = undefined) {
            if (context !== undefined) {
                UnitScope.map.set(unit, context);
            } else {
                return UnitScope.map.get(unit) ?? null;
            }
        }

        static get snapshot() {
            return { unit: UnitScope.current, context: UnitScope.context(UnitScope.current) };
        }

        static clear(unit) {
            UnitScope.map.delete(unit);
        }

        static next(key, value) {
            const unit = UnitScope.current;
            UnitScope.map.set(unit, [UnitScope.map.get(unit), key, value]);
        }

        static trace(key) {
            const unit = UnitScope.current;
            let ret = undefined;
            for (let context = UnitScope.map.get(unit); context !== null; context = context[0]) {
                if (context[1] === key) {
                    ret = context[2];
                    break;
                }
            }
            return ret;
        }
    }

    class ScopedPromise extends Promise {
        then(callback) {
            const snapshot = UnitScope.snapshot;
            super.then((...args) => UnitScope.execute(snapshot.unit, snapshot.context, callback, ...args));
            return this;
        }

        catch(callback) {
            const snapshot = UnitScope.snapshot;
            super.then((...args) => UnitScope.execute(snapshot.unit, snapshot.context, callback, ...args));
            return this;
        }

        finally(callback) {
            const snapshot = UnitScope.snapshot;
            super.then((...args) => UnitScope.execute(snapshot.unit, snapshot.context, callback, ...args));
            return this;
        }
    }

    class UnitEvent {
        static event = null;

        static typeToUnits = new MapSet();

        static unitToListeners = new MapMapMap();

        static on(unit, type, listener, options) {
            const listeners = UnitEvent.unitToListeners.get(unit);
            const snapshot = UnitScope.snapshot;

            type.trim().split(/\s+/).forEach((type) => internal(type, listener));
            function internal(type, listener) {
                if (listeners.has(type, listener) === false) {
                    const element = unit.element;
                    if (type[0] === '-' || type[0] === '+') {
                        const execute = (...args) => {
                            const eventbackup = UnitEvent.event;
                            UnitEvent.event = { type };
                            UnitScope.execute(snapshot.unit, snapshot.context, listener, ...args);
                            UnitEvent.event = eventbackup;
                        };
                        listeners.set(type, listener, [element, execute]);
                    } else {
                        const execute = (...args) => {
                            const eventbackup = UnitEvent.event;
                            UnitEvent.event = { type: args[0]?.type ?? null };
                            UnitScope.execute(snapshot.unit, snapshot.context, listener, ...args);
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
            const listeners = UnitEvent.unitToListeners.get(unit);
           
            if (isString(type) === true && listener !== undefined) {
                type.trim().split(/\s+/).forEach((type) => internal.call(unit, type, listener));
            } else if (isString(type) === true && listener === undefined) {
                type.trim().split(/\s+/).forEach((type) => {
                    listeners.get(type)?.forEach((_, listener) => internal.call(unit, type, listener));
                });
            } else if (type === undefined) {
                listeners.forEach((map, type) => {
                    map.forEach((_, listener) => internal.call(unit, type, listener));
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

    class UnitComponent {
        static componentToUnits = new MapSet();
        static unitToComponents = new MapSet();

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

        static find(base, component) {
            if (base !== null) {
                return [...UnitComponent.componentToUnits.get(component)].filter((unit) => {
                    for (let temp = unit; temp !== null; temp = temp.parent) {
                        if (temp === base) {
                            return true;
                        }
                    }
                    return false;
                });
            } else {
                return [...UnitComponent.componentToUnits.get(component)];
            }
        }
    }

    class Unit {
        constructor(parent, target, component, ...args) {
            let baseElement = null;
            if (target instanceof Element || target instanceof Window || target instanceof Document) {
                baseElement = target;
            } else if (parent !== null) {
                baseElement = parent.element;
            } else if (document instanceof Document) {
                baseElement = document.currentScript?.parentElement ?? document.body;
            }

            const baseContext = UnitScope.context(parent);
            const root = parent?._.root ?? this;

            this._ = {
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

        get parent() {
            return this._.parent;
        }

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
                error('unit on', 'The argument is invalid.', 'type');
            } else if (isFunction(listener) === false) {
                error('unit on', 'The argument is invalid.', 'listener');
            } else {
                UnitEvent.on(this, type, listener, options);
            }
        }

        off(type, listener) {
            if (type !== undefined && (isString(type) === false || type.trim() === '')) {
                error('unit off', 'The argument is invalid.', 'type');
            } else if (listener !== undefined && isFunction(listener) === false) {
                error('unit off', 'The argument is invalid.', 'listener');
            } else {
                UnitEvent.off(this, type, listener);
            }
        }

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

            if (this.parent !== null && ['finalized'].includes(this.parent._.state)) {
                this._.state = 'finalized';
            } else {
                this._.tostart = true;

                // nest html element
                if (isObject(this._.target) === true && this.element instanceof Element) {
                    Unit.nest.call(this, this._.target);
                }

                // setup component
                if (isFunction(component) === true) {
                    UnitScope.execute(this, undefined, () => Unit.extend.call(this, component, ...args));
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
                        error('unit extend', 'The property is invalid.', key);
                    }
                } else if (this[key] === undefined) {
                    const dest = { configurable: true, enumerable: true };
                    const context = UnitScope.context(this);
                    if (isFunction(descripter.value) === true) {
                        dest.value = (...args) => UnitScope.execute(this, context, descripter.value, ...args);
                    } else if (descripter.value !== undefined) {
                        dest.writable = true;
                        dest.value = descripter.value;
                    }
                    if (isFunction(descripter.get) === true) {
                        dest.get = (...args) => UnitScope.execute(this, context, descripter.get, ...args);
                    }
                    if (isFunction(descripter.set) === true) {
                        dest.set = (...args) => UnitScope.execute(this, context, descripter.set, ...args);
                    }
                    Object.defineProperty(this._.props, key, dest);
                    Object.defineProperty(this, key, dest);
                } else {
                    error('unit extend', 'The property already exists.', key);
                }
            });
        }

        static start(time) {
            if (this._.resolved === false || this._.tostart === false) ; else if (['pending', 'stopped'].includes(this._.state) === true) {
                this._.state = 'running';
                this._.children.forEach((unit) => Unit.start.call(unit, time));
                if (isFunction(this._.props.start) === true) {
                    UnitScope.execute(this, UnitScope.context(this), this._.props.start);
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
                    UnitScope.execute(this, UnitScope.context(this), this._.props.stop);
                }
            }
        }

        static update(time) {
            if (['running'].includes(this._.state) === true) {
                this._.children.forEach((unit) => Unit.update.call(unit, time));

                if (['running'].includes(this._.state) && isFunction(this._.props.update) === true) {
                    UnitScope.execute(this, UnitScope.context(this), this._.props.update, this._.upcount++);
                }
            }
        }

        static finalize() {
            if (['finalized'].includes(this._.state) === false) {
                this._.state = 'finalized';

                [...this._.children].forEach((unit) => unit.finalize());
                this._.children.clear();

                if (isFunction(this._.props.finalize)) {
                    UnitScope.execute(this, UnitScope.context(this), this._.props.finalize);
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
                UnitScope.clear(this);

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
            Ticker.push((time) => {
                Unit.roots.forEach((unit) => {
                    Unit.start.call(unit, time);
                    Unit.update.call(unit, time);
                });
            });
        }
    }
    Unit.reset();

    class Timer {
        constructor({ timeout, finalize = null, delay = 0, loop = false }) {
            this.timeout = timeout;
            this.finalize = finalize;
            this.delay = delay;
            this.loop = loop;

            this.id = null;
            this.time = null;
            this.offset = 0.0;

            this.status = 0;

            this.listener = (event) => {
                document.hidden === false ? this._start() : this._stop();
            };
            if (document !== undefined) {
                document.addEventListener('visibilitychange', this.listener);
            }
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

                    if (this.loop) {
                        this.start();
                    } else {
                        this.finalize?.();
                    }
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

    function xnew(...args) {
        let parent = undefined;
        if (isFunction(args[0]) === false && args[0] instanceof Unit) {
            parent = args.shift();
        } else if (args[0] === null) {
            parent = args.shift();
        } else if (args[0] === undefined) {
            parent = args.shift();
            parent = UnitScope.current;
        } else {
            parent = UnitScope.current;
        }

        // input target
        let target = undefined;
        if (args[0] instanceof Element || args[0] instanceof Window || args[0] instanceof Document) {
            // an existing html element
            target = args.shift();
        } else if (isString(args[0]) === true) {
            // a string for an existing html element
            const name = args.shift();
            target = document.querySelector(name);
            if (target == null) {
                error('xnew', `'${name}' can not be found.`, 'target');
            }
        } else if (isObject(args[0]) === true) {
            // an attributes for a new html element
            target = args.shift();
        } else if (args[0] === null || args[0] === undefined) {
            target = args.shift();
            target = null;
        } else {
            target = undefined;
        }

        if (args.length > 0 && isObject(target) === false && isString(args[0]) === true) {
            error('xnew', 'The argument is invalid.', 'component');
        } else {
            return new Unit(parent, target, ...args);
        }
    }

    Object.defineProperty(xnew, 'nest', { enumerable: true, value: nest });
    Object.defineProperty(xnew, 'extend', { enumerable: true, value: extend });

    Object.defineProperty(xnew, 'root', { enumerable: true, get: () => UnitScope.current?._.root });
    Object.defineProperty(xnew, 'parent', { enumerable: true, get: () => UnitScope.current?._.parent });
    Object.defineProperty(xnew, 'current', { enumerable: true, get: () => UnitScope.current });

    Object.defineProperty(xnew, 'context', { enumerable: true, value: context });
    Object.defineProperty(xnew, 'promise', { enumerable: true, value: promise });
    Object.defineProperty(xnew, 'find', { enumerable: true, value: find });
    Object.defineProperty(xnew, 'event', { enumerable: true, get: () => UnitEvent.event });
    Object.defineProperty(xnew, 'emit', { enumerable: true, value: emit });
    Object.defineProperty(xnew, 'scope', { enumerable: true, value: scope });

    Object.defineProperty(xnew, 'timer', { enumerable: true, value: timer });
    Object.defineProperty(xnew, 'interval', { enumerable: true, value: interval });
    Object.defineProperty(xnew, 'transition', { enumerable: true, value: transition });

    function nest(attributes) {
        if (UnitScope.current.element instanceof Window || UnitScope.current.element instanceof Document) {
            error('xnew.nest', 'No elements are added to window or document.');
        } else if (isObject(attributes) === false) {
            error('xnew.nest', 'The argument is invalid.', 'attributes');
        } else if (UnitScope.current._.state !== 'pending') {
            error('xnew.nest', 'This function can not be called after initialized.');
        } else {
            return Unit.nest.call(UnitScope.current, attributes);
        }
    }

    function extend(component, ...args) {
        if (isFunction(component) === false) {
            error('xnew.extend', 'The argument is invalid.', 'component');
        } else if (UnitScope.current._.state !== 'pending') {
            error('xnew.extend', 'This function can not be called after initialized.');
        }  else {
            return Unit.extend.call(UnitScope.current, component, ...args);
        }
    }

    function context(key, value = undefined) {
        if (isString(key) === false) {
            error('context', 'The argument is invalid.', 'key');
        } else {
            if (value !== undefined) {
                UnitScope.next(key, value);
            } else {
                return UnitScope.trace(key);
            }
        }
    }

    function promise(data) {
        let promise = null;
        if (data instanceof Promise) {
            promise = data;
        } else if (data instanceof Unit) {
            promise = data._.promises.length > 0 ? Promise.all(data._.promises) : Promise.resolve();
        } else {
            error('unit promise', 'The property is invalid.', data);
        }
        if (promise) {
            const scopedpromise = new ScopedPromise((resolve, reject) => {
                promise.then((...args) => resolve(...args)).catch((...args) => reject(...args));
            });
            const unit = UnitScope.current;
            unit._.promises.push(promise);
            return scopedpromise;
        }
    }

    function find(...args) {
        let base = null;
        if (args[0] === null || args[0] instanceof Unit) {
            base = args.shift();
        }
        const component = args[0];

        if (isFunction(component) === false) {
            error('xnew.find', 'The argument is invalid.', 'component');
        } else if (isFunction(component) === true) {
            return UnitComponent.find(base, component);
        }
    }

    function emit(type, ...args) {
        const unit = UnitScope.current;
        if (isString(type) === false) {
            error('xnew.emit', 'The argument is invalid.', 'type');
        } else if (unit?._.state === 'finalized') {
            error('xnew.emit', 'This function can not be called after finalized.');
        } else {
            UnitEvent.emit(unit, type, ...args);
        }
    }

    function scope(callback) {
        const snapshot = UnitScope.snapshot;
        return (...args) => {
            UnitScope.execute(snapshot.unit, snapshot.context, callback, ...args);
        };
    }

    function timer(callback, delay) {
        let finalizer = null;

        const snapshot = UnitScope.snapshot;
        const timer = new Timer({
            timeout: () => UnitScope.execute(snapshot.unit, snapshot.context, callback),
            finalize: () => finalizer.finalize(),
            delay,
        });

        timer.start();

        finalizer = xnew(snapshot.unit, (self) => {
            return {
                finalize() {
                    timer.clear();
                }
            }
        });

        return { clear: () => timer.clear() };
    }

    function interval(callback, delay) {
        let finalizer = null;

        const snapshot = UnitScope.snapshot;
        const timer = new Timer({
            timeout: () => UnitScope.execute(snapshot.unit, snapshot.context, callback),
            finalize: () => finalizer.finalize(),
            delay,
            loop: true,
        });

        timer.start();

        finalizer = xnew(snapshot.unit, (self) => {
            return {
                finalize() {
                    timer.clear();
                }
            }
        });

        return { clear: () => timer.clear() };
    }

    function transition(callback, interval) {
        let finalizer = null;
        let updater = null;

        const snapshot = UnitScope.snapshot;
        const timer = new Timer({
            timeout: () => UnitScope.execute(snapshot.unit, snapshot.context, callback, { progress: 1.0 }),
            finalize: () => finalizer.finalize(),
            delay: interval,
        });
        const clear = function () {
            timer.clear();
        };

        timer.start();

        UnitScope.execute(snapshot.unit, snapshot.context, callback, { progress: 0.0 });

        updater = xnew(null, (self) => {
            return {
                update() {
                    const progress = timer.elapsed() / interval;
                    if (progress < 1.0) {
                        UnitScope.execute(snapshot.unit, snapshot.context, callback, { progress });
                    }
                },
            }
        });

        finalizer = xnew(snapshot.unit, (self) => {
            return {
                finalize() {
                    timer.clear();
                    updater.finalize();
                }
            }
        });

        return { clear };
    }

    function DragEvent(self) {
        xnew().on('pointerdown', (event) => {
            const id = event.pointerId;
            const rect = self.element.getBoundingClientRect();
            const position = getPosition(event, rect);
            let previous = position;

            const win = xnew(window);

            win.on('pointermove', (event) => {
                if (event.pointerId === id) {
                    const position = getPosition(event, rect);
                    const movement = { x: position.x - previous.x, y: position.y - previous.y };
                    xnew.emit('-move', { event, position, movement });
                    previous = position;
                }
            });

            win.on('pointerup pointercancel', (event) => {
                if (event.pointerId === id) {
                    const position = getPosition(event, rect);

                    if (event.type === 'pointerup') {
                        xnew.emit('-up', { event, position, });
                    } else if (event.type === 'pointercancel') {
                        xnew.emit('-cancel', { event, position, });
                    }
                    win.finalize();
                }
            });

            xnew.emit('-down', { event, position });
        });

        function getPosition(event, rect) {
            return { x: event.clientX - rect.left, y: event.clientY - rect.top };
        }
    }

    function GestureEvent(self) {
        const drag = xnew(DragEvent);

        let isActive = false;
        const map = new Map();

        drag.on('-down', ({ event, position }) => {
            map.set(event.pointerId, { ...position });

            isActive = map.size === 2 ? true : false;
            if (isActive === true) {
                xnew.emit('-down', {});
            }
        });

        drag.on('-move', ({ event, position, movement }) => {
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

                xnew.emit('-move', { scale });
            }
            map.set(event.pointerId, position);
        });

        drag.on('-up -cancel', ({ event }) => {
            if (isActive === true) {
                xnew.emit('-up', {});
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

    function PointerEvent(self) {

        const unit = xnew();
        unit.on('pointermove', (event) => {
            event.pointerId;
            const rect = self.element.getBoundingClientRect();
            const position = getPosition(event, rect);
            xnew.emit('-pointermove', { event, position });
        });
        unit.on('wheel', (event) => {
            const delta = { x: event.wheelDeltaY, y: event.wheelDeltaY };
            xnew.emit('-wheel', { event, delta });
        });
        unit.on('pointerdown', (event) => {
            event.pointerId;
            const rect = self.element.getBoundingClientRect();
            const position = getPosition(event, rect);
            xnew.emit('-pointerdown', { event, position });
        });
        unit.on('pointerup', (event) => {
            event.pointerId;
            const rect = self.element.getBoundingClientRect();
            const position = getPosition(event, rect);
            xnew.emit('-pointerup', { event, position });
        });
        const gesture = xnew(GestureEvent);
        gesture.on('-down', (...args) => {
            xnew.emit('-gesturestart', ...args);
        });
        gesture.on('-move', (...args) => {
            xnew.emit('-gesturemove', ...args);
        });
        gesture.on('-up', (...args) => {
            xnew.emit('-gestureend', ...args);
        });
        gesture.on('-cancel', (...args) => {
            xnew.emit('-gesturecancel', ...args);
        });  

        const drag = xnew(DragEvent);
        drag.on('-down', (...args) => xnew.emit('-dragstart', ...args));
        drag.on('-move', (...args) => xnew.emit('-dragmove', ...args));
        drag.on('-up', (...args) => xnew.emit('-dragend', ...args));
        drag.on('-cancel', (...args) => xnew.emit('-dragcancel', ...args));

        function getPosition(event, rect) {
            return { x: event.clientX - rect.left, y: event.clientY - rect.top };
        }
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
    }

    function Keyboard(self) {
        const win = xnew(window);
        const state = {};

        win.on('keydown', (event) => {
            if (event.repeat === true) return;
            state[event.code] = 1;
            xnew.emit('-keydown', { code: event.code });
        });

        win.on('keyup', (event) => {
            if (state[event.code]) state[event.code] = 0;
            xnew.emit('-keyup', { code: event.code });
        });

        win.on('keydown', (event) => {
            if (event.repeat === true) return;
            xnew.emit('-arrowkeydown', { code: event.code, vector: getVector() });
        });

        win.on('keyup', (event) => {
            if (event.repeat === true) return;
            xnew.emit('-arrowkeyup', { code: event.code, vector: getVector() });
        });

        function getVector() {
            return {
                x: (getKey('ArrowLeft') ? -1 : 0) + (getKey('ArrowRight') ? +1 : 0),
                y: (getKey('ArrowUp') ? -1 : 0) + (getKey('ArrowDown') ? +1 : 0)
            };
        }
        function getKey(code) {
            return state[code] ? true : false;
        }
        // return {
        //     getKey(code) {
        //         if (isString(code) === false) return false;
        //         return (state[code] && state[code].up === null) ? true : false;
        //     },
        //     getKeyDown(code) {
        //         if (isString(code) === false) return false;
        //         return (state[code] && state[code].down === ticker.counter) ? true : false;
        //     },
        //     getKeyUp(code) {
        //         if (isString(code) === false) return false;
        //         return (state[code] && state[code].up === ticker.counter) ? true : false;
        //     },
        // };
    }

    Object.defineProperty(xnew, 'Screen', { enumerable: true, value: Screen });
    Object.defineProperty(xnew, 'DragEvent', { enumerable: true, value: DragEvent });
    Object.defineProperty(xnew, 'GestureEvent', { enumerable: true, value: GestureEvent });
    Object.defineProperty(xnew, 'PointerEvent', { enumerable: true, value: PointerEvent });
    Object.defineProperty(xnew, 'ResizeEvent', { enumerable: true, value: ResizeEvent });
    Object.defineProperty(xnew, 'Modal', { enumerable: true, value: Modal });
    Object.defineProperty(xnew, 'Keyboard', { enumerable: true, value: Keyboard });

    return xnew;

}));
