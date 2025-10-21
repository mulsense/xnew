(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xnew = factory());
})(this, (function () { 'use strict';

    //----------------------------------------------------------------------------------------------------
    // ticker
    //----------------------------------------------------------------------------------------------------
    class Ticker {
        static ticker() {
            const time = Date.now();
            const interval = 1000 / 60;
            if (time - Ticker.previous > interval * 0.8) {
                Ticker.callbacks.forEach((callback) => callback(time));
                Ticker.previous = time;
            }
            Ticker.animation = requestAnimationFrame(Ticker.ticker);
        }
        static set(callback) {
            if (Ticker.animation === null && typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
                Ticker.previous = Date.now();
                Ticker.animation = requestAnimationFrame(Ticker.ticker);
            }
            Ticker.callbacks.add(callback);
        }
        static clear(callback) {
            Ticker.callbacks.delete(callback);
        }
    }
    Ticker.animation = null;
    Ticker.callbacks = new Set;
    Ticker.previous = 0.0;
    //----------------------------------------------------------------------------------------------------
    // timer
    //----------------------------------------------------------------------------------------------------
    class Timer {
        constructor(timeout, transition, delay, loop = false) {
            var _a, _b;
            this.timeout = timeout;
            this.transition = transition;
            this.delay = delay;
            this.loop = loop;
            this.id = null;
            this.time = 0.0;
            this.offset = 0.0;
            this.status = 0;
            this.ticker = (time) => {
                var _a;
                (_a = this.transition) === null || _a === void 0 ? void 0 : _a.call(this, this.elapsed() / this.delay);
            };
            (_a = this.transition) === null || _a === void 0 ? void 0 : _a.call(this, 0.0);
            if (this.delay <= 0) {
                timeout();
                (_b = this.transition) === null || _b === void 0 ? void 0 : _b.call(this, 1.0);
            }
            else {
                if (document instanceof Document) {
                    this.visibilitychange = () => document.hidden === false ? this._start() : this._stop();
                    document.addEventListener('visibilitychange', this.visibilitychange);
                }
                this.start();
                Ticker.set(this.ticker);
            }
        }
        clear() {
            if (this.id !== null) {
                clearTimeout(this.id);
                this.id = null;
            }
            if (document instanceof Document && this.visibilitychange !== undefined) {
                document.removeEventListener('visibilitychange', this.visibilitychange);
            }
            Ticker.clear(this.ticker);
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
                    this.time = 0.0;
                    this.offset = 0.0;
                    if (this.loop) {
                        this.start();
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
                this.time = 0.0;
            }
        }
    }

    //----------------------------------------------------------------------------------------------------
    // map ex
    //----------------------------------------------------------------------------------------------------
    class MapEx {
        constructor() {
            this.map = new Map;
        }
        get size() {
            return this.map.size;
        }
        forEach(callback) {
            this.map.forEach(callback);
        }
        clear() {
            this.map.clear();
        }
    }
    //----------------------------------------------------------------------------------------------------
    // map set
    //----------------------------------------------------------------------------------------------------
    class MapSet extends MapEx {
        has(key, value) {
            var _a, _b;
            if (value === undefined) {
                return this.map.has(key);
            }
            else {
                return (_b = (_a = this.map.get(key)) === null || _a === void 0 ? void 0 : _a.has(value)) !== null && _b !== void 0 ? _b : false;
            }
        }
        get(key) {
            return this.map.get(key);
        }
        keys() {
            return this.map.keys();
        }
        add(key, value) {
            var _a;
            this.map.set(key, ((_a = this.map.get(key)) !== null && _a !== void 0 ? _a : new Set).add(value));
            return this;
        }
        delete(key, value) {
            var _a, _b, _c, _d;
            let ret = false;
            if (value === undefined) {
                ret = (((_a = this.map.get(key)) === null || _a === void 0 ? void 0 : _a.size) === 0) ? this.map.delete(key) : false;
            }
            else {
                ret = (_c = (_b = this.map.get(key)) === null || _b === void 0 ? void 0 : _b.delete(value)) !== null && _c !== void 0 ? _c : false;
                (((_d = this.map.get(key)) === null || _d === void 0 ? void 0 : _d.size) === 0) && this.map.delete(key);
            }
            return ret;
        }
    }
    //----------------------------------------------------------------------------------------------------
    // map map
    //----------------------------------------------------------------------------------------------------
    class MapMap extends MapEx {
        has(key1, key2) {
            var _a, _b;
            if (key2 === undefined) {
                return this.map.has(key1);
            }
            else {
                return (_b = (_a = this.map.get(key1)) === null || _a === void 0 ? void 0 : _a.has(key2)) !== null && _b !== void 0 ? _b : false;
            }
        }
        set(key1, key2, value) {
            var _a;
            this.map.set(key1, ((_a = this.map.get(key1)) !== null && _a !== void 0 ? _a : new Map).set(key2, value));
            return this;
        }
        get(key1, key2) {
            var _a;
            if (key2 === undefined) {
                return this.map.get(key1);
            }
            else {
                return (_a = this.map.get(key1)) === null || _a === void 0 ? void 0 : _a.get(key2);
            }
        }
        keys(key1) {
            var _a, _b;
            if (key1 === undefined) {
                return this.map.keys();
            }
            else {
                return (_b = (_a = this.map.get(key1)) === null || _a === void 0 ? void 0 : _a.keys()) !== null && _b !== void 0 ? _b : (function* () { })();
            }
        }
        delete(key1, key2) {
            var _a, _b, _c, _d;
            let ret = false;
            if (key2 === undefined) {
                ret = (((_a = this.map.get(key1)) === null || _a === void 0 ? void 0 : _a.size) === 0) ? this.map.delete(key1) : false;
            }
            else {
                ret = (_c = (_b = this.map.get(key1)) === null || _b === void 0 ? void 0 : _b.delete(key2)) !== null && _c !== void 0 ? _c : false;
                (((_d = this.map.get(key1)) === null || _d === void 0 ? void 0 : _d.size) === 0) && this.map.delete(key1);
            }
            return ret;
        }
    }
    //----------------------------------------------------------------------------------------------------
    // map map map
    //----------------------------------------------------------------------------------------------------
    class MapMapMap extends MapEx {
        has(key1, key2, key3) {
            var _a, _b;
            if (key2 === undefined) {
                return this.map.has(key1);
            }
            else {
                return (_b = (_a = this.map.get(key1)) === null || _a === void 0 ? void 0 : _a.has(key2, key3)) !== null && _b !== void 0 ? _b : false;
            }
        }
        set(key1, key2, key3, value) {
            var _a;
            this.map.set(key1, ((_a = this.map.get(key1)) !== null && _a !== void 0 ? _a : new MapMap).set(key2, key3, value));
            return this;
        }
        get(key1, key2, key3) {
            var _a, _b;
            if (key2 === undefined) {
                return this.map.get(key1);
            }
            else if (key3 === undefined) {
                return (_a = this.map.get(key1)) === null || _a === void 0 ? void 0 : _a.get(key2);
            }
            else {
                return (_b = this.map.get(key1)) === null || _b === void 0 ? void 0 : _b.get(key2, key3);
            }
        }
        keys(key1, key2) {
            var _a, _b, _c, _d, _e;
            if (key1 === undefined) {
                return this.map.keys();
            }
            else if (key2 === undefined) {
                return (_b = (_a = this.map.get(key1)) === null || _a === void 0 ? void 0 : _a.keys()) !== null && _b !== void 0 ? _b : (function* () { })();
            }
            else {
                return (_e = (_d = (_c = this.map.get(key1)) === null || _c === void 0 ? void 0 : _c.get(key2)) === null || _d === void 0 ? void 0 : _d.keys()) !== null && _e !== void 0 ? _e : (function* () { })();
            }
        }
        delete(key1, key2, key3) {
            var _a, _b, _c, _d;
            let ret = false;
            if (key2 === undefined) {
                ret = (((_a = this.map.get(key1)) === null || _a === void 0 ? void 0 : _a.size) === 0) ? this.map.delete(key1) : false;
            }
            else {
                ret = (_c = (_b = this.map.get(key1)) === null || _b === void 0 ? void 0 : _b.delete(key2, key3)) !== null && _c !== void 0 ? _c : false;
                (((_d = this.map.get(key1)) === null || _d === void 0 ? void 0 : _d.size) === 0) && this.map.delete(key1);
            }
            return ret;
        }
    }

    //----------------------------------------------------------------------------------------------------
    // Constants
    //----------------------------------------------------------------------------------------------------
    const LIFECYCLE_EVENTS = ['start', 'update', 'stop', 'finalize'];
    const LIFECYCLE_STATES = {
        INVOKED: 'invoked',
        INITIALIZED: 'initialized',
        STARTED: 'started',
        STOPPED: 'stopped',
        PRE_FINALIZED: 'pre finalized',
        FINALIZED: 'finalized',
    };
    const CUSTOM_EVENT_PREFIX = {
        GLOBAL: '+',
        INTERNAL: '-',
    };
    //----------------------------------------------------------------------------------------------------
    // unit main
    //----------------------------------------------------------------------------------------------------
    class Unit {
        constructor(parent, target, component, props) {
            var _a, _b, _c, _d, _e;
            let baseElement;
            if (target instanceof HTMLElement || target instanceof SVGElement) {
                baseElement = target;
            }
            else if (parent !== null) {
                baseElement = (_a = parent._.currentElement) !== null && _a !== void 0 ? _a : parent._.baseElement;
            }
            else {
                baseElement = (_c = (_b = document.currentScript) === null || _b === void 0 ? void 0 : _b.parentElement) !== null && _c !== void 0 ? _c : document.body;
            }
            this._ = {
                root: (_d = parent === null || parent === void 0 ? void 0 : parent._.root) !== null && _d !== void 0 ? _d : this,
                peers: (_e = parent === null || parent === void 0 ? void 0 : parent._.children) !== null && _e !== void 0 ? _e : Unit.roots,
                inputs: { parent, target, component, props },
                nextElementSibling: null,
                baseElement,
                baseContext: UnitScope.get(parent),
            };
            this._.peers.push(this);
            Unit.initialize(this);
        }
        get element() {
            return this._.currentElement;
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
            this._.peers = this._.peers.filter((unit) => unit !== this);
        }
        reboot() {
            Unit.stop(this);
            if (this._.currentElement !== this._.baseElement) {
                let currentElement = this._.currentElement;
                if (currentElement.parentElement === this._.baseElement) {
                    this._.nextElementSibling = currentElement.nextElementSibling;
                }
            }
            Unit.finalize(this);
            Unit.initialize(this);
        }
        get components() {
            return this._.components;
        }
        on(type, listener, options) {
            try {
                if (typeof type === 'string') {
                    const filtered = type.trim().split(/\s+/).filter((type) => LIFECYCLE_EVENTS.includes(type));
                    filtered.forEach((type) => {
                        this._.system[type].push(listener);
                    });
                }
                UnitEvent.on(this, type, listener, options);
            }
            catch (error) {
                console.error('unit.on(type, listener, option?): ', error);
            }
            return this;
        }
        off(type, listener) {
            try {
                if (type === undefined) {
                    this._.system = { start: [], update: [], stop: [], finalize: [] };
                }
                else if (typeof type === 'string') {
                    const filtered = type.trim().split(/\s+/).filter((type) => LIFECYCLE_EVENTS.includes(type));
                    filtered.forEach((type) => {
                        if (listener === undefined) {
                            this._.system[type] = [];
                        }
                        else {
                            this._.system[type] = this._.system[type].filter((l) => l !== listener);
                        }
                    });
                }
                UnitEvent.off(this, type, listener);
            }
            catch (error) {
                console.error('unit.off(type, listener): ', error);
            }
            return this;
        }
        //----------------------------------------------------------------------------------------------------
        // internal
        //----------------------------------------------------------------------------------------------------
        static initialize(unit) {
            var _a;
            unit._ = Object.assign(unit._, {
                children: [],
                components: [],
                captures: [],
                state: LIFECYCLE_STATES.INVOKED,
                tostart: true,
                currentElement: unit._.baseElement,
                upcount: 0,
                resolved: false,
                defines: {},
                system: { start: [], update: [], stop: [], finalize: [] },
            });
            UnitScope.initialize(unit, unit._.baseContext);
            // nest html element
            if (typeof unit._.inputs.target === 'string') {
                Unit.nest(unit, unit._.inputs.target);
            }
            // setup component
            if (typeof unit._.inputs.component === 'function') {
                UnitScope.execute({ unit, context: null, element: null }, () => Unit.extend(unit, unit._.inputs.component, unit._.inputs.props));
            }
            else if (typeof unit._.inputs.component === 'string') {
                unit.element.innerHTML = unit._.inputs.component;
            }
            // whether the unit promise was resolved
            (_a = UnitPromise.get(unit)) === null || _a === void 0 ? void 0 : _a.then(() => {
                unit._.resolved = true;
            });
            unit._.state = LIFECYCLE_STATES.INITIALIZED;
            let current = unit;
            while (current !== null) {
                let captured = false;
                for (const capture of current._.captures) {
                    if (capture.checker(unit)) {
                        capture.execute(unit);
                        captured = true;
                    }
                }
                if (captured === false) {
                    current = current._.inputs.parent;
                }
                else {
                    break;
                }
            }
        }
        static finalize(unit) {
            const { state } = unit._;
            if (state !== LIFECYCLE_STATES.FINALIZED && state !== LIFECYCLE_STATES.PRE_FINALIZED) {
                unit._.state = LIFECYCLE_STATES.PRE_FINALIZED;
                unit._.children.forEach((child) => child.finalize());
                unit._.system.finalize.forEach((listener) => {
                    UnitScope.execute(UnitScope.snapshot(unit), listener);
                });
                UnitEvent.off(unit);
                UnitSubEvent.off(unit, null);
                UnitScope.finalize(unit);
                UnitComponent.finalize(unit);
                UnitPromise.finalize(unit);
                while (unit._.currentElement !== unit._.baseElement && unit._.currentElement.parentElement !== null) {
                    const parent = unit._.currentElement.parentElement;
                    parent.removeChild(unit._.currentElement);
                    unit._.currentElement = parent;
                }
                // reset defines
                Object.keys(unit._.defines).forEach((key) => {
                    if (!LIFECYCLE_EVENTS.includes(key)) {
                        delete unit[key];
                    }
                });
                unit._.defines = {};
                unit._.state = LIFECYCLE_STATES.FINALIZED;
            }
        }
        static nest(unit, tag, ...args) {
            const match = tag.match(/<((\w+)[^>]*?)\/?>/);
            if (match !== null) {
                let element;
                if (unit._.nextElementSibling) {
                    unit._.nextElementSibling.insertAdjacentHTML('beforebegin', `<${match[1]}></${match[2]}>`);
                    element = unit._.nextElementSibling.previousElementSibling;
                    unit._.nextElementSibling = null;
                }
                else {
                    unit.element.insertAdjacentHTML('beforeend', `<${match[1]}></${match[2]}>`);
                    element = unit.element.children[unit.element.children.length - 1];
                }
                if (typeof args[0] === 'object') {
                    const attributes = args.shift();
                    Object.keys(attributes).forEach((key) => {
                        if (attributes[key] !== undefined) {
                            if (key === 'className') {
                                element.className = attributes[key];
                            }
                            else if (key === 'style') {
                                Object.assign(element.style, attributes[key]);
                            }
                            else {
                                element.setAttribute(key, attributes[key]);
                            }
                        }
                    });
                }
                unit._.currentElement = element;
                if (typeof args[0] === 'string') {
                    unit.element.innerHTML = args.shift();
                }
            }
            return unit.element;
        }
        static extend(unit, component, props) {
            var _a;
            unit._.components.push(component);
            UnitComponent.add(unit, component);
            const defines = (_a = component(unit, props)) !== null && _a !== void 0 ? _a : {};
            const snapshot = UnitScope.snapshot(unit);
            Object.keys(defines).forEach((key) => {
                const descriptor = Object.getOwnPropertyDescriptor(defines, key);
                if (unit[key] !== undefined && unit._.defines[key] === undefined) {
                    throw new Error(`The property "${key}" already exists.`);
                }
                const newDescriptor = { configurable: true, enumerable: true };
                if (descriptor === null || descriptor === void 0 ? void 0 : descriptor.get) {
                    newDescriptor.get = (...args) => UnitScope.execute(snapshot, descriptor.get, ...args);
                }
                if (descriptor === null || descriptor === void 0 ? void 0 : descriptor.set) {
                    newDescriptor.set = (...args) => UnitScope.execute(snapshot, descriptor.set, ...args);
                }
                if (typeof (descriptor === null || descriptor === void 0 ? void 0 : descriptor.value) === 'function') {
                    newDescriptor.value = (...args) => UnitScope.execute(snapshot, descriptor.value, ...args);
                }
                else if ((descriptor === null || descriptor === void 0 ? void 0 : descriptor.value) !== undefined) {
                    newDescriptor.writable = true;
                    newDescriptor.value = descriptor.value;
                }
                Object.defineProperty(unit._.defines, key, newDescriptor);
                Object.defineProperty(unit, key, newDescriptor);
            });
        }
        static start(unit, time) {
            if (!unit._.resolved || !unit._.tostart)
                return;
            const { state } = unit._;
            if (state === LIFECYCLE_STATES.INVOKED || state === LIFECYCLE_STATES.INITIALIZED || state === LIFECYCLE_STATES.STOPPED) {
                unit._.state = LIFECYCLE_STATES.STARTED;
                unit._.children.forEach((child) => Unit.start(child, time));
                unit._.system.start.forEach((listener) => {
                    UnitScope.execute(UnitScope.snapshot(unit), listener);
                });
            }
            else if (state === LIFECYCLE_STATES.STARTED) {
                unit._.children.forEach((child) => Unit.start(child, time));
            }
        }
        static stop(unit) {
            if (unit._.state === LIFECYCLE_STATES.STARTED) {
                unit._.state = LIFECYCLE_STATES.STOPPED;
                unit._.children.forEach((child) => Unit.stop(child));
                unit._.system.stop.forEach((listener) => {
                    UnitScope.execute(UnitScope.snapshot(unit), listener);
                });
            }
        }
        static update(unit, time) {
            if (unit._.state === LIFECYCLE_STATES.STARTED) {
                unit._.children.forEach((child) => Unit.update(child, time));
                if (unit._.state === LIFECYCLE_STATES.STARTED) {
                    unit._.system.update.forEach((listener) => {
                        UnitScope.execute(UnitScope.snapshot(unit), listener, unit._.upcount);
                    });
                    unit._.upcount++;
                }
            }
        }
        static ticker(time) {
            Unit.roots.forEach((unit) => {
                Unit.start(unit, time);
                Unit.update(unit, time);
            });
        }
        static reset() {
            Unit.roots.forEach((unit) => unit.finalize());
            Unit.roots = [];
            Ticker.clear(Unit.ticker);
            Ticker.set(Unit.ticker);
        }
    }
    Unit.roots = [];
    Unit.reset();
    //----------------------------------------------------------------------------------------------------
    // unit scope
    //----------------------------------------------------------------------------------------------------
    class UnitScope {
        static initialize(unit, context) {
            if (context !== null) {
                UnitScope.contexts.set(unit, context);
            }
        }
        static finalize(unit) {
            UnitScope.contexts.delete(unit);
        }
        static set(unit, context) {
            UnitScope.contexts.set(unit, context);
        }
        static get(unit) {
            var _a;
            return (_a = UnitScope.contexts.get(unit)) !== null && _a !== void 0 ? _a : null;
        }
        static execute(snapshot, func, ...args) {
            if (!snapshot)
                return;
            const current = UnitScope.current;
            let context = null;
            let element = null;
            try {
                UnitScope.current = snapshot.unit;
                if (snapshot.unit !== null) {
                    if (snapshot.context !== null) {
                        context = UnitScope.get(snapshot.unit);
                        UnitScope.contexts.set(snapshot.unit, snapshot.context);
                    }
                    if (snapshot.element !== null) {
                        element = snapshot.unit._.currentElement;
                        snapshot.unit._.currentElement = snapshot.element;
                    }
                }
                return func(...args);
            }
            catch (error) {
                throw error;
            }
            finally {
                UnitScope.current = current;
                if (snapshot.unit !== null) {
                    if (context !== null) {
                        UnitScope.contexts.set(snapshot.unit, context);
                    }
                    if (element !== null) {
                        snapshot.unit._.currentElement = element;
                    }
                }
            }
        }
        static snapshot(unit = UnitScope.current) {
            if (unit !== null) {
                return { unit, context: UnitScope.get(unit), element: unit.element };
            }
            return null;
        }
        static stack(unit, key, value) {
            UnitScope.contexts.set(unit, { stack: UnitScope.get(unit), key, value });
        }
        static trace(unit, key) {
            for (let context = UnitScope.get(unit); context !== null; context = context.stack) {
                if (context.key === key) {
                    return context.value;
                }
            }
        }
    }
    UnitScope.current = null;
    UnitScope.contexts = new Map();
    //----------------------------------------------------------------------------------------------------
    // unit component
    //----------------------------------------------------------------------------------------------------
    class UnitComponent {
        static finalize(unit) {
            var _a;
            (_a = UnitComponent.components.get(unit)) === null || _a === void 0 ? void 0 : _a.forEach((component) => {
                UnitComponent.units.delete(component, unit);
            });
            UnitComponent.components.delete(unit);
        }
        static add(unit, component) {
            UnitComponent.components.add(unit, component);
            UnitComponent.units.add(component, unit);
        }
        static find(component) {
            var _a;
            return [...((_a = UnitComponent.units.get(component)) !== null && _a !== void 0 ? _a : [])];
        }
    }
    UnitComponent.components = new MapSet();
    UnitComponent.units = new MapSet();
    //----------------------------------------------------------------------------------------------------
    // unit event
    //----------------------------------------------------------------------------------------------------
    class UnitEvent {
        static on(unit, type, listener, options) {
            if (typeof type !== 'string' || type.trim() === '') {
                throw new Error('"type" is invalid.');
            }
            else if (typeof listener !== 'function') {
                throw new Error('"listener" is invalid.');
            }
            const snapshot = UnitScope.snapshot();
            const types = type.trim().split(/\s+/);
            types.forEach((type) => {
                if (!UnitEvent.listeners.has(unit, type, listener)) {
                    const execute = (...args) => {
                        UnitScope.execute(snapshot, listener, ...args);
                    };
                    UnitEvent.listeners.set(unit, type, listener, [unit.element, execute]);
                    UnitEvent.units.add(type, unit);
                    if (/^[A-Za-z]/.test(type)) {
                        unit.element.addEventListener(type, execute, options);
                    }
                }
            });
        }
        static off(unit, type, listener) {
            if (typeof type === 'string' && type.trim() === '') {
                throw new Error('"type" is invalid.');
            }
            else if (listener !== undefined && typeof listener !== 'function') {
                throw new Error('"listener" is invalid.');
            }
            const types = typeof type === 'string' ? type.trim().split(/\s+/) : [...UnitEvent.listeners.keys(unit)];
            types.forEach((type) => {
                const listeners = listener ? [listener] : [...UnitEvent.listeners.keys(unit, type)];
                listeners.forEach((lis) => {
                    const tuple = UnitEvent.listeners.get(unit, type, lis);
                    if (tuple !== undefined) {
                        const [target, execute] = tuple;
                        UnitEvent.listeners.delete(unit, type, lis);
                        if (/^[A-Za-z]/.test(type)) {
                            target.removeEventListener(type, execute);
                        }
                    }
                });
                if (!UnitEvent.listeners.has(unit, type)) {
                    UnitEvent.units.delete(type, unit);
                }
            });
        }
        static emit(type, ...args) {
            var _a, _b;
            const unit = UnitScope.current;
            if (typeof type !== 'string') {
                throw new Error('The argument [type] is invalid.');
            }
            else if ((unit === null || unit === void 0 ? void 0 : unit._.state) === LIFECYCLE_STATES.FINALIZED) {
                throw new Error('This function can not be called after finalized.');
            }
            if (type[0] === CUSTOM_EVENT_PREFIX.GLOBAL) {
                (_a = UnitEvent.units.get(type)) === null || _a === void 0 ? void 0 : _a.forEach((unit) => {
                    var _a;
                    (_a = UnitEvent.listeners.get(unit, type)) === null || _a === void 0 ? void 0 : _a.forEach(([_, execute]) => execute(...args));
                });
            }
            else if (type[0] === CUSTOM_EVENT_PREFIX.INTERNAL && unit !== null) {
                (_b = UnitEvent.listeners.get(unit, type)) === null || _b === void 0 ? void 0 : _b.forEach(([_, execute]) => execute(...args));
            }
        }
    }
    UnitEvent.units = new MapSet;
    UnitEvent.listeners = new MapMapMap;
    class UnitSubEvent {
        static on(unit, target, type, listener, options) {
            if (typeof type !== 'string' || type.trim() === '') {
                throw new Error('"type" is invalid.');
            }
            else if (typeof listener !== 'function') {
                throw new Error('"listener" is invalid.');
            }
            const snapshot = UnitScope.snapshot();
            const types = type.trim().split(/\s+/);
            types.forEach((type) => {
                if (!UnitSubEvent.listeners.has(unit, type, listener)) {
                    const execute = (...args) => {
                        UnitScope.execute(snapshot, listener, ...args);
                    };
                    UnitSubEvent.listeners.set(unit, type, listener, [target, execute]);
                    target.addEventListener(type, execute, options);
                }
            });
        }
        static off(unit, target, type, listener) {
            if (typeof type === 'string' && type.trim() === '') {
                throw new Error('"type" is invalid.');
            }
            else if (listener !== undefined && typeof listener !== 'function') {
                throw new Error('"listener" is invalid.');
            }
            const types = typeof type === 'string' ? type.trim().split(/\s+/) : [...UnitSubEvent.listeners.keys(unit)];
            types.forEach((type) => {
                const listeners = listener ? [listener] : [...UnitSubEvent.listeners.keys(unit, type)];
                listeners.forEach((lis) => {
                    const tuple = UnitSubEvent.listeners.get(unit, type, lis);
                    if (tuple !== undefined) {
                        const [element, execute] = tuple;
                        if (target === null || target === element) {
                            UnitSubEvent.listeners.delete(unit, type, lis);
                            element.removeEventListener(type, execute);
                        }
                    }
                });
            });
        }
    }
    UnitSubEvent.listeners = new MapMapMap;
    //----------------------------------------------------------------------------------------------------
    // unit promise
    //----------------------------------------------------------------------------------------------------
    class UnitPromise {
        constructor(executor) {
            this.promise = new Promise(executor);
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
        static get(unit) {
            var _a;
            return Promise.all([...((_a = UnitPromise.promises.get(unit)) !== null && _a !== void 0 ? _a : [])]);
        }
        static finalize(unit) {
            UnitPromise.promises.delete(unit);
        }
        static execute(unit, mix) {
            let promise = null;
            if (mix instanceof Promise) {
                promise = mix;
            }
            else if (typeof mix === 'function') {
                promise = new Promise(mix);
            }
            else if (mix instanceof Unit) {
                promise = UnitPromise.get(mix);
            }
            else {
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
    UnitPromise.promises = new MapSet();

    const xnew$1 = (() => {
        const fn = function (...args) {
            try {
                let parent;
                if (args[0] instanceof Unit) {
                    parent = args.shift();
                }
                else if (args[0] === null) {
                    parent = args.shift();
                }
                else if (args[0] === undefined) {
                    args.shift();
                    parent = UnitScope.current;
                }
                else {
                    parent = UnitScope.current;
                }
                let target;
                if (args[0] instanceof HTMLElement || args[0] instanceof SVGElement) {
                    target = args.shift(); // an existing html element
                }
                else if (typeof args[0] === 'string') {
                    const str = args.shift(); // a selector for an existing html element
                    const match = str.match(/<([^>]*)\/?>/);
                    if (match) {
                        target = str;
                    }
                    else {
                        target = document.querySelector(str);
                        if (target == null) {
                            throw new Error(`'${str}' can not be found.`);
                        }
                    }
                }
                else if (typeof args[0] !== null && typeof args[0] === 'object') {
                    target = args.shift(); // an attributes for a new html element
                }
                else if (args[0] === null || args[0] === undefined) {
                    args.shift();
                    target = null;
                }
                else {
                    target = null;
                }
                if (!(args[0] === undefined || typeof args[0] === 'function' || ((target !== null && (typeof target === 'object' || typeof target === 'string')) && typeof args[0] === 'string'))) {
                    throw new Error('The argument [parent, target, component] is invalid.');
                }
                const unit = new Unit(parent, target, ...args);
                if (unit === undefined) {
                    throw '';
                }
                return unit;
            }
            catch (error) {
                console.error('xnew: ', error);
                throw '';
            }
        };
        fn.nest = (tag, ...args) => {
            try {
                const current = UnitScope.current;
                if ((current === null || current === void 0 ? void 0 : current._.state) === 'invoked') {
                    const element = Unit.nest(current, tag);
                    if (element instanceof HTMLElement || element instanceof SVGElement) {
                        return element;
                    }
                    else {
                        throw new Error('');
                    }
                }
                else {
                    throw new Error('This function can not be called after initialized.');
                }
            }
            catch (error) {
                console.error('xnew.nest(attributes): ', error);
                throw new Error('');
            }
        };
        fn.extend = (component, props) => {
            try {
                const current = UnitScope.current;
                if ((current === null || current === void 0 ? void 0 : current._.state) === 'invoked') {
                    return Unit.extend(current, component, props);
                }
                else {
                    throw new Error('This function can not be called after initialized.');
                }
            }
            catch (error) {
                console.error('xnew.extend(component, props): ', error);
            }
        };
        fn.context = (key, value = undefined) => {
            try {
                const unit = UnitScope.current;
                if (typeof key !== 'string') {
                    throw new Error('The argument [key] is invalid.');
                }
                else if (unit !== null) {
                    if (value !== undefined) {
                        UnitScope.stack(unit, key, value);
                    }
                    else {
                        return UnitScope.trace(unit, key);
                    }
                }
                else {
                    return undefined;
                }
            }
            catch (error) {
                console.error('xnew.context(key, value?): ', error);
            }
        };
        fn.promise = (mix) => {
            try {
                return UnitPromise.execute(UnitScope.current, mix);
            }
            catch (error) {
                console.error('xnew.promise(mix): ', error);
                throw error;
            }
        };
        fn.fetch = (url, options) => {
            try {
                const promise = fetch(url, options);
                return UnitPromise.execute(UnitScope.current, promise);
            }
            catch (error) {
                console.error('xnew.promise(mix): ', error);
                throw error;
            }
        };
        fn.scope = (callback) => {
            const snapshot = UnitScope.snapshot();
            return (...args) => UnitScope.execute(snapshot, callback, ...args);
        };
        fn.find = (component) => {
            try {
                if (typeof component !== 'function') {
                    throw new Error(`The argument [component] is invalid.`);
                }
                else {
                    let units = UnitComponent.find(component);
                    return units;
                }
            }
            catch (error) {
                console.error('xnew.find(component): ', error);
                throw new Error(`The argument [component] is invalid.`);
            }
        };
        fn.timeout = (callback, delay) => {
            const snapshot = UnitScope.snapshot();
            const unit = xnew$1((self) => {
                const timer = new Timer(() => {
                    UnitScope.execute(snapshot, callback);
                    self.finalize();
                }, null, delay);
                self.on('finalize', () => {
                    timer.clear();
                });
            });
            return { clear: () => unit.finalize() };
        };
        fn.interval = (callback, delay) => {
            const snapshot = UnitScope.snapshot();
            const unit = xnew$1((self) => {
                const timer = new Timer(() => {
                    UnitScope.execute(snapshot, callback);
                }, null, delay, true);
                self.on('finalize', () => {
                    timer.clear();
                });
            });
            return { clear: () => unit.finalize() };
        };
        fn.transition = (callback, interval, easing = 'linear') => {
            const snapshot = UnitScope.snapshot();
            let stacks = [];
            let unit = xnew$1(Local, { callback, interval, easing });
            let isRunning = true;
            function Local(self, { callback, interval, easing }) {
                const timer = new Timer(() => {
                    UnitScope.execute(snapshot, callback, 1.0);
                    self.finalize();
                }, (progress) => {
                    if (progress < 1.0) {
                        if (easing === 'ease-out') {
                            progress = Math.pow((1.0 - Math.pow((1.0 - progress), 2.0)), 0.5);
                        }
                        else if (easing === 'ease-in') {
                            progress = Math.pow((1.0 - Math.pow((1.0 - progress), 0.5)), 2.0);
                        }
                        else if (easing === 'ease') {
                            progress = (1.0 - Math.cos(progress * Math.PI)) / 2.0;
                        }
                        else if (easing === 'ease-in-out') {
                            progress = (1.0 - Math.cos(progress * Math.PI)) / 2.0;
                        }
                        UnitScope.execute(snapshot, callback, progress);
                    }
                }, interval);
                self.on('finalize', () => {
                    timer.clear();
                    isRunning = false;
                    execute();
                });
            }
            let timer = null;
            function execute() {
                if (isRunning === false && stacks.length > 0) {
                    const props = stacks.shift();
                    unit = xnew$1(Local, props);
                    isRunning = true;
                }
            }
            function clear() {
                stacks = [];
                unit.finalize();
            }
            function next(callback, interval, easing = 'linear') {
                stacks.push({ callback, interval, easing });
                execute();
                return timer;
            }
            timer = { clear, next };
            return timer;
        };
        fn.emit = (type, ...args) => {
            try {
                UnitEvent.emit(type, ...args);
            }
            catch (error) {
                console.error('xnew.emit(type, ...args): ', error);
            }
        };
        fn.listener = function (target) {
            return {
                on(type, listener, options) {
                    UnitSubEvent.on(UnitScope.current, target, type, listener, options);
                },
                off(type, listener) {
                    UnitSubEvent.off(UnitScope.current, target, type, listener);
                }
            };
        };
        fn.capture = function (checker, execute) {
            const current = UnitScope.current;
            const snapshot = UnitScope.snapshot();
            current._.captures.push({ checker, execute: (unit) => UnitScope.execute(snapshot, execute, unit) });
        };
        return fn;
    })();

    function ResizeEvent(self) {
        const observer = new ResizeObserver(xnew$1.scope((entries) => {
            for (const entry of entries) {
                xnew$1.emit('-resize');
                break;
            }
        }));
        if (self.element) {
            observer.observe(self.element);
        }
        self.on('finalize', () => {
            if (self.element) {
                observer.unobserve(self.element);
            }
        });
    }

    function UserEvent(self) {
        const unit = xnew$1();
        unit.on('pointerdown', (event) => xnew$1.emit('-pointerdown', { event, position: getPosition(self.element, event) }));
        unit.on('pointermove', (event) => xnew$1.emit('-pointermove', { event, position: getPosition(self.element, event) }));
        unit.on('pointerup', (event) => xnew$1.emit('-pointerup', { event, position: getPosition(self.element, event) }));
        unit.on('wheel', (event) => xnew$1.emit('-wheel', { event, delta: { x: event.wheelDeltaX, y: event.wheelDeltaY } }));
        const drag = xnew$1(DragEvent);
        drag.on('-dragstart', (...args) => xnew$1.emit('-dragstart', ...args));
        drag.on('-dragmove', (...args) => xnew$1.emit('-dragmove', ...args));
        drag.on('-dragend', (...args) => xnew$1.emit('-dragend', ...args));
        drag.on('-dragcancel', (...args) => xnew$1.emit('-dragcancel', ...args));
        const gesture = xnew$1(GestureEvent);
        gesture.on('-gesturestart', (...args) => xnew$1.emit('-gesturestart', ...args));
        gesture.on('-gesturemove', (...args) => xnew$1.emit('-gesturemove', ...args));
        gesture.on('-gestureend', (...args) => xnew$1.emit('-gestureend', ...args));
        gesture.on('-gesturecancel', (...args) => xnew$1.emit('-gesturecancel', ...args));
        const keyborad = xnew$1(Keyboard);
        keyborad.on('-keydown', (...args) => xnew$1.emit('-keydown', ...args));
        keyborad.on('-keyup', (...args) => xnew$1.emit('-keyup', ...args));
        keyborad.on('-arrowkeydown', (...args) => xnew$1.emit('-arrowkeydown', ...args));
        keyborad.on('-arrowkeyup', (...args) => xnew$1.emit('-arrowkeyup', ...args));
    }
    function DragEvent(self) {
        xnew$1().on('pointerdown', (event) => {
            const id = event.pointerId;
            const position = getPosition(self.element, event);
            let previous = position;
            xnew$1.listener(window).on('pointermove', (event) => {
                if (event.pointerId === id) {
                    const position = getPosition(self.element, event);
                    const delta = { x: position.x - previous.x, y: position.y - previous.y };
                    xnew$1.emit('-dragmove', { event, position, delta });
                    previous = position;
                }
            });
            xnew$1.listener(window).on('pointerup', (event) => {
                if (event.pointerId === id) {
                    const position = getPosition(self.element, event);
                    xnew$1.emit('-dragend', { event, position, });
                    xnew$1.listener(window).off();
                }
            });
            xnew$1.listener(window).on('pointercancel', (event) => {
                if (event.pointerId === id) {
                    const position = getPosition(self.element, event);
                    xnew$1.emit('-dragcancel', { event, position, });
                    xnew$1.listener(window).off();
                }
            });
            xnew$1.emit('-dragstart', { event, position });
        });
    }
    function GestureEvent(self) {
        const drag = xnew$1(DragEvent);
        let isActive = false;
        const map = new Map();
        drag.on('-dragstart', ({ event, position }) => {
            map.set(event.pointerId, Object.assign({}, position));
            isActive = map.size === 2 ? true : false;
            if (isActive === true) {
                xnew$1.emit('-gesturestart', {});
            }
        });
        drag.on('-dragmove', ({ event, position, delta }) => {
            if (isActive === true) {
                const a = map.get(event.pointerId);
                const b = getOthers(event.pointerId)[0];
                let scale = 0.0;
                {
                    const v = { x: a.x - b.x, y: a.y - b.y };
                    const s = v.x * v.x + v.y * v.y;
                    scale = 1 + (s > 0.0 ? (v.x * delta.x + v.y * delta.y) / s : 0);
                }
                {
                    const c = { x: a.x + delta.x, y: a.y + delta.y };
                    ({ x: a.x - b.x, y: a.y - b.y });
                    ({ x: c.x - b.x, y: c.y - b.y });
                }
                xnew$1.emit('-gesturemove', { event, position, delta, scale });
            }
            map.set(event.pointerId, position);
        });
        drag.on('-dragend', ({ event }) => {
            if (isActive === true) {
                xnew$1.emit('-gesturemend', { event });
            }
            isActive = false;
            map.delete(event.pointerId);
        });
        drag.on('-dragcancel', ({ event }) => {
            if (isActive === true) {
                xnew$1.emit('-gesturecancel', { event });
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
        xnew$1.listener(window).on('keydown', (event) => {
            state[event.code] = 1;
            xnew$1.emit('-keydown', { event, code: event.code });
        });
        xnew$1.listener(window).on('keyup', (event) => {
            state[event.code] = 0;
            xnew$1.emit('-keyup', { event, code: event.code });
        });
        xnew$1.listener(window).on('keydown', (event) => {
            xnew$1.emit('-arrowkeydown', { event, code: event.code, vector: getVector() });
        });
        xnew$1.listener(window).on('keyup', (event) => {
            xnew$1.emit('-arrowkeyup', { event, code: event.code, vector: getVector() });
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

    function Screen(screen, { width = 640, height = 480, fit = 'contain' } = {}) {
        const size = { width, height };
        const wrapper = xnew$1.nest('<div style="position: relative; width: 100%; height: 100%; overflow: hidden;">');
        const absolute = xnew$1.nest('<div style="position: absolute; margin: auto;">');
        const canvas = xnew$1.nest(`<canvas width="${width}" height="${height}" style="width: 100%; height: 100%; vertical-align: bottom; user-select: none; user-drag: none;">`);
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
                return canvas;
            },
            resize(width, height) {
                size.width = width;
                size.height = height;
                canvas.setAttribute('width', width + 'px');
                canvas.setAttribute('height', height + 'px');
                resize();
            },
            get scale() {
                return { x: size.width / canvas.clientWidth, y: size.height / canvas.clientHeight };
            }
        };
    }

    function InputFrame(self, {} = {}) {
        xnew$1.nest('<div>');
        xnew$1.capture((unit) => {
            return unit.element.tagName.toLowerCase() === 'input';
        }, (unit) => {
            const element = unit.element;
            xnew$1.listener(element).on('input', (event) => {
                xnew$1.emit('-input', { event });
            });
            xnew$1.listener(element).on('change', (event) => {
                xnew$1.emit('-change', { event });
            });
        });
    }

    function ModalFrame(frame, { className, style, duration = 200, easing = 'ease' } = {}) {
        xnew$1.context('xnew.modalframe', frame);
        const div = xnew$1.nest('<div style="position: fixed; inset: 0; opacity: 0;">', { className, style });
        let content = null;
        xnew$1().on('click', (event) => {
            if (div === event.target) {
                frame.close();
            }
        });
        xnew$1.timeout(() => frame.open());
        return {
            set content(unit) {
                content = unit;
            },
            get content() {
                return content;
            },
            open() {
                xnew$1.transition((x) => div.style.opacity = x.toString(), duration, easing);
            },
            close() {
                xnew$1.transition((x) => div.style.opacity = (1.0 - x).toString(), duration, easing).next(() => frame.finalize());
            }
        };
    }
    function ModalContent(content, { className, style } = {}) {
        const frame = xnew$1.context('xnew.modalframe');
        frame.content = content;
        xnew$1.nest('<div style="position: absolute; inset: 0; margin: auto; width: max-content; height: max-content;">');
        xnew$1.nest('<div>', { className, style });
    }

    function TabFrame(frame, { select = 0 } = {}) {
        xnew$1.context('xnew.tabframe', frame);
        const tabs = [];
        const contents = [];
        const timeout = xnew$1.timeout(() => frame.select(select));
        return {
            get tabs() {
                return tabs;
            },
            get contents() {
                return contents;
            },
            select(index) {
                timeout.clear();
                const tab = tabs[index];
                const content = contents[index];
                tabs.filter((item) => item !== tab).forEach((item) => item.deselect());
                contents.filter((item) => item !== content).forEach((item) => item.deselect());
                tab.select();
                content.select();
            }
        };
    }
    function TabButton(self, {} = {}) {
        const frame = xnew$1.context('xnew.tabframe');
        frame.tabs.push(self);
        xnew$1.nest('<div>');
        self.on('click', () => {
            frame.select(frame.tabs.indexOf(self));
        });
        return {
            select() {
                Object.assign(self.element.style, { opacity: 1.0, cursor: 'text' });
            },
            deselect() {
                Object.assign(self.element.style, { opacity: 0.6, cursor: 'pointer' });
            }
        };
    }
    function TabContent(self, { className, style } = {}) {
        const frame = xnew$1.context('xnew.tabframe');
        frame.contents.push(self);
        xnew$1.nest('<div>', { className, style });
        return {
            select() {
                Object.assign(self.element.style, { display: 'block' });
            },
            deselect() {
                Object.assign(self.element.style, { display: 'none' });
            }
        };
    }

    function AccordionFrame(frame, { duration = 200, easing = 'ease' } = {}) {
        xnew$1.context('xnew.accordionframe', frame);
        let content = null;
        xnew$1.capture((unit) => {
            return unit.components.includes(AccordionContent);
        }, (unit) => {
            content = unit;
        });
        return {
            get content() {
                return content;
            },
        };
    }
    function AccordionButton(button, {} = {}) {
        const frame = xnew$1.context('xnew.accordionframe');
        xnew$1.nest('<div>');
        button.on('click', () => { var _a; return (_a = frame.content) === null || _a === void 0 ? void 0 : _a.toggle(); });
    }
    function AccordionContent(content, { open = false, duration = 200, easing = 'ease' } = {}) {
        const outer = xnew$1.nest('<div>');
        const inner = xnew$1.nest('<div style="padding: 0; display: flex; flex-direction: column; box-sizing: border-box;">');
        let state = open ? 'open' : 'closed';
        outer.style.display = state === 'open' ? 'block' : 'none';
        return {
            get state() {
                return state;
            },
            open() {
                if (state === 'closed') {
                    state = 'opening';
                    xnew$1.transition((x) => content.transition(outer, inner, x), duration, easing).next(() => state = 'open');
                }
            },
            close() {
                if (state === 'open') {
                    state = 'closing';
                    xnew$1.transition((x) => content.transition(outer, inner, 1.0 - x), duration, easing).next(() => state = 'closed');
                }
            },
            transition(outer, inner, x) {
                if (x === 0.0) {
                    outer.style.display = 'none';
                }
                else if (x < 1.0) {
                    outer.style.overflow = 'hidden';
                    outer.style.height = inner.offsetHeight * x + 'px';
                    outer.style.opacity = x.toString();
                    outer.style.display = 'block';
                }
                else {
                    outer.style.overflow = 'visible';
                    outer.style.height = 'auto';
                    outer.style.opacity = '1.0';
                    outer.style.display = 'block';
                }
            },
            toggle() {
                if (state === 'open') {
                    content.close();
                }
                else if (state === 'closed') {
                    content.open();
                }
            },
        };
    }

    function PanelFrame(frame) {
        xnew$1.context('xnew.panelframe', frame);
    }
    function PanelGroup(group, { className, style, name, open = false } = {}) {
        xnew$1.context('xnew.panelgroup', group);
        xnew$1.extend(AccordionFrame, { className, style });
        xnew$1((button) => {
            xnew$1.extend(AccordionButton);
            xnew$1.nest('<div style="margin: 0.2em; cursor: pointer">');
            const arrow = xnew$1(BulletArrow, { rotate: open ? 90 : 0 });
            xnew$1('<span style="margin-left: 0.4em;">', name);
            button.off('click');
            button.on('click', () => {
                var _a, _b;
                if (((_a = group.content) === null || _a === void 0 ? void 0 : _a.state) === 'open') {
                    group.close();
                    arrow.rotate(0);
                }
                else if (((_b = group.content) === null || _b === void 0 ? void 0 : _b.state) === 'closed') {
                    group.open();
                    arrow.rotate(90);
                }
            });
            button.on('mouseenter', () => button.element.style.opacity = '0.7');
            button.on('mouseleave', () => button.element.style.opacity = '1.0');
        });
        xnew$1.extend(AccordionContent, { open });
    }
    function BulletArrow(self, { rotate = 0 } = {}) {
        const arrow = xnew$1(`<div style="display:inline-block; width: 0.5em; height: 0.5em; border-right: 0.12em solid currentColor; border-bottom: 0.12em solid currentColor; box-sizing: border-box; transform-origin: center center;">`);
        arrow.element.style.transform = `rotate(${rotate - 45}deg)`;
        return {
            rotate(rotate, transition = 200, easing = 'ease') {
                arrow.element.style.transition = `transform ${transition}ms ${easing}`;
                arrow.element.style.transform = `rotate(${rotate - 45}deg)`;
            }
        };
    }

    const xnew = Object.assign(xnew$1, {
        Screen,
        UserEvent,
        ResizeEvent,
        ModalFrame,
        ModalContent,
        AccordionFrame,
        AccordionButton,
        AccordionContent,
        TabFrame,
        TabButton,
        TabContent,
        PanelFrame,
        PanelGroup,
        InputFrame,
    });

    return xnew;

}));
