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
// internal
//----------------------------------------------------------------------------------------------------
function isPlainObject(value) {
    return value !== null && typeof value === 'object' && value.constructor === Object;
}
//----------------------------------------------------------------------------------------------------
// unit main
//----------------------------------------------------------------------------------------------------
class Unit {
    constructor(parent, target, component, ...args) {
        var _a, _b, _c, _d;
        this._ = {};
        let baseTarget = null;
        if (target instanceof Element || target instanceof Window || target instanceof Document) {
            baseTarget = target;
        }
        else if (parent !== null) {
            baseTarget = parent.element;
        }
        else if (document instanceof Document) {
            baseTarget = (_b = (_a = document.currentScript) === null || _a === void 0 ? void 0 : _a.parentElement) !== null && _b !== void 0 ? _b : document.body;
        }
        this._ = {
            root: (_c = parent === null || parent === void 0 ? void 0 : parent._.root) !== null && _c !== void 0 ? _c : this,
            list: (_d = parent === null || parent === void 0 ? void 0 : parent._.children) !== null && _d !== void 0 ? _d : Unit.roots,
            input: { parent, target, component, args },
            baseTarget,
            baseContext: UnitScope.get(parent),
        };
        this._.list.push(this);
        Unit.initialize(this);
    }
    get element() {
        return this._.baseTarget instanceof Element ? UnitElement.get(this) : null;
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
        this._.list = this._.list.filter((unit) => unit !== this);
    }
    reboot() {
        Unit.stop(this);
        Unit.finalize(this);
        Unit.initialize(this);
    }
    on(type, listener, options) {
        try {
            if (typeof type === 'string') {
                const list = ['start', 'update', 'stop', 'finalize'];
                const filtered = type.trim().split(/\s+/).filter((type) => list.includes(type));
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
            if (typeof type == undefined) {
                this._.system = { start: [], update: [], stop: [], finalize: [] };
            }
            else if (typeof type === 'string') {
                const list = ['start', 'update', 'stop', 'finalize'];
                const filtered = type.trim().split(/\s+/).filter((type) => list.includes(type));
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
            children: [], // children units
            state: 'pending', // [pending -> running <-> stopped -> finalized]
            tostart: true, // flag for start
            upcount: 0, // update count    
            resolved: false, // promise check
            props: {}, // properties in the component function
            system: {}, // system properties
        });
        unit._.system = { start: [], update: [], stop: [], finalize: [] };
        UnitScope.initialize(unit, unit._.baseContext);
        UnitElement.initialize(unit, unit._.baseTarget);
        // nest html element
        if (isPlainObject(unit._.input.target)) {
            UnitScope.execute({ unit, data: null }, () => UnitElement.nest(unit._.input.target));
        }
        // setup component
        if (typeof unit._.input.component === 'function') {
            UnitScope.execute({ unit, data: null }, () => Unit.extend(unit, unit._.input.component, ...unit._.input.args));
        }
        else if (isPlainObject(unit._.input.target) && typeof unit._.input.component === 'string') {
            unit.element.innerHTML = unit._.input.component;
        }
        // whether the unit promise was resolved
        (_a = UnitPromise.get(unit)) === null || _a === void 0 ? void 0 : _a.then(() => { unit._.resolved = true; });
    }
    static finalize(unit) {
        if (unit._.state !== 'finalized' || unit._.state !== 'pre finalized') {
            unit._.state = 'pre finalized';
            unit._.children.forEach((unit) => unit.finalize());
            unit._.system.finalize.forEach((listener) => {
                UnitScope.execute(UnitScope.snapshot(unit), listener);
            });
            UnitEvent.off(unit);
            UnitScope.finalize(unit);
            UnitElement.finalize(unit);
            UnitComponent.finalize(unit);
            UnitPromise.finalize(unit);
            // reset props
            Object.keys(unit._.props).forEach((key) => {
                if (['start', 'update', 'stop', 'finalize'].includes(key) === false) {
                    delete unit[key];
                }
            });
            unit._.props = {};
            unit._.state = 'finalized';
        }
    }
    static extend(unit, component, ...args) {
        var _a;
        UnitComponent.add(unit, component);
        const props = (_a = component(unit, ...args)) !== null && _a !== void 0 ? _a : {};
        const snapshot = UnitScope.snapshot(unit);
        Object.keys(props).forEach((key) => {
            const descripter = Object.getOwnPropertyDescriptor(props, key);
            if (unit[key] === undefined) {
                const descriptor = { configurable: true, enumerable: true };
                if (typeof (descripter === null || descripter === void 0 ? void 0 : descripter.get) === 'function') {
                    descriptor.get = (...args) => UnitScope.execute(snapshot, descripter.get, ...args);
                }
                else if (typeof (descripter === null || descripter === void 0 ? void 0 : descripter.set) === 'function') {
                    descriptor.set = (...args) => UnitScope.execute(snapshot, descripter.set, ...args);
                }
                else if (typeof (descripter === null || descripter === void 0 ? void 0 : descripter.value) === 'function') {
                    descriptor.value = (...args) => UnitScope.execute(snapshot, descripter.value, ...args);
                }
                else if ((descripter === null || descripter === void 0 ? void 0 : descripter.value) !== undefined) {
                    descriptor.writable = true;
                    descriptor.value = descripter.value;
                }
                Object.defineProperty(unit._.props, key, descriptor);
                Object.defineProperty(unit, key, descriptor);
            }
            else {
                throw new Error(`The property "${key}" already exists.`);
            }
        });
    }
    static start(unit, time) {
        if (unit._.resolved === false || unit._.tostart === false)
            return;
        if (unit._.state === 'pending' || unit._.state === 'stopped') {
            unit._.state = 'running';
            unit._.children.forEach((child) => Unit.start(child, time));
            unit._.system.start.forEach((listener) => {
                UnitScope.execute(UnitScope.snapshot(unit), listener);
            });
        }
        else if (unit._.state === 'running') {
            unit._.children.forEach((child) => Unit.start(child, time));
        }
    }
    static stop(unit) {
        if (unit._.state === 'running') {
            unit._.state = 'stopped';
            unit._.children.forEach((child) => Unit.stop(child));
            unit._.system.stop.forEach((listener) => {
                UnitScope.execute(UnitScope.snapshot(unit), listener);
            });
        }
    }
    static update(unit, time) {
        if (['running'].includes(unit._.state) === true) {
            unit._.children.forEach((unit) => Unit.update(unit, time));
            if (['running'].includes(unit._.state)) {
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
class UnitScope {
    static initialize(unit, data) {
        UnitScope.data.set(unit, data);
    }
    static finalize(unit) {
        UnitScope.data.delete(unit);
    }
    static set(unit, data) {
        UnitScope.data.set(unit, data);
    }
    static get(unit) {
        var _a;
        return (_a = UnitScope.data.get(unit)) !== null && _a !== void 0 ? _a : null;
    }
    static execute(snapshot, func, ...args) {
        const backup = { unit: null, data: null };
        try {
            backup.unit = UnitScope.current;
            UnitScope.current = snapshot.unit;
            if (snapshot.unit !== null && snapshot.data !== null && backup.data !== null) {
                backup.data = UnitScope.get(snapshot.unit);
                UnitScope.data.set(snapshot.unit, snapshot.data);
            }
            return func(...args);
        }
        catch (error) {
            throw error;
        }
        finally {
            UnitScope.current = backup.unit;
            if (snapshot.unit !== null && snapshot.data !== null && backup.data !== null) {
                UnitScope.data.set(snapshot.unit, backup.data);
            }
        }
    }
    static snapshot(unit = UnitScope.current) {
        return { unit, data: UnitScope.get(unit) };
    }
    static stack(unit, key, value) {
        UnitScope.data.set(unit, { stack: UnitScope.get(unit), key, value });
    }
    static trace(unit, key) {
        for (let data = UnitScope.get(unit); data !== null; data = data.stack) {
            if (data.key === key) {
                return data.value;
            }
        }
    }
}
UnitScope.current = null;
UnitScope.data = new Map();
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
// unit element
//----------------------------------------------------------------------------------------------------
class UnitElement {
    static initialize(unit, baseTarget) {
        UnitElement.elements.set(unit, [baseTarget]);
    }
    static finalize(unit) {
        const elements = UnitElement.elements.get(unit);
        if (elements && elements.length > 1) {
            elements[0].removeChild(elements[1]);
        }
        UnitElement.elements.delete(unit);
    }
    static nest(attributes, text) {
        var _a;
        const unit = UnitScope.current;
        if (unit === null) {
            throw new Error(`This function can not be called outside xnew.`);
        }
        const current = UnitElement.get(unit);
        if (isPlainObject(attributes) === false) {
            throw new Error(`The argument [attributes] is invalid.`);
        }
        else if (unit._.state !== 'pending') {
            throw new Error(`This function can not be called after initialized.`);
        }
        const element = UnitElement.append(current, attributes);
        if (text !== undefined && typeof text === 'string') {
            element.textContent = text;
        }
        (_a = UnitElement.elements.get(unit)) === null || _a === void 0 ? void 0 : _a.push(element);
        return element;
    }
    static get(unit) {
        var _a;
        return (_a = UnitElement.elements.get(unit)) === null || _a === void 0 ? void 0 : _a.slice(-1)[0];
    }
    static append(parentElement, attributes) {
        var _a, _b;
        const tagName = ((_b = (_a = attributes.tag) !== null && _a !== void 0 ? _a : attributes.tagName) !== null && _b !== void 0 ? _b : 'div').toLowerCase();
        let isNS = false;
        if (tagName === 'svg') {
            isNS = true;
        }
        else {
            for (let e = parentElement; e !== null; e = e.parentElement) {
                if (e.tagName.toLowerCase() === 'svg') {
                    isNS = true;
                    break;
                }
            }
        }
        let element;
        if (isNS) {
            element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
        }
        else {
            element = document.createElement(tagName);
        }
        Object.keys(attributes).forEach((key) => {
            const value = attributes[key];
            if (key === 'tagName' || key === 'class') ;
            else if (key === 'className') {
                if (typeof value === 'string' && value !== '') {
                    element.classList.add(...value.trim().split(/\s+/));
                }
            }
            else if (key === 'style') {
                if (typeof value === 'string') {
                    element.style.cssText = value;
                }
                else if (isPlainObject(value) === true) {
                    Object.assign(element.style, value);
                }
            }
            else {
                key.replace(/([A-Z])/g, '-$1').toLowerCase();
                if (element[key] === true || element[key] === false) {
                    element[key] = value;
                }
                else {
                    if (isNS) {
                        element.setAttributeNS(null, key, value);
                    }
                    else {
                        element.setAttribute(key, value);
                    }
                }
            }
        });
        parentElement.append(element);
        return element;
    }
}
UnitElement.elements = new Map();
//----------------------------------------------------------------------------------------------------
// unit event
//----------------------------------------------------------------------------------------------------
class UnitEvent {
    static on(unit, type, listener, options) {
        if (typeof type !== 'string' || (typeof type === 'string' && type.trim() === '')) {
            throw new Error('"type" is invalid.');
        }
        else if (typeof listener !== 'function') {
            throw new Error('"listener" is invalid.');
        }
        const snapshot = UnitScope.snapshot();
        let target = null;
        if (unit.element instanceof Element) {
            target = unit.element;
        }
        else if (unit._.baseTarget instanceof Window || unit._.baseTarget instanceof Document) {
            target = unit._.baseTarget;
        }
        const types = type.trim().split(/\s+/);
        types.forEach((type) => {
            if (UnitEvent.listeners.has(unit, type, listener) === false) {
                const execute = (...args) => {
                    UnitScope.execute(snapshot, listener, ...args);
                };
                UnitEvent.listeners.set(unit, type, listener, [target, execute]);
                UnitEvent.units.add(type, unit);
                if (/^[A-Za-z]/.test(type[0])) {
                    target === null || target === void 0 ? void 0 : target.addEventListener(type, execute, options);
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
                const tupple = UnitEvent.listeners.get(unit, type, lis);
                if (tupple !== undefined) {
                    const [target, execute] = tupple;
                    UnitEvent.listeners.delete(unit, type, lis);
                    if (target instanceof Element || target instanceof Window || target instanceof Document) {
                        target.removeEventListener(type, execute);
                    }
                }
            });
            if (UnitEvent.listeners.has(unit, type) === false) {
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
        else if ((unit === null || unit === void 0 ? void 0 : unit._.state) === 'finalized') {
            throw new Error('This function can not be called after finalized.');
        }
        if (type[0] === '+') {
            (_a = UnitEvent.units.get(type)) === null || _a === void 0 ? void 0 : _a.forEach((unit) => {
                var _a;
                (_a = UnitEvent.listeners.get(unit, type)) === null || _a === void 0 ? void 0 : _a.forEach(([_, execute]) => execute(...args));
            });
        }
        else if (type[0] === '-' && unit !== null) {
            (_b = UnitEvent.listeners.get(unit, type)) === null || _b === void 0 ? void 0 : _b.forEach(([_, execute]) => execute(...args));
        }
    }
}
UnitEvent.units = new MapSet();
UnitEvent.listeners = new MapMapMap();
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

const xnew$1 = function (...args) {
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
        if (args[0] instanceof Element || args[0] instanceof Window || args[0] instanceof Document) {
            target = args.shift(); // an existing html element
        }
        else if (typeof args[0] === 'string') {
            const selector = args.shift(); // a selector for an existing html element
            target = document.querySelector(selector);
            if (target == null) {
                throw new Error(`'${selector}' can not be found.`);
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
        if (!(args[0] === undefined || typeof args[0] === 'function' || ((target !== null && typeof target === 'object') && typeof args[0] === 'string'))) {
            throw new Error('The argument [parent, target, component] is invalid.');
        }
        return new Unit(parent, target, ...args);
    }
    catch (error) {
        console.error('xnew: ', error);
    }
};
Object.defineProperty(xnew$1, 'nest', { enumerable: true, value: nest });
function nest(attributes, text) {
    try {
        return UnitElement.nest(attributes, text);
    }
    catch (error) {
        console.error('xnew.nest(attributes): ', error);
    }
}
Object.defineProperty(xnew$1, 'extend', { enumerable: true, value: extend });
function extend(component, ...args) {
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
        console.error('xnew.extend(component, ...args): ', error);
    }
}
Object.defineProperty(xnew$1, 'context', { enumerable: true, value: context });
function context(key, value = undefined) {
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
}
Object.defineProperty(xnew$1, 'promise', { enumerable: true, value: promise });
function promise(mix) {
    try {
        return UnitPromise.execute(UnitScope.current, mix);
    }
    catch (error) {
        console.error('xnew.promise(mix): ', error);
        throw error;
    }
}
Object.defineProperty(xnew$1, 'emit', { enumerable: true, value: emit });
function emit(type, ...args) {
    try {
        UnitEvent.emit(type, ...args);
    }
    catch (error) {
        console.error('xnew.emit(type, ...args): ', error);
    }
}
Object.defineProperty(xnew$1, 'scope', { enumerable: true, value: scope });
function scope(callback) {
    const snapshot = UnitScope.snapshot();
    return (...args) => UnitScope.execute(snapshot, callback, ...args);
}
Object.defineProperty(xnew$1, 'find', { enumerable: true, value: find });
function find(component) {
    try {
        if (typeof component !== 'function') {
            throw new Error(`The argument [component] is invalid.`);
        }
        else {
            return UnitComponent.find(component);
        }
    }
    catch (error) {
        console.error('xnew.find(component): ', error);
    }
}
Object.defineProperty(xnew$1, 'timer', { enumerable: true, value: timeout });
Object.defineProperty(xnew$1, 'timeout', { enumerable: true, value: timeout });
function timeout(callback, delay) {
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
}
Object.defineProperty(xnew$1, 'interval', { enumerable: true, value: interval });
function interval(callback, delay) {
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
}
Object.defineProperty(xnew$1, 'transition', { enumerable: true, value: transition });
function transition(callback, interval, easing = 'linear') {
    const snapshot = UnitScope.snapshot();
    let stacks = [];
    let unit = xnew$1(Local, callback, interval, easing);
    let isRunning = true;
    function Local(self, callback, interval, easing) {
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
            const args = stacks.shift();
            unit = xnew$1(Local, ...args);
            isRunning = true;
        }
    }
    function clear() {
        stacks = [];
        unit.finalize();
    }
    function next(callback, interval, easing = 'linear') {
        stacks.push([callback, interval, easing]);
        execute();
        return timer;
    }
    timer = { clear, next };
    return timer;
}
// Object.defineProperty(xnew, 'css', { 
//     enumerable: true, 
//     value: function (label: string, style: { [key: string]: any }): void {
//         xnew((self: xnew.Unit) => {
//             const element = document.createElement('style');
//             let text = '';
//             Object.keys(style).forEach((key) => {
//                 const value = style[key];
//                 const snake = key.replace(/([A-Z])/g, '-$1').toLowerCase();
//                 text += `${snake}: ${value};`;
//             });
//             element.textContent = `${label}{ ${text} }`;
//             document.head.appendChild(element);
//             return {
//                 finalize() {
//                     document.head.removeChild(element);
//                 }
//             }
//         });
//     }
// });

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
        const win = xnew$1(window);
        win.on('pointermove', (event) => {
            if (event.pointerId === id) {
                const position = getPosition(self.element, event);
                const delta = { x: position.x - previous.x, y: position.y - previous.y };
                xnew$1.emit('-dragmove', { event, position, delta });
                previous = position;
            }
        });
        win.on('pointerup', (event) => {
            if (event.pointerId === id) {
                const position = getPosition(self.element, event);
                xnew$1.emit('-dragend', { event, position, });
                win.finalize();
            }
        });
        win.on('pointercancel', (event) => {
            if (event.pointerId === id) {
                const position = getPosition(self.element, event);
                xnew$1.emit('-dragcancel', { event, position, });
                win.finalize();
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
    const win = xnew$1(window);
    win.on('keydown', (event) => {
        state[event.code] = 1;
        xnew$1.emit('-keydown', { event, code: event.code });
    });
    win.on('keyup', (event) => {
        state[event.code] = 0;
        xnew$1.emit('-keyup', { event, code: event.code });
    });
    win.on('keydown', (event) => {
        xnew$1.emit('-arrowkeydown', { event, code: event.code, vector: getVector() });
    });
    win.on('keyup', (event) => {
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

function Screen(self, { width = 640, height = 480, fit = 'contain' } = {}) {
    const wrapper = xnew$1.nest({
        style: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }
    });
    const absolute = xnew$1.nest({
        style: { position: 'absolute', margin: 'auto' }
    });
    const canvas = xnew$1({
        tag: 'canvas', width, height,
        style: { width: '100%', height: '100%', verticalAlign: 'bottom' }
    });
    const observer = xnew$1(wrapper, ResizeEvent);
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

function Modal(self) {
    const fixed = xnew$1.nest({ style: { position: 'fixed', inset: 0 } });
    xnew$1().on('click', (event) => {
        if (fixed === event.target) {
            if (self.close) {
                self.close();
            }
            else {
                self.finalize();
            }
        }
    });
}

function WorkSpace(self, attributes = {}) {
    var _a;
    xnew$1.context('workspace', self);
    const current = {
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: 1
    };
    const local = attributes;
    local.style = Object.assign((_a = local.style) !== null && _a !== void 0 ? _a : {}, { overflow: 'hidden', });
    xnew$1.nest(local);
    xnew$1(Controller);
    const base = xnew$1.nest({ style: { position: 'absolute', top: '0px', left: '0px' } });
    xnew$1(Grid);
    return {
        get transform() {
            return current;
        },
        move(transform) {
            if (transform.position) {
                current.position = transform.position;
            }
            if (transform.rotation) {
                current.rotation = transform.rotation;
            }
            if (transform.scale) {
                current.scale = transform.scale;
            }
        },
        update() {
            let text = '';
            if (current.position) {
                text += `translate(${current.position.x}px, ${current.position.y}px) `;
            }
            if (current.rotation) {
                text += `rotate(${current.rotation}deg) `;
            }
            if (current.scale) {
                text += `scale(${current.scale}) `;
            }
            base.style.transform = text;
        }
    };
}
function Controller(self) {
    const ws = xnew$1.context('workspace');
    self.on('touchstart contextmenu wheel', (event) => event.preventDefault());
    self.on('+scale', (scale) => {
        if (self.element) {
            const s = 0.2 * (scale - 1);
            ws.move({
                position: {
                    x: ws.transform.position.x - (ws.transform.position.x + self.element.clientWidth / 2) * s,
                    y: ws.transform.position.y - (ws.transform.position.y + self.element.clientHeight / 2) * s,
                },
                scale: ws.transform.scale + s,
            });
        }
    });
    self.on('+translate', (delta) => {
        ws.move({
            position: {
                x: ws.transform.position.x - delta.x,
                y: ws.transform.position.y + delta.y
            }
        });
    });
    self.on('+rotate', (delta) => {
        // scene.rotation.x += delta.y * 0.01;
        // xthree.scene.rotation.z += delta.x * 0.01;
    });
    const user = xnew$1(UserEvent);
    user.on('-dragmove', ({ event, delta }) => {
        if (event.target == user.element) {
            if (event.buttons & 1 || !event.buttons) {
                xnew$1.emit('+rotate', { x: +delta.x, y: +delta.y });
            }
            if (event.buttons & 1) {
                xnew$1.emit('+translate', { x: -delta.x, y: +delta.y });
            }
        }
    });
    user.on('-wheel', ({ delta }) => xnew$1.emit('+scale', 1 + 0.001 * delta.y));
}
function Grid(self) {
    xnew$1.context('workspace');
    xnew$1.nest({ style: { position: 'absolute', top: '0px', left: '0px', pointerEvents: 'none' } });
    // for (let i = -count; i <= count; i++) {
    //     const lineX = xnew.nest({ style: { position: 'absolute', width: '1px', height: `${size * count}px`, backgroundColor: '#ccc' } });
    //     lineX.style.left = `${i * size}px`;
    //     grid.append(lineX);
    //     const lineY = xnew.nest({ style: { position: 'absolute', width: `${size * count}px`, height: '1px', backgroundColor: '#ccc' } });
    //     lineY.style.top = `${i * size}px`;
    //     grid.append(lineY);
    // }
    return {
        update() {
        }
    };
}

const xnew = Object.assign(xnew$1, {
    Screen,
    UserEvent,
    ResizeEvent,
    Modal,
    WorkSpace,
});

export { xnew as default };
