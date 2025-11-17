(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xnew = factory());
})(this, (function () { 'use strict';

    //----------------------------------------------------------------------------------------------------
    // map set
    //----------------------------------------------------------------------------------------------------
    class MapSet extends Map {
        has(key, value) {
            var _a, _b;
            if (value === undefined) {
                return super.has(key);
            }
            else {
                return (_b = (_a = super.get(key)) === null || _a === void 0 ? void 0 : _a.has(value)) !== null && _b !== void 0 ? _b : false;
            }
        }
        add(key, value) {
            var _a;
            super.set(key, ((_a = super.get(key)) !== null && _a !== void 0 ? _a : new Set).add(value));
            return this;
        }
        keys(key) {
            var _a, _b;
            if (key === undefined) {
                return super.keys();
            }
            else {
                return (_b = (_a = super.get(key)) === null || _a === void 0 ? void 0 : _a.values()) !== null && _b !== void 0 ? _b : [].values();
            }
        }
        delete(key, value) {
            var _a, _b, _c, _d;
            let ret = false;
            if (value === undefined) {
                ret = (((_a = super.get(key)) === null || _a === void 0 ? void 0 : _a.size) === 0) ? super.delete(key) : false;
            }
            else {
                ret = (_c = (_b = super.get(key)) === null || _b === void 0 ? void 0 : _b.delete(value)) !== null && _c !== void 0 ? _c : false;
                (((_d = super.get(key)) === null || _d === void 0 ? void 0 : _d.size) === 0) && super.delete(key);
            }
            return ret;
        }
    }
    //----------------------------------------------------------------------------------------------------
    // map map
    //----------------------------------------------------------------------------------------------------
    class MapMap extends Map {
        has(key1, key2) {
            var _a, _b;
            if (key2 === undefined) {
                return super.has(key1);
            }
            else {
                return (_b = (_a = super.get(key1)) === null || _a === void 0 ? void 0 : _a.has(key2)) !== null && _b !== void 0 ? _b : false;
            }
        }
        set(key1, key2OrValue, value) {
            var _a;
            if (value === undefined) {
                // 2 args: directly set Map<Key2, Value>
                super.set(key1, key2OrValue);
            }
            else {
                // 3 args: set nested value
                super.set(key1, ((_a = super.get(key1)) !== null && _a !== void 0 ? _a : new Map).set(key2OrValue, value));
            }
            return this;
        }
        get(key1, key2) {
            var _a;
            if (key2 === undefined) {
                return super.get(key1);
            }
            else {
                return (_a = super.get(key1)) === null || _a === void 0 ? void 0 : _a.get(key2);
            }
        }
        keys(key1) {
            var _a, _b;
            if (key1 === undefined) {
                return super.keys();
            }
            else {
                return (_b = (_a = super.get(key1)) === null || _a === void 0 ? void 0 : _a.keys()) !== null && _b !== void 0 ? _b : [].values();
            }
        }
        delete(key1, key2) {
            var _a, _b, _c, _d;
            let ret = false;
            if (key2 === undefined) {
                ret = (((_a = super.get(key1)) === null || _a === void 0 ? void 0 : _a.size) === 0) ? super.delete(key1) : false;
            }
            else {
                ret = (_c = (_b = super.get(key1)) === null || _b === void 0 ? void 0 : _b.delete(key2)) !== null && _c !== void 0 ? _c : false;
                (((_d = super.get(key1)) === null || _d === void 0 ? void 0 : _d.size) === 0) && super.delete(key1);
            }
            return ret;
        }
    }

    //----------------------------------------------------------------------------------------------------
    // ticker
    //----------------------------------------------------------------------------------------------------
    class Ticker {
        constructor(callback) {
            const self = this;
            this.id = null;
            let previous = 0;
            ticker();
            function ticker() {
                const time = Date.now();
                const fps = 60;
                if (time - previous > (1000 / fps) * 0.9) {
                    callback(time);
                    previous = time;
                }
                self.id = requestAnimationFrame(ticker);
            }
        }
        clear() {
            if (this.id !== null) {
                cancelAnimationFrame(this.id);
                this.id = null;
            }
        }
    }
    //----------------------------------------------------------------------------------------------------
    // timer
    //----------------------------------------------------------------------------------------------------
    class Timer {
        constructor(transition, timeout, duration, { loop = false, easing = 'linear' } = {}) {
            var _a;
            this.transition = transition;
            this.timeout = timeout;
            this.duration = duration !== null && duration !== void 0 ? duration : 0;
            this.loop = loop;
            this.easing = easing;
            this.id = null;
            this.time = 0.0;
            this.offset = 0.0;
            this.status = 0;
            this.ticker = new Ticker((time) => {
                var _a;
                let p = Math.min(this.elapsed() / this.duration, 1.0);
                if (easing === 'ease-out') {
                    p = Math.pow((1.0 - Math.pow((1.0 - p), 2.0)), 0.5);
                }
                else if (easing === 'ease-in') {
                    p = Math.pow((1.0 - Math.pow((1.0 - p), 0.5)), 2.0);
                }
                else if (easing === 'ease') {
                    p = (1.0 - Math.cos(p * Math.PI)) / 2.0;
                }
                else if (easing === 'ease-in-out') {
                    p = (1.0 - Math.cos(p * Math.PI)) / 2.0;
                }
                (_a = this.transition) === null || _a === void 0 ? void 0 : _a.call(this, p);
            });
            this.visibilitychange = () => document.hidden === false ? this._start() : this._stop();
            document.addEventListener('visibilitychange', this.visibilitychange);
            if (this.duration > 0.0) {
                (_a = this.transition) === null || _a === void 0 ? void 0 : _a.call(this, 0.0);
            }
            this.start();
        }
        clear() {
            if (this.id !== null) {
                clearTimeout(this.id);
                this.id = null;
            }
            document.removeEventListener('visibilitychange', this.visibilitychange);
            this.ticker.clear();
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
                    var _a, _b;
                    (_a = this.timeout) === null || _a === void 0 ? void 0 : _a.call(this);
                    (_b = this.transition) === null || _b === void 0 ? void 0 : _b.call(this, 1.0);
                    this.id = null;
                    this.time = 0.0;
                    this.offset = 0.0;
                    this.loop ? this.start() : this.clear();
                }, this.duration - this.offset);
                this.time = Date.now();
            }
        }
        _stop() {
            if (this.status === 1 && this.id !== null) {
                this.offset = this.offset + Date.now() - this.time;
                clearTimeout(this.id);
                this.id = null;
                this.time = 0.0;
            }
        }
    }

    //----------------------------------------------------------------------------------------------------
    // utils
    //----------------------------------------------------------------------------------------------------
    const SYSTEM_EVENTS = ['start', 'update', 'stop', 'finalize'];
    //----------------------------------------------------------------------------------------------------
    // unit
    //----------------------------------------------------------------------------------------------------
    class Unit {
        constructor(parent, ...args) {
            var _a;
            let target;
            if (args[0] instanceof HTMLElement || args[0] instanceof SVGElement) {
                target = args.shift(); // an existing html element
            }
            else if (typeof args[0] === 'string' && args[0].match(/<((\w+)[^>]*?)\/?>/)) {
                target = args.shift();
            }
            else if (typeof args[0] === 'string') {
                const query = args.shift();
                target = document.querySelector(query);
                if (target === null)
                    throw new Error(`'${query}' can not be found.`);
            }
            else {
                target = null;
            }
            const component = args.shift();
            const props = args.shift();
            let baseElement;
            if (target instanceof HTMLElement || target instanceof SVGElement) {
                baseElement = target;
            }
            else if (parent !== null) {
                baseElement = parent._.currentElement;
            }
            else {
                baseElement = document.body;
            }
            let baseComponent;
            if (typeof component === 'function') {
                baseComponent = component;
            }
            else if (typeof component === 'string') {
                baseComponent = (unit) => { unit.element.textContent = component; };
            }
            else {
                baseComponent = (unit) => { };
            }
            const baseContext = (_a = parent === null || parent === void 0 ? void 0 : parent._.currentContext) !== null && _a !== void 0 ? _a : { stack: null };
            this._ = { parent, target, baseElement, baseContext, baseComponent, props };
            parent === null || parent === void 0 ? void 0 : parent._.children.push(this);
            Unit.initialize(this, null);
        }
        get element() {
            return this._.currentElement;
        }
        get components() {
            return this._.components;
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
            if (this._.parent) {
                this._.parent._.children = this._.parent._.children.filter((unit) => unit !== this);
            }
        }
        reboot() {
            var _a, _b;
            const anchor = (_b = (_a = this._.elements[0]) === null || _a === void 0 ? void 0 : _a.nextElementSibling) !== null && _b !== void 0 ? _b : null;
            Unit.stop(this);
            Unit.finalize(this);
            Unit.initialize(this, anchor);
        }
        append(...args) {
            new Unit(this, ...args);
        }
        static initialize(unit, anchor) {
            const backup = Unit.current;
            Unit.current = unit;
            unit._ = Object.assign(unit._, {
                currentElement: unit._.baseElement,
                currentContext: unit._.baseContext,
                anchor,
                state: 'invoked',
                tostart: true,
                children: [],
                elements: [],
                promises: [],
                components: [],
                listeners: new MapMap(),
                defines: {},
                systems: { start: [], update: [], stop: [], finalize: [] },
            });
            // nest html element
            if (typeof unit._.target === 'string') {
                Unit.nest(unit, unit._.target);
            }
            // setup component
            Unit.extend(unit, unit._.baseComponent, unit._.props);
            // whether the unit promise was resolved
            Promise.all(unit._.promises).then(() => unit._.state = 'initialized');
            Unit.current = backup;
        }
        static finalize(unit) {
            if (unit._.state !== 'finalized') {
                unit._.state = 'finalized';
                unit._.children.forEach((child) => child.finalize());
                unit._.systems.finalize.forEach((listener) => Unit.scope(Unit.snapshot(unit), listener));
                unit.off();
                unit._.components.forEach((component) => Unit.component2units.delete(component, unit));
                if (unit._.elements.length > 0) {
                    unit._.baseElement.removeChild(unit._.elements[0]);
                    unit._.currentElement = unit._.baseElement;
                }
                // reset defines
                Object.keys(unit._.defines).forEach((key) => {
                    if (SYSTEM_EVENTS.includes(key) === false) {
                        delete unit[key];
                    }
                });
                unit._.defines = {};
            }
        }
        static nest(unit, tag) {
            const match = tag.match(/<((\w+)[^>]*?)\/?>/);
            if (match !== null) {
                let element;
                if (unit._.anchor !== null) {
                    unit._.anchor.insertAdjacentHTML('beforebegin', `<${match[1]}></${match[2]}>`);
                    element = unit._.anchor.previousElementSibling;
                    unit._.anchor = null;
                }
                else {
                    unit._.currentElement.insertAdjacentHTML('beforeend', `<${match[1]}></${match[2]}>`);
                    element = unit._.currentElement.children[unit._.currentElement.children.length - 1];
                }
                unit._.currentElement = element;
                unit._.elements.push(element);
                return element;
            }
            else {
                throw new Error(`Invalid tag: ${tag}`);
            }
        }
        static extend(unit, component, props) {
            var _a;
            unit._.components.push(component);
            Unit.component2units.add(component, unit);
            const defines = (_a = component(unit, props)) !== null && _a !== void 0 ? _a : {};
            Object.keys(defines).forEach((key) => {
                if (unit[key] !== undefined && unit._.defines[key] === undefined) {
                    throw new Error(`The property "${key}" already exists.`);
                }
                const descriptor = Object.getOwnPropertyDescriptor(defines, key);
                const wrapper = { configurable: true, enumerable: true };
                if (descriptor === null || descriptor === void 0 ? void 0 : descriptor.get)
                    wrapper.get = Unit.wrap(unit, descriptor.get);
                if (descriptor === null || descriptor === void 0 ? void 0 : descriptor.set)
                    wrapper.set = Unit.wrap(unit, descriptor.set);
                if (typeof (descriptor === null || descriptor === void 0 ? void 0 : descriptor.value) === 'function') {
                    wrapper.value = Unit.wrap(unit, descriptor.value);
                }
                else if ((descriptor === null || descriptor === void 0 ? void 0 : descriptor.value) !== undefined) {
                    wrapper.writable = true;
                    wrapper.value = descriptor.value;
                }
                Object.defineProperty(unit._.defines, key, wrapper);
                Object.defineProperty(unit, key, wrapper);
            });
            return Object.assign({}, unit._.defines);
        }
        static start(unit) {
            if (unit._.tostart === false)
                return;
            if (unit._.state === 'initialized' || unit._.state === 'stopped') {
                unit._.state = 'started';
                unit._.children.forEach((child) => Unit.start(child));
                unit._.systems.start.forEach((listener) => Unit.scope(Unit.snapshot(unit), listener));
            }
            else if (unit._.state === 'started') {
                unit._.children.forEach((child) => Unit.start(child));
            }
        }
        static stop(unit) {
            if (unit._.state === 'started') {
                unit._.state = 'stopped';
                unit._.children.forEach((child) => Unit.stop(child));
                unit._.systems.stop.forEach((listener) => Unit.scope(Unit.snapshot(unit), listener));
            }
        }
        static update(unit) {
            if (unit._.state === 'started') {
                unit._.children.forEach((child) => Unit.update(child));
                unit._.systems.update.forEach((listener) => Unit.scope(Unit.snapshot(unit), listener));
            }
        }
        static reset() {
            var _a, _b;
            (_a = Unit.root) === null || _a === void 0 ? void 0 : _a.finalize();
            Unit.current = Unit.root = new Unit(null, null);
            (_b = Unit.ticker) === null || _b === void 0 ? void 0 : _b.clear();
            Unit.ticker = new Ticker((time) => {
                Unit.start(Unit.root);
                Unit.update(Unit.root);
            });
        }
        static wrap(unit, listener) {
            const snapshot = Unit.snapshot(unit);
            return (...args) => Unit.scope(snapshot, listener, ...args);
        }
        static scope(snapshot, func, ...args) {
            const current = Unit.current;
            const backup = Unit.snapshot(snapshot.unit);
            try {
                Unit.current = snapshot.unit;
                snapshot.unit._.currentContext = snapshot.context;
                snapshot.unit._.currentElement = snapshot.element;
                return func(...args);
            }
            catch (error) {
                throw error;
            }
            finally {
                Unit.current = current;
                snapshot.unit._.currentContext = backup.context;
                snapshot.unit._.currentElement = backup.element;
            }
        }
        static snapshot(unit) {
            return { unit, context: unit._.currentContext, element: unit._.currentElement };
        }
        static context(unit, key, value) {
            if (value !== undefined) {
                unit._.currentContext = { stack: unit._.currentContext, key, value };
            }
            else {
                for (let context = unit._.currentContext; context.stack !== null; context = context.stack) {
                    if (context.key === key)
                        return context.value;
                }
            }
        }
        static find(component) {
            var _a;
            return [...((_a = Unit.component2units.get(component)) !== null && _a !== void 0 ? _a : [])];
        }
        on(type, listener, options) {
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
        off(type, listener) {
            const types = typeof type === 'string' ? type.trim().split(/\s+/) : [...this._.listeners.keys()];
            types.forEach((type) => {
                if (SYSTEM_EVENTS.includes(type)) {
                    this._.systems[type] = this._.systems[type].filter((lis) => listener ? lis !== listener : false);
                }
                (listener ? [listener] : [...this._.listeners.keys(type)]).forEach((listener) => {
                    const item = this._.listeners.get(type, listener);
                    if (item !== undefined) {
                        this._.listeners.delete(type, listener);
                        if (/^[A-Za-z]/.test(type)) {
                            item.element.removeEventListener(type, item.execute);
                        }
                    }
                });
                if (this._.listeners.has(type) === false) {
                    Unit.type2units.delete(type, this);
                }
            });
        }
        emit(type, ...args) {
            var _a, _b;
            if (type[0] === '+') {
                (_a = Unit.type2units.get(type)) === null || _a === void 0 ? void 0 : _a.forEach((unit) => {
                    var _a;
                    (_a = unit._.listeners.get(type)) === null || _a === void 0 ? void 0 : _a.forEach((item) => item.execute(...args));
                });
            }
            else if (type[0] === '-') {
                (_b = this._.listeners.get(type)) === null || _b === void 0 ? void 0 : _b.forEach((item) => item.execute(...args));
            }
        }
    }
    Unit.component2units = new MapSet();
    //----------------------------------------------------------------------------------------------------
    // event
    //----------------------------------------------------------------------------------------------------
    Unit.type2units = new MapSet();
    //----------------------------------------------------------------------------------------------------
    // unit promise
    //----------------------------------------------------------------------------------------------------
    class UnitPromise {
        constructor(promise) { this.promise = promise; }
        then(callback) {
            this.promise = this.promise.then(Unit.wrap(Unit.current, callback));
            return this;
        }
        catch(callback) {
            this.promise = this.promise.catch(Unit.wrap(Unit.current, callback));
            return this;
        }
        finally(callback) {
            this.promise = this.promise.finally(Unit.wrap(Unit.current, callback));
            return this;
        }
    }
    //----------------------------------------------------------------------------------------------------
    // unit timer
    //----------------------------------------------------------------------------------------------------
    class UnitTimer {
        constructor({ transition, timeout, duration, easing, loop }) {
            this.stack = [];
            this.unit = new Unit(Unit.current, UnitTimer.Component, { snapshot: Unit.snapshot(Unit.current), transition, timeout, duration, easing, loop });
        }
        clear() {
            this.stack = [];
            this.unit.finalize();
        }
        timeout(timeout, duration = 0) {
            UnitTimer.execute(this, { timeout, duration });
            return this;
        }
        transition(transition, duration = 0, easing = 'linear') {
            UnitTimer.execute(this, { transition, duration, easing });
            return this;
        }
        static execute(timer, { transition, timeout, duration, easing, loop }) {
            if (timer.unit._.state === 'finalized') {
                timer.unit = new Unit(Unit.current, UnitTimer.Component, { snapshot: Unit.snapshot(Unit.current), transition, timeout, duration, easing, loop });
            }
            else if (timer.stack.length === 0) {
                timer.stack.push({ snapshot: Unit.snapshot(Unit.current), transition, timeout, duration, easing, loop });
                timer.unit.on('finalize', () => { UnitTimer.next(timer); });
            }
            else {
                timer.stack.push({ snapshot: Unit.snapshot(Unit.current), transition, timeout, duration, easing, loop });
            }
        }
        static next(timer) {
            if (timer.stack.length > 0) {
                timer.unit = new Unit(Unit.current, UnitTimer.Component, timer.stack.shift());
                timer.unit.on('finalize', () => { UnitTimer.next(timer); });
            }
        }
        static Component(unit, { snapshot, transition, timeout, duration, loop, easing }) {
            const timer = new Timer((x) => {
                if (transition !== undefined)
                    Unit.scope(snapshot, transition, x);
            }, () => {
                if (transition !== undefined)
                    Unit.scope(snapshot, transition, 1.0);
                if (timeout !== undefined)
                    Unit.scope(snapshot, timeout);
                if (loop === false) {
                    unit.finalize();
                }
            }, duration, { loop, easing });
            unit.on('finalize', () => timer.clear());
        }
    }

    const xnew$1 = Object.assign(function (...args) {
        if (Unit.root === undefined) {
            Unit.reset();
        }
        return new Unit(Unit.current, ...args);
    }, {
        /**
         * Creates a nested HTML/SVG element within the current component
         * @param tag - HTML or SVG tag name (e.g., '<div>', '<span>', '<svg>')
         * @returns The created HTML/SVG element
         * @throws Error if called after component initialization
         * @example
         * const div = xnew.nest('<div>')
         * div.textContent = 'Hello'
         */
        nest(tag) {
            var _a;
            if (((_a = Unit.current) === null || _a === void 0 ? void 0 : _a._.state) === 'invoked') {
                return Unit.nest(Unit.current, tag);
            }
            else {
                throw new Error('xnew.nest: This function can not be called after initialized.');
            }
        },
        /**
         * Extends the current component with another component's functionality
         * @param component - Component function to extend with
         * @param props - Optional properties to pass to the extended component
         * @returns The extended component's return value
         * @throws Error if called after component initialization
         * @example
         * const api = xnew.extend(BaseComponent, { data: {} })
         */
        extend(component, props) {
            var _a;
            if (((_a = Unit.current) === null || _a === void 0 ? void 0 : _a._.state) === 'invoked') {
                return Unit.extend(Unit.current, component, props);
            }
            else {
                throw new Error('xnew.extend: This function can not be called after initialized.');
            }
        },
        /**
         * Gets or sets a context value that can be accessed by child components
         * @param key - Context key
         * @param value - Optional value to set (if undefined, gets the value)
         * @returns The context value if getting, undefined if setting
         * @example
         * // Set context in parent
         * xnew.context('theme', 'dark')
         *
         * // Get context in child
         * const theme = xnew.context('theme')
         */
        context(key, value = undefined) {
            try {
                return Unit.context(Unit.current, key, value);
            }
            catch (error) {
                console.error('xnew.context(key: string, value?: any): ', error);
                throw error;
            }
        },
        /**
         * Registers a promise with the current component for lifecycle management
         * @param promise - Promise to register
         * @returns UnitPromise wrapper for chaining
         * @example
         * xnew.promise(fetchData()).then(data => console.log(data))
         */
        promise(promise) {
            try {
                Unit.current._.promises.push(promise);
                return new UnitPromise(promise);
            }
            catch (error) {
                console.error('xnew.promise(promise: Promise<any>): ', error);
                throw error;
            }
        },
        /**
         * Handles successful resolution of all registered promises in the current component
         * @param callback - Function to call when all promises resolve
         * @returns UnitPromise for chaining
         * @example
         * xnew.then(results => console.log('All promises resolved', results))
         */
        then(callback) {
            try {
                return new UnitPromise(Promise.all(Unit.current._.promises)).then(callback);
            }
            catch (error) {
                console.error('xnew.then(callback: Function): ', error);
                throw error;
            }
        },
        /**
         * Handles rejection of any registered promise in the current component
         * @param callback - Function to call if any promise rejects
         * @returns UnitPromise for chaining
         * @example
         * xnew.catch(error => console.error('Promise failed', error))
         */
        catch(callback) {
            try {
                return new UnitPromise(Promise.all(Unit.current._.promises)).catch(callback);
            }
            catch (error) {
                console.error('xnew.catch(callback: Function): ', error);
                throw error;
            }
        },
        /**
         * Executes callback after all registered promises settle (resolve or reject)
         * @param callback - Function to call after promises settle
         * @returns UnitPromise for chaining
         * @example
         * xnew.finally(() => console.log('All promises settled'))
         */
        finally(callback) {
            try {
                return new UnitPromise(Promise.all(Unit.current._.promises)).finally(callback);
            }
            catch (error) {
                console.error('xnew.finally(callback: Function): ', error);
                throw error;
            }
        },
        /**
         * Fetches a resource and registers the promise with the current component
         * @param url - URL to fetch
         * @param options - Optional fetch options (method, headers, body, etc.)
         * @returns UnitPromise wrapping the fetch promise
         * @example
         * xnew.fetch('/api/users').then(res => res.json()).then(data => console.log(data))
         */
        fetch(url, options) {
            try {
                const promise = fetch(url, options);
                Unit.current._.promises.push(promise);
                return new UnitPromise(promise);
            }
            catch (error) {
                console.error('xnew.promise(url: string, options?: object): ', error);
                throw error;
            }
        },
        /**
         * Creates a scoped callback that captures the current component context
         * @param callback - Function to wrap with current scope
         * @returns Function that executes callback in the captured scope
         * @example
         * setTimeout(xnew.scope(() => {
         *   console.log('This runs in the xnew component scope')
         * }), 1000)
         */
        scope(callback) {
            const snapshot = Unit.snapshot(Unit.current);
            return (...args) => Unit.scope(snapshot, callback, ...args);
        },
        /**
         * Finds all instances of a component in the component tree
         * @param component - Component function to search for
         * @returns Array of Unit instances matching the component
         * @throws Error if component parameter is invalid
         * @example
         * const buttons = xnew.find(ButtonComponent)
         * buttons.forEach(btn => btn.finalize())
         */
        find(component) {
            if (typeof component === 'function') {
                return Unit.find(component);
            }
            else {
                throw new Error('xnew.find(component: Function): [component] is invalid.');
            }
        },
        /**
         * Executes a callback once after a delay, managed by component lifecycle
         * @param timeout - Function to execute after Duration
         * @param duration - Duration in milliseconds
         * @returns Object with clear() method to cancel the timeout
         * @example
         * const timer = xnew.timeout(() => console.log('Delayed'), 1000)
         * // Cancel if needed: timer.clear()
         */
        timeout(timeout, duration = 0) {
            return new UnitTimer({ timeout, duration });
        },
        /**
         * Executes a callback repeatedly at specified intervals, managed by component lifecycle
         * @param timeout - Function to execute at each duration
         * @param duration - Duration in milliseconds
         * @returns Object with clear() method to stop the interval
         * @example
         * const timer = xnew.interval(() => console.log('Tick'), 1000)
         * // Stop when needed: timer.clear()
         */
        interval(timeout, duration) {
            return new UnitTimer({ timeout, duration, loop: true });
        },
        /**
         * Creates a transition animation with easing, executing callback with progress values
         * @param callback - Function called with progress value (0.0 to 1.0)
         * @param duration - Duration of transition in milliseconds
         * @param easing - Easing function: 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out' (default: 'linear')
         * @returns Object with clear() and next() methods for controlling transitions
         * @example
         * xnew.transition(p => {
         *   element.style.opacity = p
         * }, 500, 'ease-out').transition(p => {
         *   element.style.transform = `scale(${p})`
         * }, 300)
         */
        transition(transition, duration = 0, easing = 'linear') {
            return new UnitTimer({ transition, duration, easing });
        },
    });

    function AccordionFrame(frame, { open = false, duration = 200, easing = 'ease' } = {}) {
        const internal = xnew$1((internal) => {
            return { frame, open, rate: 0.0, };
        });
        xnew$1.context('xnew.accordionframe', internal);
        internal.on('-transition', ({ rate }) => internal.rate = rate);
        internal.emit('-transition', { rate: open ? 1.0 : 0.0 });
        return {
            toggle() {
                if (internal.rate === 1.0) {
                    frame.close();
                }
                else if (internal.rate === 0.0) {
                    frame.open();
                }
            },
            open() {
                if (internal.rate === 0.0) {
                    xnew$1.transition((x) => internal.emit('-transition', { rate: x }), duration, easing);
                }
            },
            close() {
                if (internal.rate === 1.0) {
                    xnew$1.transition((x) => internal.emit('-transition', { rate: 1.0 - x }), duration, easing);
                }
            }
        };
    }
    function AccordionHeader(header, {} = {}) {
        const internal = xnew$1.context('xnew.accordionframe');
        xnew$1.nest('<button style="display: flex; align-items: center; margin: 0; padding: 0; width: 100%; text-align: left; border: none; font: inherit; color: inherit; background: none; cursor: pointer;">');
        header.on('click', () => internal.frame.toggle());
    }
    function AccordionBullet(bullet, { type = 'arrow' } = {}) {
        const internal = xnew$1.context('xnew.accordionframe');
        xnew$1.nest('<div style="display:inline-block; position: relative; width: 0.55em; margin: 0 0.3em;">');
        if (type === 'arrow') {
            const arrow = xnew$1(`<div style="width: 100%; height: 0.55em; border-right: 0.12em solid currentColor; border-bottom: 0.12em solid currentColor; box-sizing: border-box; transform-origin: center;">`);
            arrow.element.style.transform = `rotate(${internal.rate * 90 - 45}deg)`;
            internal.on('-transition', ({ rate }) => {
                arrow.element.style.transform = `rotate(${rate * 90 - 45}deg)`;
            });
        }
        else if (type === 'plusminus') {
            const line1 = xnew$1(`<div style="position: absolute; width: 100%; border-top: 0.06em solid currentColor; border-bottom: 0.06em solid currentColor; box-sizing: border-box; transform-origin: center;">`);
            const line2 = xnew$1(`<div style="position: absolute; width: 100%; border-top: 0.06em solid currentColor; border-bottom: 0.06em solid currentColor; box-sizing: border-box; transform-origin: center;">`);
            line2.element.style.transform = `rotate(90deg)`;
            line2.element.style.opacity = `${1.0 - internal.rate}`;
            internal.on('-transition', ({ rate }) => {
                line1.element.style.transform = `rotate(${90 + rate * 90}deg)`;
                line2.element.style.transform = `rotate(${rate * 180}deg)`;
            });
        }
    }
    function AccordionContent(content, {} = {}) {
        const internal = xnew$1.context('xnew.accordionframe');
        xnew$1.nest(`<div style="display: ${internal.open ? 'block' : 'none'};">`);
        xnew$1.nest('<div style="padding: 0; display: flex; flex-direction: column; box-sizing: border-box;">');
        internal.on('-transition', ({ rate }) => {
            content.transition({ element: content.element, rate });
        });
        return {
            transition({ element, rate }) {
                const wrapper = element.parentElement;
                wrapper.style.display = 'block';
                if (rate === 0.0) {
                    wrapper.style.display = 'none';
                }
                else if (rate < 1.0) {
                    Object.assign(wrapper.style, { height: element.offsetHeight * rate + 'px', overflow: 'hidden', opacity: rate });
                }
                else {
                    Object.assign(wrapper.style, { height: 'auto', overflow: 'visible', opacity: 1.0 });
                }
            }
        };
    }

    function ResizeEvent(resize) {
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                resize.emit('-resize');
                break;
            }
        });
        if (resize.element) {
            observer.observe(resize.element);
        }
        resize.on('finalize', () => {
            if (resize.element) {
                observer.unobserve(resize.element);
            }
        });
    }
    function KeyboardEvent(keyboard) {
        const state = {};
        window.addEventListener('keydown', keydown);
        window.addEventListener('keyup', keyup);
        function keydown(event) {
            state[event.code] = 1;
            keyboard.emit('-keydown', { event, type: '-keydown', code: event.code });
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
                keyboard.emit('-keydown:arrow', { event, type: '-keydown:arrow', code: event.code, vector: getVector() });
            }
        }
        function keyup(event) {
            state[event.code] = 0;
            keyboard.emit('-keyup', { event, type: '-keyup', code: event.code });
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
                keyboard.emit('-keyup:arrow', { event, type: '-keyup:arrow', code: event.code, vector: getVector() });
            }
        }
        function getVector() {
            return {
                x: (state['ArrowLeft'] ? -1 : 0) + (state['ArrowRight'] ? +1 : 0),
                y: (state['ArrowUp'] ? -1 : 0) + (state['ArrowDown'] ? +1 : 0)
            };
        }
        keyboard.on('finalize', () => {
            window.removeEventListener('keydown', keydown);
            window.removeEventListener('keyup', keyup);
        });
    }
    function PointerEvent(unit) {
        const internal = xnew$1();
        internal.on('pointerdown', (event) => unit.emit('-pointerdown', { event, position: getPosition(unit.element, event) }));
        internal.on('pointermove', (event) => unit.emit('-pointermove', { event, position: getPosition(unit.element, event) }));
        internal.on('pointerup', (event) => unit.emit('-pointerup', { event, position: getPosition(unit.element, event) }));
        internal.on('wheel', (event) => unit.emit('-wheel', { event, delta: { x: event.wheelDeltaX, y: event.wheelDeltaY } }));
        internal.on('mouseover', (event) => unit.emit('-mouseover', { event, position: getPosition(unit.element, event) }));
        internal.on('mouseout', (event) => unit.emit('-mouseout', { event, position: getPosition(unit.element, event) }));
        const drag = xnew$1(DragEvent);
        drag.on('-dragstart', (...args) => unit.emit('-dragstart', ...args));
        drag.on('-dragmove', (...args) => unit.emit('-dragmove', ...args));
        drag.on('-dragend', (...args) => unit.emit('-dragend', ...args));
        drag.on('-dragcancel', (...args) => unit.emit('-dragcancel', ...args));
        const gesture = xnew$1(GestureEvent);
        gesture.on('-gesturestart', (...args) => unit.emit('-gesturestart', ...args));
        gesture.on('-gesturemove', (...args) => unit.emit('-gesturemove', ...args));
        gesture.on('-gestureend', (...args) => unit.emit('-gestureend', ...args));
        gesture.on('-gesturecancel', (...args) => unit.emit('-gesturecancel', ...args));
    }
    function DragEvent(unit) {
        unit.on('pointerdown', pointerdown);
        function pointerdown(event) {
            const id = event.pointerId;
            const position = getPosition(unit.element, event);
            let previous = position;
            xnew$1((internal) => {
                let connect = true;
                window.addEventListener('pointermove', pointermove);
                window.addEventListener('pointerup', pointerup);
                window.addEventListener('pointercancel', pointercancel);
                function pointermove(event) {
                    if (event.pointerId === id) {
                        const position = getPosition(unit.element, event);
                        const delta = { x: position.x - previous.x, y: position.y - previous.y };
                        unit.emit('-dragmove', { event, position, delta });
                        previous = position;
                    }
                }
                function pointerup(event) {
                    if (event.pointerId === id) {
                        const position = getPosition(unit.element, event);
                        unit.emit('-dragend', { event, position, });
                        remove();
                    }
                }
                function pointercancel(event) {
                    if (event.pointerId === id) {
                        const position = getPosition(unit.element, event);
                        unit.emit('-dragcancel', { event, position, });
                        remove();
                    }
                }
                function remove() {
                    if (connect === true) {
                        window.removeEventListener('pointermove', pointermove);
                        window.removeEventListener('pointerup', pointerup);
                        window.removeEventListener('pointercancel', pointercancel);
                        connect = false;
                    }
                }
                internal.on('finalize', remove);
            });
            unit.emit('-dragstart', { event, position });
        }
    }
    function GestureEvent(unit) {
        const drag = xnew$1(DragEvent);
        let isActive = false;
        const map = new Map();
        drag.on('-dragstart', ({ event, position }) => {
            map.set(event.pointerId, Object.assign({}, position));
            isActive = map.size === 2 ? true : false;
            if (isActive === true) {
                unit.emit('-gesturestart', {});
            }
        });
        drag.on('-dragmove', ({ event, position, delta }) => {
            if (map.size >= 2 && isActive === true) {
                const a = map.get(event.pointerId);
                const b = getOthers(event.pointerId)[0];
                let scale = 0.0;
                {
                    const v = { x: a.x - b.x, y: a.y - b.y };
                    const s = v.x * v.x + v.y * v.y;
                    scale = 1 + (s > 0.0 ? (v.x * delta.x + v.y * delta.y) / s : 0);
                }
                // let rotate = 0.0;
                // {
                //     const c = { x: a.x + delta.x, y: a.y + delta.y };
                //     const v1 = { x: a.x - b.x, y: a.y - b.y };
                //     const v2 = { x: c.x - b.x, y: c.y - b.y };
                //     const l1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
                //     const l2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
                //     if (l1 > 0.0 && l2 > 0.0) {
                //         const angle = Math.acos((v1.x * v2.x + v1.y * v2.y) / (l1 * l2));
                //         const sign = v1.x * v2.y - v1.y * v2.x;
                //         rotate = sign > 0.0 ? +angle : -angle;
                //     }
                // }
                unit.emit('-gesturemove', { event, position, delta, scale });
            }
            map.set(event.pointerId, position);
        });
        drag.on('-dragend', ({ event }) => {
            if (isActive === true) {
                unit.emit('-gestureend', {});
            }
            isActive = false;
            map.delete(event.pointerId);
        });
        drag.on('-dragcancel', ({ event }) => {
            if (isActive === true) {
                unit.emit('-gesturecancel', { event });
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
    function getPosition(element, event) {
        const rect = element.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function Screen(screen, { width = 640, height = 480, fit = 'contain' } = {}) {
        const size = { width, height };
        const wrapper = xnew$1.nest('<div style="position: relative; width: 100%; height: 100%; overflow: hidden;">');
        const absolute = xnew$1.nest('<div style="position: absolute; margin: auto;">');
        const canvas = xnew$1(`<canvas width="${width}" height="${height}" style="width: 100%; height: 100%; vertical-align: bottom; user-select: none; user-drag: none; pointer-events: auto;">`);
        xnew$1(wrapper, ResizeEvent).on('-resize', resize);
        resize();
        function resize() {
            const aspect = size.width / size.height;
            const style = { width: '100%', height: '100%', top: 0, left: 0, bottom: 0, right: 0 };
            if (fit === 'contain') {
                if (wrapper.clientWidth < wrapper.clientHeight * aspect) {
                    style.height = Math.floor(wrapper.clientWidth / aspect) + 'px';
                }
                else {
                    style.width = Math.floor(wrapper.clientHeight * aspect) + 'px';
                }
            }
            else if (fit === 'cover') {
                if (wrapper.clientWidth < wrapper.clientHeight * aspect) {
                    style.width = Math.floor(wrapper.clientHeight * aspect) + 'px';
                    style.left = Math.floor((wrapper.clientWidth - wrapper.clientHeight * aspect) / 2) + 'px';
                    style.right = 'auto';
                }
                else {
                    style.height = Math.floor(wrapper.clientWidth / aspect) + 'px';
                    style.top = Math.floor((wrapper.clientHeight - wrapper.clientWidth / aspect) / 2) + 'px';
                    style.bottom = 'auto';
                }
            }
            else ;
            Object.assign(absolute.style, style);
        }
        return {
            get canvas() {
                return canvas.element;
            },
            resize(width, height) {
                size.width = width;
                size.height = height;
                canvas.element.setAttribute('width', width + 'px');
                canvas.element.setAttribute('height', height + 'px');
                resize();
            },
        };
    }

    function ModalFrame(frame, { duration = 200, easing = 'ease' } = {}) {
        const internal = xnew$1((internal) => {
            return {};
        });
        xnew$1.context('xnew.modalframe', internal);
        xnew$1.nest('<div style="position: fixed; inset: 0; z-index: 1000;">');
        xnew$1().on('click', (event) => frame.close());
        xnew$1.transition((x) => internal.emit('-transition', { rate: x }), duration, easing);
        return {
            close() {
                xnew$1.transition((x) => internal.emit('-transition', { rate: 1.0 - x }), duration, easing)
                    .next(() => frame.finalize());
            }
        };
    }
    function ModalContent(content, { background = 'rgba(0, 0, 0, 0.1)' } = {}) {
        const internal = xnew$1.context('xnew.modalframe');
        xnew$1.nest(`<div style="width: 100%; height: 100%; opacity: 0; background: ${background}">`);
        xnew$1.nest('<div style="position: absolute; inset: 0; margin: auto; width: max-content; height: max-content;">');
        xnew$1().on('click', (event) => event.stopPropagation());
        internal.on('-transition', ({ rate }) => {
            content.transition({ element: content.element, rate });
        });
        return {
            transition({ element, rate }) {
                const wrapper = element.parentElement;
                wrapper.style.opacity = rate.toString();
            }
        };
    }

    function TabFrame(frame, { select } = {}) {
        const internal = xnew$1((internal) => {
            const buttons = new Map();
            const contents = new Map();
            return { frame, buttons, contents };
        });
        xnew$1.context('xnew.tabframe', internal);
        xnew$1.timeout(() => internal.emit('-select', { key: select !== null && select !== void 0 ? select : [...internal.buttons.keys()][0] }));
    }
    function TabButton(button, { key } = {}) {
        const internal = xnew$1.context('xnew.tabframe');
        const div = xnew$1.nest('<div>');
        key = key !== null && key !== void 0 ? key : (internal.buttons.size).toString();
        internal.buttons.set(key, button);
        button.on('click', () => {
            internal.emit('-select', { key });
        });
        internal.on('-select', ({ key }) => {
            const select = internal.buttons.get(key);
            if (select === button) {
                button.select({ element: div });
            }
            else {
                button.deselect({ element: div });
            }
        });
        return {
            select({ element }) {
                Object.assign(element.style, { opacity: 1.0, cursor: 'text' });
            },
            deselect({ element }) {
                Object.assign(element.style, { opacity: 0.6, cursor: 'pointer' });
            }
        };
    }
    function TabContent(content, { key } = {}) {
        const internal = xnew$1.context('xnew.tabframe');
        const div = xnew$1.nest('<div style="display: none;">');
        key = key !== null && key !== void 0 ? key : (internal.contents.size).toString();
        internal.contents.set(key, content);
        internal.on('-select', ({ key }) => {
            const select = internal.contents.get(key);
            if (select === content) {
                content.select({ element: div });
            }
            else {
                content.deselect({ element: div });
            }
        });
        return {
            select({ element }) {
                Object.assign(element.style, { display: 'block' });
            },
            deselect({ element }) {
                Object.assign(element.style, { display: 'none' });
            }
        };
    }

    function DragFrame(frame, { x = 0, y = 0 } = {}) {
        const absolute = xnew$1.nest(`<div style="position: absolute; top: ${y}px; left: ${x}px;">`);
        xnew$1.context('xnew.dragframe', { frame, absolute });
    }
    function DragTarget(target, {} = {}) {
        const { frame, absolute } = xnew$1.context('xnew.dragframe');
        xnew$1.nest('<div>');
        const pointer = xnew$1(absolute.parentElement, PointerEvent);
        const current = { x: 0, y: 0 };
        const offset = { x: 0, y: 0 };
        let dragged = false;
        pointer.on('-dragstart', ({ event, position }) => {
            if (target.element.contains(event.target) === false)
                return;
            dragged = true;
            offset.x = position.x - parseFloat(absolute.style.left || '0');
            offset.y = position.y - parseFloat(absolute.style.top || '0');
            current.x = position.x - offset.x;
            current.y = position.y - offset.y;
        });
        pointer.on('-dragmove', ({ event, delta }) => {
            if (dragged !== true)
                return;
            current.x += delta.x;
            current.y += delta.y;
            absolute.style.left = `${current.x}px`;
            absolute.style.top = `${current.y}px`;
        });
        pointer.on('-dragcancel -dragend', ({ event }) => {
            dragged = false;
        });
    }

    //----------------------------------------------------------------------------------------------------
    // controller
    //----------------------------------------------------------------------------------------------------
    function SVGTemplate(self, { fill = null, fillOpacity = 0.8, stroke = null, strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round' }) {
        xnew$1.nest(`<svg
        viewBox="0 0 100 100"
        style="position: absolute; width: 100%; height: 100%; pointer-select: none;
        ${fill ? `fill: ${fill}; fill-opacity: ${fillOpacity};` : ''}
        ${stroke ? `stroke: ${stroke}; stroke-opacity: ${strokeOpacity}; stroke-width: ${strokeWidth}; stroke-linejoin: ${strokeLinejoin};` : ''}
    ">`);
    }
    function AnalogStick(self, { size, fill = '#FFF', fillOpacity = 0.8, stroke = '#000', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round' } = {}) {
        xnew$1.nest(`<div style="position: relative; width: 100%; height: 100%;">`);
        let internal;
        let newsize;
        if (size) {
            newsize = size;
        }
        else {
            newsize = Math.min(self.element.clientWidth, self.element.clientHeight);
            xnew$1(self.element, ResizeEvent).on('-resize', () => {
                newsize = Math.min(self.element.clientWidth, self.element.clientHeight);
                internal === null || internal === void 0 ? void 0 : internal.reboot();
            });
        }
        internal = xnew$1(() => {
            xnew$1.nest(`<div style="position: absolute; width: ${newsize}px; height: ${newsize}px; margin: auto; inset: 0; cursor: pointer; pointer-select: none; pointer-events: auto; overflow: hidden;">`);
            xnew$1((self) => {
                xnew$1.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
                xnew$1('<polygon points="50  7 40 18 60 18">');
                xnew$1('<polygon points="50 93 40 83 60 83">');
                xnew$1('<polygon points=" 7 50 18 40 18 60">');
                xnew$1('<polygon points="93 50 83 40 83 60">');
            });
            const target = xnew$1((self) => {
                xnew$1.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
                xnew$1('<circle cx="50" cy="50" r="23">');
            });
            const pointer = xnew$1(PointerEvent);
            pointer.on('-dragstart', ({ event, position }) => {
                const vector = getVector(position);
                target.element.style.filter = 'brightness(90%)';
                target.element.style.left = vector.x * newsize / 4 + 'px';
                target.element.style.top = vector.y * newsize / 4 + 'px';
                self.emit('-down', { vector });
            });
            pointer.on('-dragmove', ({ event, position }) => {
                const vector = getVector(position);
                target.element.style.filter = 'brightness(90%)';
                target.element.style.left = vector.x * newsize / 4 + 'px';
                target.element.style.top = vector.y * newsize / 4 + 'px';
                self.emit('-move', { vector });
            });
            pointer.on('-dragend', ({ event }) => {
                const vector = { x: 0, y: 0 };
                target.element.style.filter = '';
                target.element.style.left = vector.x * newsize / 4 + 'px';
                target.element.style.top = vector.y * newsize / 4 + 'px';
                self.emit('-up', { vector });
            });
            function getVector(position) {
                const x = position.x - newsize / 2;
                const y = position.y - newsize / 2;
                const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (newsize / 4));
                const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
                return { x: Math.cos(a) * d, y: Math.sin(a) * d };
            }
        });
    }
    function DirectionalPad(self, { size, diagonal = true, fill = '#FFF', fillOpacity = 0.8, stroke = '#000', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round' } = {}) {
        xnew$1.nest(`<div style="position: relative; width: 100%; height: 100%;">`);
        let internal;
        let newsize;
        if (size) {
            newsize = size;
        }
        else {
            newsize = Math.min(self.element.clientWidth, self.element.clientHeight);
            xnew$1(self.element, ResizeEvent).on('-resize', () => {
                newsize = Math.min(self.element.clientWidth, self.element.clientHeight);
                internal === null || internal === void 0 ? void 0 : internal.reboot();
            });
        }
        internal = xnew$1(() => {
            xnew$1.nest(`<div style="position: absolute; width: ${newsize}px; height: ${newsize}px; margin: auto; inset: 0; cursor: pointer; pointer-select: none; pointer-events: auto; overflow: hidden;">`);
            const polygons = [
                '<polygon points="50 50 35 35 35  5 37  3 63  3 65  5 65 35">',
                '<polygon points="50 50 35 65 35 95 37 97 63 97 65 95 65 65">',
                '<polygon points="50 50 35 35  5 35  3 37  3 63  5 65 35 65">',
                '<polygon points="50 50 65 35 95 35 97 37 97 63 95 65 65 65">'
            ];
            const targets = polygons.map((polygon) => {
                return xnew$1((self) => {
                    xnew$1.extend(SVGTemplate, { fill, fillOpacity });
                    xnew$1(polygon);
                });
            });
            xnew$1((self) => {
                xnew$1.extend(SVGTemplate, { fill: 'none', stroke, strokeOpacity, strokeWidth, strokeLinejoin });
                xnew$1('<polyline points="35 35 35  5 37  3 63  3 65  5 65 35">');
                xnew$1('<polyline points="35 65 35 95 37 97 63 97 65 95 65 65">');
                xnew$1('<polyline points="35 35  5 35  3 37  3 63  5 65 35 65">');
                xnew$1('<polyline points="65 35 95 35 97 37 97 63 95 65 65 65">');
                xnew$1('<polygon points="50 11 42 20 58 20">');
                xnew$1('<polygon points="50 89 42 80 58 80">');
                xnew$1('<polygon points="11 50 20 42 20 58">');
                xnew$1('<polygon points="89 50 80 42 80 58">');
            });
            const pointer = xnew$1(PointerEvent);
            pointer.on('-dragstart', ({ event, position }) => {
                const vector = getVector(position);
                targets[0].element.style.filter = (vector.y < 0) ? 'brightness(90%)' : '';
                targets[1].element.style.filter = (vector.y > 0) ? 'brightness(90%)' : '';
                targets[2].element.style.filter = (vector.x < 0) ? 'brightness(90%)' : '';
                targets[3].element.style.filter = (vector.x > 0) ? 'brightness(90%)' : '';
                self.emit('-down', { vector });
            });
            pointer.on('-dragmove', ({ event, position }) => {
                const vector = getVector(position);
                targets[0].element.style.filter = (vector.y < 0) ? 'brightness(90%)' : '';
                targets[1].element.style.filter = (vector.y > 0) ? 'brightness(90%)' : '';
                targets[2].element.style.filter = (vector.x < 0) ? 'brightness(90%)' : '';
                targets[3].element.style.filter = (vector.x > 0) ? 'brightness(90%)' : '';
                self.emit('-move', { vector });
            });
            pointer.on('-dragend', ({ event }) => {
                const vector = { x: 0, y: 0 };
                targets[0].element.style.filter = '';
                targets[1].element.style.filter = '';
                targets[2].element.style.filter = '';
                targets[3].element.style.filter = '';
                self.emit('-up', { vector });
            });
            function getVector(position) {
                const x = position.x - newsize / 2;
                const y = position.y - newsize / 2;
                const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
                const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (newsize / 4));
                const vector = { x: Math.cos(a) * d, y: Math.sin(a) * d };
                if (diagonal === true) {
                    vector.x = Math.abs(vector.x) > 0.5 ? Math.sign(vector.x) : 0;
                    vector.y = Math.abs(vector.y) > 0.5 ? Math.sign(vector.y) : 0;
                }
                else if (Math.abs(vector.x) > Math.abs(vector.y)) {
                    vector.x = Math.abs(vector.x) > 0.5 ? Math.sign(vector.x) : 0;
                    vector.y = 0;
                }
                else {
                    vector.x = 0;
                    vector.y = Math.abs(vector.y) > 0.5 ? Math.sign(vector.y) : 0;
                }
                return vector;
            }
        });
    }

    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 1.0;
    master.connect(context.destination);
    window.addEventListener('touchstart', initialize, true);
    window.addEventListener('mousedown', initialize, true);
    function initialize() {
        new Synthesizer({ oscillator: { type: 'sine' }, amp: { envelope: { amount: 0, ADSR: [0, 0, 0, 0] } } }).press(440);
        window.removeEventListener('touchstart', initialize, true);
        window.removeEventListener('mousedown', initialize, true);
    }
    const audio = {
        load(path) {
            return new AudioFile(path);
        },
        synthesizer(props) {
            return new Synthesizer(props);
        },
        get volume() {
            return master.gain.value;
        },
        set volume(value) {
            master.gain.value = value;
        }
    };
    //----------------------------------------------------------------------------------------------------
    // audio file
    //----------------------------------------------------------------------------------------------------
    class AudioFile {
        constructor(path) {
            this.promise = fetch(path)
                .then((response) => response.arrayBuffer())
                .then((response) => context.decodeAudioData(response))
                .then((response) => {
                this.buffer = response;
            })
                .catch(() => {
                console.warn(`"${path}" could not be loaded.`);
            });
            this.start = null;
        }
        // set volume(value: number) {
        //     this.amp.gain.value = value;
        // }
        // get volume(): number {
        //     return this.amp.gain.value;
        // }
        play(offset = 0, loop = false) {
            if (this.buffer !== undefined && this.start === null) {
                this.source = context.createBufferSource();
                this.source.buffer = this.buffer;
                this.source.loop = loop;
                this.amp = context.createGain();
                this.amp.gain.value = 1.0;
                this.source.connect(this.amp);
                this.amp.connect(master);
                this.start = context.currentTime;
                this.source.playbackRate.value = 1;
                this.source.start(context.currentTime, offset / 1000);
                this.source.onended = () => {
                    var _a, _b;
                    this.start = null;
                    (_a = this.source) === null || _a === void 0 ? void 0 : _a.disconnect();
                    (_b = this.amp) === null || _b === void 0 ? void 0 : _b.disconnect();
                };
            }
        }
        pause() {
            var _a;
            if (this.buffer !== undefined && this.start !== null) {
                (_a = this.source) === null || _a === void 0 ? void 0 : _a.stop(context.currentTime);
                const elapsed = (context.currentTime - this.start) % this.buffer.duration * 1000;
                this.start = null;
                return elapsed;
            }
        }
    }
    const keymap = {
        'A0': 27.500, 'A#0': 29.135, 'B0': 30.868,
        'C1': 32.703, 'C#1': 34.648, 'D1': 36.708, 'D#1': 38.891, 'E1': 41.203, 'F1': 43.654, 'F#1': 46.249, 'G1': 48.999, 'G#1': 51.913, 'A1': 55.000, 'A#1': 58.270, 'B1': 61.735,
        'C2': 65.406, 'C#2': 69.296, 'D2': 73.416, 'D#2': 77.782, 'E2': 82.407, 'F2': 87.307, 'F#2': 92.499, 'G2': 97.999, 'G#2': 103.826, 'A2': 110.000, 'A#2': 116.541, 'B2': 123.471,
        'C3': 130.813, 'C#3': 138.591, 'D3': 146.832, 'D#3': 155.563, 'E3': 164.814, 'F3': 174.614, 'F#3': 184.997, 'G3': 195.998, 'G#3': 207.652, 'A3': 220.000, 'A#3': 233.082, 'B3': 246.942,
        'C4': 261.626, 'C#4': 277.183, 'D4': 293.665, 'D#4': 311.127, 'E4': 329.628, 'F4': 349.228, 'F#4': 369.994, 'G4': 391.995, 'G#4': 415.305, 'A4': 440.000, 'A#4': 466.164, 'B4': 493.883,
        'C5': 523.251, 'C#5': 554.365, 'D5': 587.330, 'D#5': 622.254, 'E5': 659.255, 'F5': 698.456, 'F#5': 739.989, 'G5': 783.991, 'G#5': 830.609, 'A5': 880.000, 'A#5': 932.328, 'B5': 987.767,
        'C6': 1046.502, 'C#6': 1108.731, 'D6': 1174.659, 'D#6': 1244.508, 'E6': 1318.510, 'F6': 1396.913, 'F#6': 1479.978, 'G6': 1567.982, 'G#6': 1661.219, 'A6': 1760.000, 'A#6': 1864.655, 'B6': 1975.533,
        'C7': 2093.005, 'C#7': 2217.461, 'D7': 2349.318, 'D#7': 2489.016, 'E7': 2637.020, 'F7': 2793.826, 'F#7': 2959.955, 'G7': 3135.963, 'G#7': 3322.438, 'A7': 3520.000, 'A#7': 3729.310, 'B7': 3951.066,
        'C8': 4186.009,
    };
    const notemap = {
        '1m': 4.000, '2n': 2.000, '4n': 1.000, '8n': 0.500, '16n': 0.250, '32n': 0.125,
    };
    class Synthesizer {
        constructor(props) { this.props = props; }
        press(frequency, duration, wait) {
            var _a;
            const props = this.props;
            const fv = typeof frequency === 'string' ? keymap[frequency] : frequency;
            const dv = typeof duration === 'string' ? (notemap[duration] * 60 / ((_a = props.bpm) !== null && _a !== void 0 ? _a : 120)) : (typeof duration === 'number' ? (duration / 1000) : 0);
            const start = context.currentTime + (wait !== null && wait !== void 0 ? wait : 0) / 1000;
            const nodes = {};
            nodes.oscillator = context.createOscillator();
            nodes.oscillator.type = props.oscillator.type;
            nodes.oscillator.frequency.value = fv;
            if (props.oscillator.LFO) {
                nodes.oscillatorLFO = context.createOscillator();
                nodes.oscillatorLFODepth = context.createGain();
                nodes.oscillatorLFODepth.gain.value = fv * (Math.pow(2.0, props.oscillator.LFO.amount / 12.0) - 1.0);
                nodes.oscillatorLFO.type = props.oscillator.LFO.type;
                nodes.oscillatorLFO.frequency.value = props.oscillator.LFO.rate;
                nodes.oscillatorLFO.start(start);
                nodes.oscillatorLFO.connect(nodes.oscillatorLFODepth);
                nodes.oscillatorLFODepth.connect(nodes.oscillator.frequency);
            }
            nodes.amp = context.createGain();
            nodes.amp.gain.value = 0.0;
            nodes.target = context.createGain();
            nodes.target.gain.value = 1.0;
            nodes.amp.connect(nodes.target);
            nodes.target.connect(master);
            if (props.filter) {
                nodes.filter = context.createBiquadFilter();
                nodes.filter.type = props.filter.type;
                nodes.filter.frequency.value = props.filter.cutoff;
                nodes.oscillator.connect(nodes.filter);
                nodes.filter.connect(nodes.amp);
            }
            else {
                nodes.oscillator.connect(nodes.amp);
            }
            if (props.reverb) {
                nodes.convolver = context.createConvolver();
                nodes.convolver.buffer = impulseResponse({ time: props.reverb.time });
                nodes.convolverDepth = context.createGain();
                nodes.convolverDepth.gain.value = 1.0;
                nodes.convolverDepth.gain.value *= props.reverb.mix;
                nodes.target.gain.value *= (1.0 - props.reverb.mix);
                nodes.amp.connect(nodes.convolver);
                nodes.convolver.connect(nodes.convolverDepth);
                nodes.convolverDepth.connect(master);
            }
            if (props.oscillator.envelope) {
                const amount = fv * (Math.pow(2.0, props.oscillator.envelope.amount / 12.0) - 1.0);
                startEnvelope(nodes.oscillator.frequency, fv, amount, props.oscillator.envelope.ADSR);
            }
            if (props.amp.envelope) {
                startEnvelope(nodes.amp.gain, 0.0, props.amp.envelope.amount, props.amp.envelope.ADSR);
            }
            nodes.oscillator.start(start);
            if (dv > 0) {
                release();
            }
            else {
                return { release };
            }
            function release() {
                let stop = null;
                const end = dv > 0 ? dv : (context.currentTime - start);
                if (props.amp.envelope) {
                    const ADSR = props.amp.envelope.ADSR;
                    const adsr = [ADSR[0] / 1000, ADSR[1] / 1000, ADSR[2], ADSR[3] / 1000];
                    const rate = adsr[0] === 0.0 ? 1.0 : Math.min(end / adsr[0], 1.0);
                    stop = start + Math.max((adsr[0] + adsr[1]) * rate, end) + adsr[3];
                }
                else {
                    stop = start + end;
                }
                if (nodes.oscillatorLFO) {
                    nodes.oscillatorLFO.stop(stop);
                }
                if (props.oscillator.envelope) {
                    const amount = fv * (Math.pow(2.0, props.oscillator.envelope.amount / 12.0) - 1.0);
                    stopEnvelope(nodes.oscillator.frequency, fv, amount, props.oscillator.envelope.ADSR);
                }
                if (props.amp.envelope) {
                    stopEnvelope(nodes.amp.gain, 0.0, props.amp.envelope.amount, props.amp.envelope.ADSR);
                }
                nodes.oscillator.stop(stop);
                setTimeout(() => {
                    var _a, _b, _c, _d, _e;
                    nodes.oscillator.disconnect();
                    nodes.amp.disconnect();
                    nodes.target.disconnect();
                    (_a = nodes.oscillatorLFO) === null || _a === void 0 ? void 0 : _a.disconnect();
                    (_b = nodes.oscillatorLFODepth) === null || _b === void 0 ? void 0 : _b.disconnect();
                    (_c = nodes.filter) === null || _c === void 0 ? void 0 : _c.disconnect();
                    (_d = nodes.convolver) === null || _d === void 0 ? void 0 : _d.disconnect();
                    (_e = nodes.convolverDepth) === null || _e === void 0 ? void 0 : _e.disconnect();
                }, 2000);
            }
            function stopEnvelope(param, base, amount, ADSR) {
                const rate = ADSR[0] === 0.0 ? 1.0 : Math.min(dv / (ADSR[0] / 1000), 1.0);
                if (rate < 1.0) {
                    param.cancelScheduledValues(start);
                    param.setValueAtTime(base, start);
                    param.linearRampToValueAtTime(base + amount * rate, start + ADSR[0] / 1000 * rate);
                    param.linearRampToValueAtTime(base + amount * rate * ADSR[2], start + (ADSR[0] + ADSR[1]) / 1000 * rate);
                }
                param.linearRampToValueAtTime(base + amount * rate * ADSR[2], start + Math.max((ADSR[0] + ADSR[1]) / 1000 * rate, dv));
                param.linearRampToValueAtTime(base, start + Math.max((ADSR[0] + ADSR[1]) / 1000 * rate, dv) + ADSR[3] / 1000);
            }
            function startEnvelope(param, base, amount, ADSR) {
                param.value = base;
                param.setValueAtTime(base, start);
                param.linearRampToValueAtTime(base + amount, start + ADSR[0] / 1000);
                param.linearRampToValueAtTime(base + amount * ADSR[2], start + (ADSR[0] + ADSR[1]) / 1000);
            }
            function impulseResponse({ time, decay = 2.0 }) {
                const length = context.sampleRate * time / 1000;
                const impulse = context.createBuffer(2, length, context.sampleRate);
                const ch0 = impulse.getChannelData(0);
                const ch1 = impulse.getChannelData(1);
                for (let i = 0; i < length; i++) {
                    ch0[i] = (2 * Math.random() - 1) * Math.pow(1 - i / length, decay);
                    ch1[i] = (2 * Math.random() - 1) * Math.pow(1 - i / length, decay);
                }
                return impulse;
            }
        }
    }

    const basics = {
        Screen,
        PointerEvent,
        ResizeEvent,
        KeyboardEvent,
        ModalFrame,
        ModalContent,
        AccordionFrame,
        AccordionHeader,
        AccordionBullet,
        AccordionContent,
        TabFrame,
        TabButton,
        TabContent,
        DragFrame,
        DragTarget,
        AnalogStick,
        DirectionalPad,
    };
    const xnew = Object.assign(xnew$1, {
        basics,
        audio
    });

    return xnew;

}));
