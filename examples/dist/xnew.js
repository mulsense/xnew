(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xnew = factory());
})(this, (function () { 'use strict';

    //----------------------------------------------------------------------------------------------------
    // map set
    //----------------------------------------------------------------------------------------------------
    class MapSet {
        constructor() {
            this.map = new Map;
        }
        get size() {
            return this.map.size;
        }
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
    class MapMap {
        constructor() {
            this.map = new Map;
        }
        get size() {
            return this.map.size;
        }
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
    class MapMapMap {
        constructor() {
            this.map = new Map;
        }
        get size() {
            return this.map.size;
        }
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
            var _a;
            if (key2 === undefined) {
                return this.map.get(key1);
            }
            else {
                return (_a = this.map.get(key1)) === null || _a === void 0 ? void 0 : _a.get(key2, key3);
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
    // unit scope
    //----------------------------------------------------------------------------------------------------
    class UnitScope {
        static execute(snapshot, func, ...args) {
            const backup = { unit: null, context: null };
            try {
                backup.unit = UnitScope.current;
                UnitScope.current = snapshot.unit;
                if (snapshot.unit !== null && snapshot.context !== undefined) {
                    backup.context = UnitScope.get(snapshot.unit);
                    UnitScope.set(snapshot.unit, snapshot.context);
                }
                return func(...args);
            }
            catch (error) {
                throw error;
            }
            finally {
                UnitScope.current = backup.unit;
                if (snapshot.unit !== null && snapshot.context !== undefined) {
                    UnitScope.set(snapshot.unit, backup.context);
                }
            }
        }
        static set(unit, context) {
            UnitScope.unitToContext.set(unit, context);
        }
        static get(unit) {
            return UnitScope.unitToContext.get(unit);
        }
        static snapshot(unit = UnitScope.current) {
            return { unit, context: UnitScope.get(unit) };
        }
        static clear(unit) {
            UnitScope.unitToContext.delete(unit);
        }
        static push(key, value) {
            const unit = UnitScope.current;
            if (unit) {
                UnitScope.unitToContext.set(unit, { previous: UnitScope.get(unit), key, value });
            }
        }
        static trace(key) {
            const unit = UnitScope.current;
            if (unit) {
                for (let context = UnitScope.get(unit); context !== null; context = context.previous) {
                    if (context.key === key) {
                        return context.value;
                    }
                }
            }
        }
    }
    UnitScope.current = null;
    UnitScope.unitToContext = new Map();
    //----------------------------------------------------------------------------------------------------
    // unit component
    //----------------------------------------------------------------------------------------------------
    class UnitComponent {
        static add(unit, component) {
            UnitComponent.unitToComponents.add(unit, component);
            UnitComponent.componentToUnits.add(component, unit);
        }
        static clear(unit) {
            var _a;
            (_a = UnitComponent.unitToComponents.get(unit)) === null || _a === void 0 ? void 0 : _a.forEach((component) => {
                UnitComponent.componentToUnits.delete(component, unit);
            });
            UnitComponent.unitToComponents.delete(unit);
        }
        static find(component) {
            var _a;
            return [...((_a = UnitComponent.componentToUnits.get(component)) !== null && _a !== void 0 ? _a : [])];
        }
    }
    UnitComponent.unitToComponents = new MapSet();
    UnitComponent.componentToUnits = new MapSet();
    //----------------------------------------------------------------------------------------------------
    // unit element
    //----------------------------------------------------------------------------------------------------
    class UnitElement {
        static initialize(unit, baseElement) {
            UnitElement.unitToElements.set(unit, [baseElement]);
        }
        static nest(unit, attributes) {
            var _a;
            const current = UnitElement.get(unit);
            if (current instanceof Window || current instanceof Document) {
                throw new Error(`No elements are added to window or document.`);
            }
            else if (typeof attributes !== 'object') {
                throw new Error(`The argument [attributes] is invalid.`);
            }
            else {
                const element = UnitElement.create(attributes, current);
                current.append(element);
                (_a = UnitElement.unitToElements.get(unit)) === null || _a === void 0 ? void 0 : _a.push(element);
                return element;
            }
        }
        static get(unit) {
            var _a;
            return (_a = UnitElement.unitToElements.get(unit)) === null || _a === void 0 ? void 0 : _a.slice(-1)[0];
        }
        static clear(unit) {
            const elements = UnitElement.unitToElements.get(unit);
            if (elements && elements.length > 1) {
                elements[0].removeChild(elements[1]);
            }
            UnitElement.unitToElements.delete(unit);
        }
        static create(attributes, parentElement = null) {
            var _a;
            const tagName = ((_a = attributes.tagName) !== null && _a !== void 0 ? _a : 'div').toLowerCase();
            let element;
            let nsmode = false;
            if (tagName === 'svg') {
                nsmode = true;
            }
            else {
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
            }
            else {
                element = document.createElement(tagName);
            }
            Object.keys(attributes).forEach((key) => {
                const value = attributes[key];
                if (key === 'tagName') ;
                else if (key === 'insert') ;
                else if (key === 'className') {
                    if (typeof value === 'string' && value !== '') {
                        element.classList.add(...value.trim().split(/\s+/));
                    }
                }
                else if (key === 'style') {
                    if (typeof value === 'string') {
                        element.style.cssText = value;
                    }
                    else if (typeof value !== null && typeof value === 'object') {
                        Object.assign(element.style, value);
                    }
                }
                else {
                    key.replace(/([A-Z])/g, '-$1').toLowerCase();
                    if (element[key] === true || element[key] === false) {
                        element[key] = value;
                    }
                    else {
                        setAttribute(element, key, value);
                    }
                    function setAttribute(element, key, value) {
                        if (nsmode) {
                            element.setAttributeNS(null, key, value);
                        }
                        else {
                            element.setAttribute(key, value);
                        }
                    }
                }
            });
            return element;
        }
    }
    UnitElement.unitToElements = new Map();
    //----------------------------------------------------------------------------------------------------
    // unit event
    //----------------------------------------------------------------------------------------------------
    class UnitEvent {
        static on(unit, type, listener, options) {
            if (typeof type !== 'string' || type.trim() === '') {
                throw new Error(`The argument [type] is invalid.`);
            }
            else if (typeof listener !== 'function') {
                throw new Error(`The argument [listener] is invalid.`);
            }
            const snapshot = UnitScope.snapshot();
            type.trim().split(/\s+/).forEach((type) => internal(type, listener));
            function internal(type, listener) {
                if (!UnitEvent.unitToListeners.has(unit, type, listener)) {
                    const element = unit.element;
                    if (type[0] === '-' || type[0] === '+') {
                        const execute = (...args) => {
                            const eventbackup = UnitEvent.event;
                            UnitEvent.event = { type };
                            UnitScope.execute(snapshot, listener, ...args);
                            UnitEvent.event = eventbackup;
                        };
                        UnitEvent.unitToListeners.set(unit, type, listener, [element, execute]);
                    }
                    else {
                        const execute = (...args) => {
                            var _a, _b;
                            const eventbackup = UnitEvent.event;
                            UnitEvent.event = { type: (_b = (_a = args[0]) === null || _a === void 0 ? void 0 : _a.type) !== null && _b !== void 0 ? _b : null };
                            UnitScope.execute(snapshot, listener, ...args);
                            UnitEvent.event = eventbackup;
                        };
                        UnitEvent.unitToListeners.set(unit, type, listener, [element, execute]);
                        element === null || element === void 0 ? void 0 : element.addEventListener(type, execute, options);
                    }
                }
                if (UnitEvent.unitToListeners.has(unit, type)) {
                    UnitEvent.typeToUnits.add(type, unit);
                }
            }
        }
        static off(unit, type, listener) {
            var _a;
            if (type !== undefined && (typeof type !== 'string' || type.trim() === '')) {
                throw new Error(`The argument [type] is invalid.`);
            }
            else if (listener !== undefined && typeof listener !== 'function') {
                throw new Error(`The argument [listener] is invalid.`);
            }
            if (typeof type === 'string' && listener !== undefined) {
                type.trim().split(/\s+/).forEach((type) => internal(type, listener));
            }
            else if (typeof type === 'string' && listener === undefined) {
                type.trim().split(/\s+/).forEach((type) => {
                    var _a;
                    (_a = UnitEvent.unitToListeners.get(unit, type)) === null || _a === void 0 ? void 0 : _a.forEach((_, listener) => internal(type, listener));
                });
            }
            else if (type === undefined && listener === undefined) {
                (_a = UnitEvent.unitToListeners.get(unit)) === null || _a === void 0 ? void 0 : _a.forEach((map, type) => {
                    map.forEach((_, listener) => internal(type, listener));
                });
            }
            function internal(type, listener) {
                if (UnitEvent.unitToListeners.has(unit, type, listener)) {
                    const [element, execute] = UnitEvent.unitToListeners.get(unit, type, listener);
                    UnitEvent.unitToListeners.delete(unit, type, listener);
                    element.removeEventListener(type, execute);
                }
                if (!UnitEvent.unitToListeners.has(unit, type)) {
                    UnitEvent.typeToUnits.delete(type, unit);
                }
            }
        }
        static emit(unit, type, ...args) {
            var _a, _b;
            if (type[0] === '+') {
                (_a = UnitEvent.typeToUnits.get(type)) === null || _a === void 0 ? void 0 : _a.forEach((unit) => {
                    var _a;
                    (_a = UnitEvent.unitToListeners.get(unit, type)) === null || _a === void 0 ? void 0 : _a.forEach(([element, execute]) => execute(...args));
                });
            }
            else if (type[0] === '-') {
                (_b = UnitEvent.unitToListeners.get(unit, type)) === null || _b === void 0 ? void 0 : _b.forEach(([element, execute]) => execute(...args));
            }
        }
    }
    UnitEvent.event = null;
    UnitEvent.typeToUnits = new MapSet();
    UnitEvent.unitToListeners = new MapMapMap();
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
        static execute(promise) {
            const unit = UnitScope.current;
            const scopedpromise = new UnitPromise((resolve, reject) => {
                promise.then((...args) => resolve(...args));
                promise.catch((...args) => reject(...args));
            });
            UnitPromise.unitToPromises.add(unit, promise);
            return scopedpromise;
        }
    }
    UnitPromise.unitToPromises = new MapSet();

    class Unit {
        constructor(parent, target, component, ...args) {
            var _a, _b, _c, _d;
            this._ = {};
            try {
                const id = Unit.autoincrement++;
                const root = (_a = parent === null || parent === void 0 ? void 0 : parent._.root) !== null && _a !== void 0 ? _a : this;
                let baseElement = null;
                if (target instanceof Element || target instanceof Window || target instanceof Document) {
                    baseElement = target;
                }
                else if (parent !== null) {
                    baseElement = parent.element;
                }
                else if (document instanceof Document) {
                    baseElement = (_c = (_b = document.currentScript) === null || _b === void 0 ? void 0 : _b.parentElement) !== null && _c !== void 0 ? _c : document.body;
                }
                const baseContext = UnitScope.get(parent);
                this._ = Object.assign(this._, {
                    id, // unit id
                    root, // root unit
                    parent, // parent unit
                    target, // target info
                    component, // component function
                    args, // component arguments
                    baseElement, // base element
                    baseContext, // base context
                });
                ((_d = parent === null || parent === void 0 ? void 0 : parent._.children) !== null && _d !== void 0 ? _d : Unit.roots).add(this);
                Unit.initialize(this, component, ...args);
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('unit constructor: ', error.message);
                }
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
            var _a, _b;
            Unit.stop(this);
            Unit.finalize(this);
            ((_b = (_a = this._.parent) === null || _a === void 0 ? void 0 : _a._.children) !== null && _b !== void 0 ? _b : Unit.roots).delete(this);
        }
        reboot() {
            Unit.stop(this);
            Unit.finalize(this);
            Unit.initialize(this, this._.component, ...this._.args);
        }
        on(type, listener, options) {
            try {
                UnitEvent.on(this, type, listener, options);
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('unit.on(type, listener, option?): ', error.message);
                }
            }
        }
        off(type, listener) {
            try {
                UnitEvent.off(this, type, listener);
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('unit.off(type, listener): ', error.message);
                }
            }
        }
        static initialize(unit, component, ...args) {
            var _a;
            unit._ = Object.assign(unit._, {
                children: new Set(), // children units
                state: 'pending', // [pending -> running <-> stopped -> finalized]
                tostart: false, // flag for start
                upcount: 0, // update count    
                resolved: false, // promise check
                props: {}, // properties in the component function
            });
            UnitElement.initialize(unit, unit._.baseElement);
            UnitScope.set(unit, unit._.baseContext);
            if (unit._.parent !== null && ['finalized'].includes((_a = unit._.parent._.state) !== null && _a !== void 0 ? _a : '')) {
                unit._.state = 'finalized';
            }
            else {
                unit._.tostart = true;
                // nest html element
                if ((unit._.target !== null && typeof unit._.target === 'object') && unit.element instanceof Element) {
                    UnitElement.nest(unit, unit._.target);
                }
                // setup component
                if (typeof component === 'function') {
                    UnitScope.execute({ unit }, () => Unit.extend(unit, component, ...args));
                }
                else if ((unit._.target !== null && typeof unit._.target === 'object') && typeof component === 'string') {
                    unit.element.innerHTML = component;
                }
                unit._.resolved = true;
                // whether the unit promise was resolved
                // UnitPromise.execute(unit).then(() => { unit._.resolved = true; });
            }
        }
        static extend(unit, component, ...args) {
            var _a;
            if (typeof component !== 'function') {
                throw new Error(`The argument [component] is invalid.`);
            }
            UnitComponent.add(unit, component);
            const props = (_a = component(unit, ...args)) !== null && _a !== void 0 ? _a : {};
            Object.keys(props).forEach((key) => {
                const descripter = Object.getOwnPropertyDescriptor(props, key);
                if (['start', 'update', 'stop', 'finalize'].includes(key)) {
                    if (typeof (descripter === null || descripter === void 0 ? void 0 : descripter.value) === 'function') {
                        const previous = unit._.props[key];
                        if (previous !== undefined) {
                            unit._.props[key] = (...args) => { previous(...args); descripter.value(...args); };
                        }
                        else {
                            unit._.props[key] = (...args) => { descripter.value(...args); };
                        }
                    }
                    else {
                        console.error(`unit.extend: The property [${key}] is invalid.`);
                    }
                }
                else if (unit[key] === undefined) {
                    const dest = { configurable: true, enumerable: true };
                    const snapshot = UnitScope.snapshot(unit);
                    if (typeof (descripter === null || descripter === void 0 ? void 0 : descripter.get) === 'function') {
                        dest.get = (...args) => UnitScope.execute(snapshot, descripter.get, ...args);
                    }
                    else if (typeof (descripter === null || descripter === void 0 ? void 0 : descripter.set) === 'function') {
                        dest.set = (...args) => UnitScope.execute(snapshot, descripter.set, ...args);
                    }
                    else if (typeof (descripter === null || descripter === void 0 ? void 0 : descripter.value) === 'function') {
                        dest.value = (...args) => UnitScope.execute(snapshot, descripter.value, ...args);
                    }
                    else if ((descripter === null || descripter === void 0 ? void 0 : descripter.value) !== undefined) {
                        dest.writable = true;
                        dest.value = descripter.value;
                    }
                    Object.defineProperty(unit._.props, key, dest);
                    Object.defineProperty(unit, key, dest);
                }
                else {
                    console.error(`unit.extend: The property [${key}] already exists.`);
                }
            });
        }
        static start(unit, time) {
            if (unit._.resolved === false || unit._.tostart === false) ;
            else if (['pending', 'stopped'].includes(unit._.state) === true) {
                unit._.state = 'running';
                unit._.children.forEach((unit) => Unit.start(unit, time));
                if (typeof unit._.props.start === 'function') {
                    UnitScope.execute(UnitScope.snapshot(unit), unit._.props.start);
                }
            }
            else if (['running'].includes(unit._.state) === true) {
                unit._.children.forEach((unit) => Unit.start(unit, time));
            }
        }
        static stop(unit) {
            if (['running'].includes(unit._.state) === true) {
                unit._.state = 'stopped';
                unit._.children.forEach((unit) => Unit.stop(unit));
                if (typeof unit._.props.stop === 'function') {
                    UnitScope.execute(UnitScope.snapshot(unit), unit._.props.stop);
                }
            }
        }
        static update(unit, time) {
            if (['running'].includes(unit._.state) === true) {
                unit._.children.forEach((unit) => Unit.update(unit, time));
                if (['running'].includes(unit._.state) && typeof unit._.props.update === 'function') {
                    UnitScope.execute(UnitScope.snapshot(unit), unit._.props.update, unit._.upcount++);
                }
            }
        }
        static finalize(unit) {
            if (['finalized'].includes(unit._.state) === false) {
                unit._.state = 'finalized';
                [...unit._.children].forEach((unit) => unit.finalize());
                unit._.children.clear();
                if (typeof unit._.props.finalize === 'function') {
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
            if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
                if (Unit.animation !== null) {
                    cancelAnimationFrame(Unit.animation);
                    Unit.animation = null;
                }
                console.log('test');
                Unit.previous = Date.now();
                Unit.ticker = function () {
                    const interval = 1000 / 60;
                    const time = Date.now();
                    if (time - Unit.previous > interval * 0.8) {
                        Unit.roots.forEach((unit) => {
                            Unit.start(unit, time);
                            Unit.update(unit, time);
                        });
                        Unit.previous = time;
                    }
                    Unit.animation = requestAnimationFrame(Unit.ticker);
                };
                Unit.animation = requestAnimationFrame(Unit.ticker);
            }
        }
    }
    Unit.autoincrement = 0; // auto increment id
    Unit.roots = new Set(); // root units
    Unit.animation = null;
    Unit.ticker = null;
    Unit.previous = 0.0;
    Unit.reset();

    //----------------------------------------------------------------------------------------------------
    // xnew main
    //----------------------------------------------------------------------------------------------------
    const xnew = Object.assign(function (...args) {
        let parent = UnitScope.current;
        if (typeof args[0] !== 'function' && args[0] instanceof Unit) {
            parent = args.shift();
        }
        else if (args[0] === null) {
            parent = args.shift();
        }
        else if (args[0] === undefined) {
            args.shift();
        }
        let target = null;
        if (args[0] instanceof Element || args[0] instanceof Window || args[0] instanceof Document) {
            // an existing html element
            target = args.shift();
        }
        else if (typeof args[0] === 'string') {
            // a string for an existing html element
            const key = args.shift();
            target = document.querySelector(key);
            if (target == null) {
                console.error(`xnew: '${key}' can not be found.`);
            }
        }
        else if (typeof args[0] !== null && typeof args[0] === 'object') {
            // an attributes for a new html element
            target = args.shift();
        }
        else if (args[0] === null || args[0] === undefined) {
            args.shift();
        }
        // if (!(parent === null || parent instanceof Unit)) {
        //     throw new Error(`The argument [parent] is invalid.`);
        // }
        // if (!(target === null || (target !== null && typeof target === 'object') || target instanceof Element || target instanceof Window || target instanceof Document)) {
        //     throw new Error(`The argument [target] is invalid.`);
        // }
        // if (!(component === undefined || typeof component === 'function' || ((target !== null && typeof target === 'object') && typeof component === 'string'))) {
        //     throw new Error(`The argument [component] is invalid.`);
        // }
        try {
            return new Unit(parent, target, ...args);
        }
        catch (error) {
            if (error instanceof Error) {
                console.error('xnew: ', error.message);
            }
        }
    }, {
        get root() {
            var _a;
            return (_a = UnitScope.current) === null || _a === void 0 ? void 0 : _a._.root;
        },
        get parent() {
            var _a;
            return (_a = UnitScope.current) === null || _a === void 0 ? void 0 : _a._.root;
        },
        get current() {
            return UnitScope.current;
        },
        nest(attributes) {
            try {
                const current = UnitScope.current;
                if ((current === null || current === void 0 ? void 0 : current._.state) === 'pending') {
                    return UnitElement.nest(current, attributes);
                }
                else {
                    throw new Error(`This function can not be called after initialized.`);
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('xnew.nest(attributes): ', error.message);
                }
            }
        },
        extend(component, ...args) {
            try {
                const current = UnitScope.current;
                if ((current === null || current === void 0 ? void 0 : current._.state) === 'pending') {
                    return Unit.extend(current, component, ...args);
                }
                else {
                    throw new Error('This function can not be called after initialized.');
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('xnew.extend(component, ...args): ', error.message);
                }
            }
        },
        context(key, value = undefined) {
            try {
                if (typeof key !== 'string') {
                    throw new Error('The argument [key] is invalid.');
                }
                else {
                    if (value !== undefined) {
                        UnitScope.push(key, value);
                    }
                    else {
                        return UnitScope.trace(key);
                    }
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('xnew.context(key, value?): ', error.message);
                }
            }
        },
        promise(mix) {
            try {
                let promise = null;
                if (mix instanceof Promise) {
                    promise = mix;
                }
                else if (typeof mix === 'function') {
                    promise = new Promise(mix);
                }
                else if (mix instanceof Unit) {
                    const promises = UnitPromise.unitToPromises.get(mix);
                    promise = promises.size > 0 ? Promise.all([...promises]) : Promise.resolve();
                }
                else {
                    throw new Error(`The argument [mix] is invalid.`);
                }
                return UnitPromise.execute(promise);
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('xnew.promise(mix): ', error.message);
                }
            }
        },
        emit(type, ...args) {
            try {
                const unit = UnitScope.current;
                if (typeof type !== 'string') {
                    throw new Error('The argument [type] is invalid.');
                }
                else if ((unit === null || unit === void 0 ? void 0 : unit._.state) === 'finalized') {
                    throw new Error('This function can not be called after finalized.');
                }
                else {
                    UnitEvent.emit(unit, type, ...args);
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('xnew.emit(type, ...args): ', error.message);
                }
            }
        },
        scope(callback) {
            const snapshot = UnitScope.snapshot();
            return (...args) => UnitScope.execute(snapshot, callback, ...args);
        },
    });
    //----------------------------------------------------------------------------------------------------
    // members
    //----------------------------------------------------------------------------------------------------
    // Object.defineProperty(xnew, 'event', { get: () => UnitEvent.event });
    // Object.defineProperty(xnew, 'scope', { value: scope });
    // Object.defineProperty(xnew, 'timer', { value: timer });
    // Object.defineProperty(xnew, 'interval', { value: interval });
    // Object.defineProperty(xnew, 'transition', { value: transition });
    // function find(component) {
    //     if (isFunction(component) === false) {
    //         console.error(`xnew.find: The argument [component] is invalid.`);
    //     } else if (isFunction(component) === true) {
    //         return UnitComponent.find(component);
    //     }
    // }
    // function timer(callback, delay) {
    //     const snapshot = UnitScope.snapshot();
    //     const unit = xnew((self) => {
    //         const timer = new Timer(() => {
    //             UnitScope.execute(snapshot, callback);
    //             self.finalize();
    //         }, delay);
    //         return {
    //             finalize() {
    //                 timer.clear();
    //             }
    //         };
    //     });
    //     return { clear: () => unit.finalize() };
    // }
    // function interval(callback, delay) {
    //     const snapshot = UnitScope.snapshot();
    //     const unit = xnew((self) => {
    //         const timer = new Timer(() => {
    //             UnitScope.execute(snapshot, callback);
    //         }, delay, true);
    //         return {
    //             finalize() {
    //                 timer.clear();
    //             }
    //         };
    //     });
    //     return { clear: () => unit.finalize() };
    // }
    // function transition(callback, interval) {
    //     const snapshot = UnitScope.snapshot();
    //     const unit = xnew((self) => {
    //         const timer = new Timer(() => {
    //             UnitScope.execute(snapshot, callback, 1.0);
    //             self.finalize();
    //         }, interval);
    //         UnitScope.execute(snapshot, callback, 0.0);
    //         const updater = xnew(null, (self) => {
    //             return {
    //                 update() {
    //                     const progress = timer.elapsed() / interval;
    //                     if (progress < 1.0) {
    //                         UnitScope.execute(snapshot, callback, progress);
    //                     }
    //                 },
    //             }
    //         });
    //         return {
    //             finalize() {
    //                 timer.clear();
    //                 updater.finalize();
    //             }
    //         };
    //     });
    //     return { clear: () => unit.finalize() };
    // }

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
        };
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
                canvas.element.width = width;
                canvas.element.height = height;
                resize();
            },
            get scale() {
                return { x: canvas.element.width / canvas.element.clientWidth, y: canvas.element.height / canvas.element.clientHeight };
            }
        };
    }

    // // import { Modal } from './basics/Modal';
    // // // import { Accordion } from './basics/Accordion';
    Object.defineProperty(xnew, 'Screen', { enumerable: true, value: Screen });
    // // Object.defineProperty(xnew, 'UserEvent', { enumerable: true, value: UserEvent });
    Object.defineProperty(xnew, 'ResizeEvent', { enumerable: true, value: ResizeEvent });
    // // Object.defineProperty(xnew, 'Modal', { enumerable: true, value: Modal });
    // // Object.defineProperty(xnew, 'Accordion', { enumerable: true, value: Accordion });

    return xnew;

}));
