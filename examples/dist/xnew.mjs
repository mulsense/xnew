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
// defines
//----------------------------------------------------------------------------------------------------
const SYSTEM_EVENTS = ['start', 'update', 'stop', 'finalize'];
class UnitPromise {
    constructor(promise) {
        this.promise = promise;
    }
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
// Unit
//----------------------------------------------------------------------------------------------------
class Unit {
    constructor(parent, target, component, props) {
        var _a;
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
            baseComponent = (self) => { self.element.textContent = component; };
        }
        else {
            baseComponent = (self) => { };
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
        Unit.stop(this);
        const anchorElement = (_b = (_a = this._.elements[0]) === null || _a === void 0 ? void 0 : _a.nextElementSibling) !== null && _b !== void 0 ? _b : null;
        Unit.finalize(this);
        Unit.initialize(this, anchorElement);
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
            captures: [],
            components: [],
            listeners1: new MapMap(),
            listeners2: new MapMap(),
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
        // setup capture
        let captured = false;
        for (let current = unit; current !== null && captured === false; current = current._.parent) {
            for (const capture of current._.captures) {
                if (capture.checker(unit)) {
                    capture.execute(unit);
                    captured = true;
                }
            }
        }
        Unit.current = backup;
    }
    static finalize(unit) {
        if (unit._.state !== 'finalized' && unit._.state !== 'pre-finalized') {
            unit._.state = 'pre-finalized';
            unit._.children.forEach((child) => child.finalize());
            unit._.systems.finalize.forEach((listener) => Unit.scope(Unit.snapshot(unit), listener));
            unit.off();
            Unit.suboff(unit, null);
            unit._.components.forEach((component) => {
                Unit.componentUnits.delete(component, unit);
            });
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
            unit._.state = 'finalized';
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
        Unit.componentUnits.add(component, unit);
        const defines = (_a = component(unit, props)) !== null && _a !== void 0 ? _a : {};
        Object.keys(defines).forEach((key) => {
            if (unit[key] !== undefined && unit._.defines[key] === undefined) {
                throw new Error(`The property "${key}" already exists.`);
            }
            const descriptor = Object.getOwnPropertyDescriptor(defines, key);
            const wrappedDesc = { configurable: true, enumerable: true };
            if (descriptor === null || descriptor === void 0 ? void 0 : descriptor.get) {
                wrappedDesc.get = Unit.wrap(unit, descriptor.get);
            }
            if (descriptor === null || descriptor === void 0 ? void 0 : descriptor.set) {
                wrappedDesc.set = Unit.wrap(unit, descriptor.set);
            }
            if (typeof (descriptor === null || descriptor === void 0 ? void 0 : descriptor.value) === 'function') {
                wrappedDesc.value = Unit.wrap(unit, descriptor.value);
            }
            else if ((descriptor === null || descriptor === void 0 ? void 0 : descriptor.value) !== undefined) {
                wrappedDesc.writable = true;
                wrappedDesc.value = descriptor.value;
            }
            Object.defineProperty(unit._.defines, key, wrappedDesc);
            Object.defineProperty(unit, key, wrappedDesc);
        });
    }
    static start(unit, time) {
        if (unit._.tostart === false)
            return;
        if (unit._.state === 'initialized' || unit._.state === 'stopped') {
            unit._.state = 'started';
            unit._.children.forEach((child) => Unit.start(child, time));
            unit._.systems.start.forEach((listener) => Unit.scope(Unit.snapshot(unit), listener));
        }
        else if (unit._.state === 'started') {
            unit._.children.forEach((child) => Unit.start(child, time));
        }
    }
    static stop(unit) {
        if (unit._.state === 'started') {
            unit._.state = 'stopped';
            unit._.children.forEach((child) => Unit.stop(child));
            unit._.systems.stop.forEach((listener) => Unit.scope(Unit.snapshot(unit), listener));
        }
    }
    static update(unit, time) {
        if (unit._.state === 'started') {
            unit._.children.forEach((child) => Unit.update(child, time));
            unit._.systems.update.forEach((listener) => Unit.scope(Unit.snapshot(unit), listener));
        }
    }
    static ticker(time) {
        if (Unit.root !== null) {
            Unit.start(Unit.root, time);
            Unit.update(Unit.root, time);
        }
    }
    static reset() {
        var _a;
        (_a = Unit.root) === null || _a === void 0 ? void 0 : _a.finalize();
        Unit.root = new Unit(null, null);
        Unit.current = Unit.root;
        Ticker.clear(Unit.ticker);
        Ticker.set(Unit.ticker);
    }
    //----------------------------------------------------------------------------------------------------
    // scope
    //----------------------------------------------------------------------------------------------------
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
    static stack(unit, key, value) {
        unit._.currentContext = { stack: unit._.currentContext, key, value };
    }
    static trace(unit, key) {
        for (let context = unit._.currentContext; context !== null; context = context.stack) {
            if (context.key === key) {
                return context.value;
            }
        }
    }
    static find(component) {
        var _a;
        return [...((_a = Unit.componentUnits.get(component)) !== null && _a !== void 0 ? _a : [])];
    }
    on(type, listener, options) {
        if (this._.state === 'finalized')
            return;
        type.trim().split(/\s+/).forEach((type) => {
            if (SYSTEM_EVENTS.includes(type)) {
                this._.systems[type].push(listener);
            }
            if (this._.listeners1.has(type, listener) === false) {
                const execute = Unit.wrap(Unit.current, listener);
                this._.listeners1.set(type, listener, [this.element, execute]);
                Unit.typeUnits.add(type, this);
                if (/^[A-Za-z]/.test(type)) {
                    this.element.addEventListener(type, execute, options);
                }
            }
        });
    }
    off(type, listener) {
        const types = typeof type === 'string' ? type.trim().split(/\s+/) : [...this._.listeners1.keys()];
        types.forEach((type) => {
            if (SYSTEM_EVENTS.includes(type)) {
                this._.systems[type] = this._.systems[type].filter((lis) => listener ? lis !== listener : false);
            }
            (listener ? [listener] : [...this._.listeners1.keys(type)]).forEach((lis) => {
                const tuple = this._.listeners1.get(type, lis);
                if (tuple !== undefined) {
                    const [target, execute] = tuple;
                    this._.listeners1.delete(type, lis);
                    if (/^[A-Za-z]/.test(type)) {
                        target.removeEventListener(type, execute);
                    }
                }
            });
            if (this._.listeners1.has(type) === false) {
                Unit.typeUnits.delete(type, this);
            }
        });
    }
    emit(type, ...args) {
        var _a, _b;
        if (this._.state === 'finalized')
            return;
        if (type[0] === '+') {
            (_a = Unit.typeUnits.get(type)) === null || _a === void 0 ? void 0 : _a.forEach((unit) => {
                var _a;
                (_a = unit._.listeners1.get(type)) === null || _a === void 0 ? void 0 : _a.forEach(([_, execute]) => execute(...args));
            });
        }
        else if (type[0] === '-') {
            (_b = this._.listeners1.get(type)) === null || _b === void 0 ? void 0 : _b.forEach(([_, execute]) => execute(...args));
        }
    }
    static subon(unit, target, type, listener, options) {
        type.trim().split(/\s+/).forEach((type) => {
            if (unit._.listeners2.has(type, listener) === false) {
                const execute = Unit.wrap(unit, listener);
                unit._.listeners2.set(type, listener, [target, execute]);
                target.addEventListener(type, execute, options);
            }
        });
    }
    static suboff(unit, target, type, listener) {
        const types = typeof type === 'string' ? type.trim().split(/\s+/) : [...unit._.listeners2.keys()];
        types.forEach((type) => {
            (listener ? [listener] : [...unit._.listeners2.keys(type)]).forEach((lis) => {
                const tuple = unit._.listeners2.get(type, lis);
                if (tuple !== undefined) {
                    const [element, execute] = tuple;
                    if (target === null || target === element) {
                        unit._.listeners2.delete(type, lis);
                        element.removeEventListener(type, execute);
                    }
                }
            });
        });
    }
}
Unit.root = null;
Unit.componentUnits = new MapSet();
//----------------------------------------------------------------------------------------------------
// event
//----------------------------------------------------------------------------------------------------
Unit.typeUnits = new MapSet();

const xnew$1 = function (...args) {
    if (Unit.root === null) {
        Unit.reset();
    }
    let target;
    if (args[0] instanceof HTMLElement || args[0] instanceof SVGElement) {
        target = args.shift(); // an existing html element
    }
    else if (typeof args[0] === 'string') {
        const str = args.shift(); // a selector for an existing html element
        if (str.match(/<([^>]*)\/?>/)) {
            target = str;
        }
        else {
            target = document.querySelector(str);
            if (target == null) {
                throw new Error(`'${str}' can not be found.`);
            }
        }
    }
    else {
        target = null;
    }
    return new Unit(Unit.current, target, ...args);
};
xnew$1.nest = (tag) => {
    var _a;
    if (((_a = Unit.current) === null || _a === void 0 ? void 0 : _a._.state) === 'invoked') {
        return Unit.nest(Unit.current, tag);
    }
    else {
        throw new Error('This function can not be called after initialized.');
    }
};
xnew$1.extend = (component, props) => {
    var _a;
    if (((_a = Unit.current) === null || _a === void 0 ? void 0 : _a._.state) === 'invoked') {
        return Unit.extend(Unit.current, component, props);
    }
    else {
        throw new Error('This function can not be called after initialized.');
    }
};
xnew$1.context = (key, value = undefined) => {
    try {
        if (value !== undefined) {
            Unit.stack(Unit.current, key, value);
        }
        else {
            return Unit.trace(Unit.current, key);
        }
    }
    catch (error) {
        console.error('xnew.context(key, value?): ', error);
    }
};
xnew$1.promise = (promise) => {
    try {
        Unit.current._.promises.push(promise);
        return new UnitPromise(promise);
    }
    catch (error) {
        console.error('xnew.promise(mix): ', error);
        throw error;
    }
};
xnew$1.then = (callback) => {
    try {
        return new UnitPromise(Promise.all(Unit.current._.promises)).then(callback);
    }
    catch (error) {
        console.error('xnew.then(mix): ', error);
        throw error;
    }
};
xnew$1.catch = (callback) => {
    try {
        return new UnitPromise(Promise.all(Unit.current._.promises)).catch(callback);
    }
    catch (error) {
        console.error('xnew.catch(mix): ', error);
        throw error;
    }
};
xnew$1.finally = (callback) => {
    try {
        return new UnitPromise(Promise.all(Unit.current._.promises)).finally(callback);
    }
    catch (error) {
        console.error('xnew.finally(mix): ', error);
        throw error;
    }
};
xnew$1.fetch = (url, options) => {
    try {
        const promise = fetch(url, options);
        Unit.current._.promises.push(promise);
        return new UnitPromise(promise);
    }
    catch (error) {
        console.error('xnew.promise(mix): ', error);
        throw error;
    }
};
xnew$1.scope = (callback) => {
    const snapshot = Unit.snapshot(Unit.current);
    return (...args) => Unit.scope(snapshot, callback, ...args);
};
xnew$1.find = (component) => {
    if (typeof component === 'function') {
        return Unit.find(component);
    }
    else {
        throw new Error(`The argument [component] is invalid.`);
    }
};
xnew$1.append = (base, ...args) => {
    if (typeof base === 'function') {
        for (let unit of Unit.find(base)) {
            Unit.scope(Unit.snapshot(unit), xnew$1, ...args);
        }
    }
    else if (base instanceof Unit) {
        Unit.scope(Unit.snapshot(base), xnew$1, ...args);
    }
    else {
        throw new Error(`The argument [component] is invalid.`);
    }
};
xnew$1.timeout = (callback, delay) => {
    const snapshot = Unit.snapshot(Unit.current);
    const unit = xnew$1((self) => {
        const timer = new Timer(() => {
            Unit.scope(snapshot, callback);
            self.finalize();
        }, null, delay);
        self.on('finalize', () => {
            timer.clear();
        });
    });
    return { clear: () => unit.finalize() };
};
xnew$1.interval = (callback, delay) => {
    const snapshot = Unit.snapshot(Unit.current);
    const unit = xnew$1((self) => {
        const timer = new Timer(() => {
            Unit.scope(snapshot, callback);
        }, null, delay, true);
        self.on('finalize', () => {
            timer.clear();
        });
    });
    return { clear: () => unit.finalize() };
};
xnew$1.transition = (callback, interval, easing = 'linear') => {
    const snapshot = Unit.snapshot(Unit.current);
    let stacks = [];
    let unit = xnew$1(Local, { callback, interval, easing });
    let isRunning = true;
    function Local(self, { callback, interval, easing }) {
        const timer = new Timer(() => {
            Unit.scope(snapshot, callback, 1.0);
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
                Unit.scope(snapshot, callback, progress);
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
xnew$1.listener = function (target) {
    return {
        on(type, listener, options) {
            Unit.subon(Unit.current, target, type, listener, options);
        },
        off(type, listener) {
            Unit.suboff(Unit.current, target, type, listener);
        }
    };
};
xnew$1.capture = function (checker, execute) {
    Unit.current._.captures.push({ checker, execute: Unit.wrap(Unit.current, (unit) => execute(unit)) });
};

function UserEvent(unit) {
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
    const keyborad = xnew$1(Keyboard);
    keyborad.on('-keydown', (...args) => unit.emit('-keydown', ...args));
    keyborad.on('-keyup', (...args) => unit.emit('-keyup', ...args));
    keyborad.on('-arrowkeydown', (...args) => unit.emit('-arrowkeydown', ...args));
    keyborad.on('-arrowkeyup', (...args) => unit.emit('-arrowkeyup', ...args));
}
function DragEvent(unit) {
    xnew$1().on('pointerdown', (event) => {
        const id = event.pointerId;
        const position = getPosition(unit.element, event);
        let previous = position;
        xnew$1(() => {
            xnew$1.listener(window).on('pointermove', (event) => {
                if (event.pointerId === id) {
                    const position = getPosition(unit.element, event);
                    const delta = { x: position.x - previous.x, y: position.y - previous.y };
                    unit.emit('-dragmove', { event, position, delta });
                    previous = position;
                }
            });
            xnew$1.listener(window).on('pointerup', (event) => {
                if (event.pointerId === id) {
                    const position = getPosition(unit.element, event);
                    unit.emit('-dragend', { event, position, });
                    xnew$1.listener(window).off();
                }
            });
            xnew$1.listener(window).on('pointercancel', (event) => {
                if (event.pointerId === id) {
                    const position = getPosition(unit.element, event);
                    unit.emit('-dragcancel', { event, position, });
                    xnew$1.listener(window).off();
                }
            });
        });
        unit.emit('-dragstart', { event, position });
    });
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
function Keyboard(unit) {
    const state = {};
    xnew$1.listener(window).on('keydown', (event) => {
        state[event.code] = 1;
        unit.emit('-keydown', { event, code: event.code });
    });
    xnew$1.listener(window).on('keyup', (event) => {
        state[event.code] = 0;
        unit.emit('-keyup', { event, code: event.code });
    });
    xnew$1.listener(window).on('keydown', (event) => {
        unit.emit('-arrowkeydown', { event, code: event.code, vector: getVector() });
    });
    xnew$1.listener(window).on('keyup', (event) => {
        unit.emit('-arrowkeyup', { event, code: event.code, vector: getVector() });
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

function InputFrame(frame, {} = {}) {
    xnew$1.nest('<div>');
    xnew$1.capture((unit) => {
        return unit.element.tagName.toLowerCase() === 'input';
    }, (unit) => {
        const element = unit.element;
        xnew$1.listener(element).on('input', (event) => {
            frame.emit('-input', { event });
        });
        xnew$1.listener(element).on('change', (event) => {
            frame.emit('-change', { event });
        });
        xnew$1.listener(element).on('click', (event) => {
            frame.emit('-click', { event });
        });
    });
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

function DragFrame(frame, { x = 0, y = 0 } = {}) {
    const absolute = xnew$1.nest(`<div style="position: absolute; top: ${y}px; left: ${x}px;">`);
    xnew$1.context('xnew.dragframe', { frame, absolute });
}
function DragTarget(target, {} = {}) {
    const { frame, absolute } = xnew$1.context('xnew.dragframe');
    xnew$1.nest('<div>');
    const user = xnew$1(absolute.parentElement, UserEvent);
    const current = { x: 0, y: 0 };
    const offset = { x: 0, y: 0 };
    let dragged = false;
    user.on('-dragstart', ({ event, position }) => {
        if (target.element.contains(event.target) === false)
            return;
        dragged = true;
        offset.x = position.x - parseFloat(absolute.style.left || '0');
        offset.y = position.y - parseFloat(absolute.style.top || '0');
        current.x = position.x - offset.x;
        current.y = position.y - offset.y;
    });
    user.on('-dragmove', ({ event, delta }) => {
        if (dragged !== true)
            return;
        current.x += delta.x;
        current.y += delta.y;
        absolute.style.left = `${current.x}px`;
        absolute.style.top = `${current.y}px`;
    });
    user.on('-dragcancel -dragend', ({ event }) => {
        dragged = false;
    });
}

//----------------------------------------------------------------------------------------------------
// controller
//----------------------------------------------------------------------------------------------------
function SVGTemplate(self, { fill = null, fillOpacity = 0.8, stroke = null, strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round' }) {
    xnew$1.nest(`<svg
        viewBox="0 0 100 100"
        style="position: absolute; width: 100%; height: 100%; user-select: none;
        ${fill ? `fill: ${fill}; fill-opacity: ${fillOpacity};` : ''}
        ${stroke ? `stroke: ${stroke}; stroke-opacity: ${strokeOpacity}; stroke-width: ${strokeWidth}; stroke-linejoin: ${strokeLinejoin};` : ''}
    ">`);
}
function TouchStick(self, { size = 130, fill = '#FFF', fillOpacity = 0.8, stroke = '#000', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round' } = {}) {
    strokeWidth /= (size / 100);
    xnew$1.nest(`<div style="position: relative; width: ${size}px; height: ${size}px; cursor: pointer; user-select: none; overflow: hidden;">`);
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
    const user = xnew$1(UserEvent);
    user.on('-dragstart', ({ event, position }) => {
        const vector = getVector(position);
        target.element.style.filter = 'brightness(90%)';
        target.element.style.left = vector.x * size / 4 + 'px';
        target.element.style.top = vector.y * size / 4 + 'px';
        self.emit('-down', { vector });
    });
    user.on('-dragmove', ({ event, position }) => {
        const vector = getVector(position);
        target.element.style.filter = 'brightness(90%)';
        target.element.style.left = vector.x * size / 4 + 'px';
        target.element.style.top = vector.y * size / 4 + 'px';
        self.emit('-move', { vector });
    });
    user.on('-dragend', ({ event }) => {
        const vector = { x: 0, y: 0 };
        target.element.style.filter = '';
        target.element.style.left = vector.x * size / 4 + 'px';
        target.element.style.top = vector.y * size / 4 + 'px';
        self.emit('-up', { vector });
    });
    function getVector(position) {
        const x = position.x - size / 2;
        const y = position.y - size / 2;
        const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (size / 4));
        const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
        return { x: Math.cos(a) * d, y: Math.sin(a) * d };
    }
}
function DirectionalPad(self, { size, diagonal = true, fill = '#FFF', fillOpacity = 0.8, stroke = '#000', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round' } = {}) {
    let internal;
    let newsize;
    if (size) {
        newsize = size;
    }
    else {
        newsize = Math.min(self.element.clientWidth, self.element.clientHeight);
        console.log(self.element.parentElement, self.element);
        xnew$1(self.element, ResizeEvent).on('-resize', () => {
            newsize = Math.min(self.element.clientWidth, self.element.clientHeight);
            internal === null || internal === void 0 ? void 0 : internal.reboot();
        });
    }
    internal = xnew$1(() => {
        xnew$1.nest(`<div style="position: relative; width: ${newsize}px; height: ${newsize}px; margin: auto; cursor: pointer; user-select: none; pointer-events: auto; overflow: hidden;">`);
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
        const user = xnew$1(UserEvent);
        user.on('-dragstart', ({ event, position }) => {
            const vector = getVector(position);
            targets[0].element.style.filter = (vector.y < 0) ? 'brightness(90%)' : '';
            targets[1].element.style.filter = (vector.y > 0) ? 'brightness(90%)' : '';
            targets[2].element.style.filter = (vector.x < 0) ? 'brightness(90%)' : '';
            targets[3].element.style.filter = (vector.x > 0) ? 'brightness(90%)' : '';
            self.emit('-down', { vector });
        });
        user.on('-dragmove', ({ event, position }) => {
            const vector = getVector(position);
            targets[0].element.style.filter = (vector.y < 0) ? 'brightness(90%)' : '';
            targets[1].element.style.filter = (vector.y > 0) ? 'brightness(90%)' : '';
            targets[2].element.style.filter = (vector.x < 0) ? 'brightness(90%)' : '';
            targets[3].element.style.filter = (vector.x > 0) ? 'brightness(90%)' : '';
            self.emit('-move', { vector });
        });
        user.on('-dragend', ({ event }) => {
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
function TouchButton(self, { size = 80, fill = '#FFF', fillOpacity = 0.8, stroke = '#000', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round' } = {}) {
    strokeWidth /= (size / 100);
    xnew$1.nest(`<div style="position: relative; width: ${size}px; height: ${size}px; cursor: pointer; user-select: none; overflow: hidden;">`);
    const target = xnew$1((self) => {
        xnew$1.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
        xnew$1('<circle cx="50" cy="50" r="40">');
    });
    const user = xnew$1(UserEvent);
    user.on('-dragstart', (event) => {
        target.element.style.filter = 'brightness(90%)';
        self.emit('-down', event);
    });
    user.on('-dragend', (event) => {
        target.element.style.filter = '';
        self.emit('-up', event);
    });
}

const context = new AudioContext();
const master = context.createGain();
master.gain.value = 1.0;
master.connect(context.destination);
function connect(params) {
    const nodes = {};
    Object.keys(params).forEach((key) => {
        const [type, props, ...to] = params[key];
        nodes[key] = context[`create${type}`]();
        Object.keys(props).forEach((name) => {
            var _a;
            if (((_a = nodes[key][name]) === null || _a === void 0 ? void 0 : _a.value) !== undefined) {
                nodes[key][name].value = props[name];
            }
            else {
                nodes[key][name] = props[name];
            }
        });
    });
    Object.keys(params).forEach((key) => {
        const [type, props, ...to] = params[key];
        to.forEach((to) => {
            let dest = null;
            if (to.indexOf('.') > 0) {
                dest = nodes[to.split('.')[0]][to.split('.')[1]];
            }
            else if (nodes[to]) {
                dest = nodes[to];
            }
            else if (to === 'master') {
                dest = master;
            }
            nodes[key].connect(dest);
        });
    });
    return nodes;
}

const store = new Map();
function load(path) {
    return new AudioFile(path);
}
class AudioFile {
    constructor(path) {
        this.data = {};
        if (store.has(path)) {
            this.data = store.get(path);
        }
        else {
            this.data.buffer = null;
            this.data.promise = fetch(path)
                .then((response) => response.arrayBuffer())
                .then((response) => context.decodeAudioData(response))
                .then((response) => {
                this.data.buffer = response;
                this.nodes.source.buffer = this.data.buffer;
            })
                .catch(() => {
                console.warn(`"${path}" could not be loaded.`);
            });
            store.set(path, this.data);
        }
        this.startTime = null;
        this.nodes = connect({
            source: ['BufferSource', {}, 'volume'],
            volume: ['Gain', { gain: 1.0 }, 'master'],
        });
    }
    isReady() {
        return this.data.buffer ? true : false;
    }
    get promise() {
        return this.data.promise;
    }
    set volume(value) {
        this.nodes.volume.gain.value = value;
    }
    get volume() {
        return this.nodes.volume.gain.value;
    }
    set loop(value) {
        this.nodes.source.loop = value;
    }
    get loop() {
        return this.nodes.source.loop;
    }
    play(offset = 0) {
        if (this.startTime !== null)
            return;
        if (this.isReady()) {
            this.startTime = context.currentTime;
            this.nodes.source.playbackRate.value = 1;
            this.nodes.source.start(context.currentTime, offset / 1000);
        }
        else {
            this.promise.then(() => this.play());
        }
    }
    pause() {
        if (this.startTime === null)
            return;
        this.nodes.source.stop(context.currentTime);
        const elapsed = (context.currentTime - this.startTime) % this.data.buffer.duration * 1000;
        this.startTime = null;
        return elapsed;
    }
}

function synthesizer(props, effects) {
    return new Synthesizer(props, effects);
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function isObject(val) {
    return val !== null && typeof val === 'object';
}
function isNumber(val) {
    return typeof val === 'number' && !isNaN(val);
}
class Synthesizer {
    static initialize() {
        window.addEventListener('touchstart', initialize, true);
        window.addEventListener('mousedown', initialize, true);
        function initialize() {
            new Synthesizer().press(440);
            window.removeEventListener('touchstart', initialize, true);
            window.removeEventListener('mousedown', initialize, true);
        }
    }
    constructor({ oscillator = null, filter = null, amp = null } = {}, { bmp = null, reverb = null } = {}) {
        this.oscillator = isObject(oscillator) ? oscillator : {};
        this.oscillator.type = setType(this.oscillator.type, ['sine', 'triangle', 'square', 'sawtooth']);
        this.oscillator.envelope = setEnvelope(this.oscillator.envelope, -36, +36);
        this.oscillator.LFO = setLFO(this.oscillator.LFO, 36);
        this.filter = isObject(filter) ? filter : {};
        this.filter.type = setType(this.filter.type, ['lowpass', 'highpass', 'bandpass']);
        this.filter.cutoff = isNumber(this.filter.cutoff) ? clamp(this.filter.cutoff, 4, 8192) : undefined;
        this.amp = isObject(amp) ? amp : {};
        this.amp.envelope = setEnvelope(this.amp.envelope, 0, 1);
        this.amp.LFO = setLFO(this.amp.LFO, 36);
        this.bmp = isNumber(bmp) ? clamp(bmp, 60, 240) : 120;
        this.reverb = isObject(reverb) ? reverb : {};
        this.reverb.time = isNumber(this.reverb.time) ? clamp(this.reverb.time, 0, 2000) : 0.0;
        this.reverb.mix = isNumber(this.reverb.mix) ? clamp(this.reverb.mix, 0, 1.0) : 0.0;
        function setType(type, list, value = 0) {
            return list.includes(type) ? type : list[value];
        }
        function setEnvelope(envelope, minAmount, maxAmount) {
            var _a, _b, _c, _d;
            if (!isObject(envelope))
                return null;
            const result = {
                amount: isNumber(envelope.amount) ? clamp(envelope.amount, minAmount, maxAmount) : 0,
                ADSR: [
                    isNumber((_a = envelope.ADSR) === null || _a === void 0 ? void 0 : _a[0]) ? clamp(envelope.ADSR[0], 0, 8000) : 0,
                    isNumber((_b = envelope.ADSR) === null || _b === void 0 ? void 0 : _b[1]) ? clamp(envelope.ADSR[1], 0, 8000) : 0,
                    isNumber((_c = envelope.ADSR) === null || _c === void 0 ? void 0 : _c[2]) ? clamp(envelope.ADSR[2], 0, 1) : 0,
                    isNumber((_d = envelope.ADSR) === null || _d === void 0 ? void 0 : _d[3]) ? clamp(envelope.ADSR[3], 0, 8000) : 0,
                ]
            };
            return result;
        }
        function setLFO(LFO, maxAmount) {
            if (!isObject(LFO))
                return null;
            const oscTypes = ['sine', 'triangle', 'square', 'sawtooth'];
            const type = oscTypes.includes(LFO.type)
                ? LFO.type
                : 'sine';
            const result = {
                amount: isNumber(LFO.amount) ? clamp(LFO.amount, 0, maxAmount) : 0,
                type,
                rate: isNumber(LFO.rate) ? clamp(LFO.rate, 1, 128) : 1,
            };
            return result;
        }
    }
    press(frequency, duration = null, wait = 0.0) {
        frequency = typeof frequency === 'string' ? Synthesizer.keymap[frequency] : frequency;
        duration = typeof duration === 'string' ? (Synthesizer.notemap[duration] * 60 / this.bmp) : (duration !== null ? (duration / 1000) : duration);
        const start = context.currentTime + wait / 1000;
        let stop = null;
        const params = {};
        if (this.filter.type && this.filter.cutoff) {
            params.oscillator = ['Oscillator', {}, 'filter'];
            params.filter = ['BiquadFilter', {}, 'amp'];
        }
        else {
            params.oscillator = ['Oscillator', {}, 'amp'];
        }
        params.amp = ['Gain', { gain: 0.0 }, 'target'];
        params.target = ['Gain', { gain: 1.0 }, 'master'];
        if (this.reverb.time > 0.0 && this.reverb.mix > 0.0) {
            params.amp.push('convolver');
            params.convolver = ['Convolver', { buffer: impulseResponse({ time: this.reverb.time }) }, 'convolverDepth'];
            params.convolverDepth = ['Gain', { gain: 1.0 }, 'master'];
        }
        if (this.oscillator.LFO) {
            params.oscillatorLFO = ['Oscillator', {}, 'oscillatorLFODepth'];
            params.oscillatorLFODepth = ['Gain', {}, 'oscillator.frequency'];
        }
        if (this.amp.LFO) {
            params.ampLFO = ['Oscillator', {}, 'ampLFODepth'];
            params.ampLFODepth = ['Gain', {}, 'amp.gain'];
        }
        const nodes = connect(params);
        nodes.oscillator.type = this.oscillator.type;
        nodes.oscillator.frequency.value = clamp(frequency, 10.0, 5000.0);
        if (this.filter.type && this.filter.cutoff) {
            nodes.filter.type = this.filter.type;
            nodes.filter.frequency.value = this.filter.cutoff;
        }
        if (this.reverb.time > 0.0 && this.reverb.mix > 0.0) {
            nodes.target.gain.value *= (1.0 - this.reverb.mix);
            nodes.convolverDepth.gain.value *= this.reverb.mix;
        }
        {
            if (this.oscillator.LFO) {
                nodes.oscillatorLFODepth.gain.value = frequency * (Math.pow(2.0, this.oscillator.LFO.amount / 12.0) - 1.0);
                nodes.oscillatorLFO.type = this.oscillator.LFO.type;
                nodes.oscillatorLFO.frequency.value = this.oscillator.LFO.rate;
                nodes.oscillatorLFO.start(start);
            }
            if (this.amp.LFO) {
                nodes.ampLFODepth.gain.value = this.amp.LFO.amount;
                nodes.ampLFO.type = this.amp.LFO.type;
                nodes.ampLFO.frequency.value = this.amp.LFO.rate;
                nodes.ampLFO.start(start);
            }
            if (this.oscillator.envelope) {
                const amount = frequency * (Math.pow(2.0, this.oscillator.envelope.amount / 12.0) - 1.0);
                startEnvelope(nodes.oscillator.frequency, frequency, amount, this.oscillator.envelope.ADSR);
            }
            if (this.amp.envelope) {
                startEnvelope(nodes.amp.gain, 0.0, this.amp.envelope.amount, this.amp.envelope.ADSR);
            }
            nodes.oscillator.start(start);
        }
        if (duration !== null) {
            release.call(this);
        }
        function release() {
            duration = duration !== null && duration !== void 0 ? duration : (context.currentTime - start);
            if (this.amp.envelope) {
                const ADSR = this.amp.envelope.ADSR;
                const adsr = [ADSR[0] / 1000, ADSR[1] / 1000, ADSR[2], ADSR[3] / 1000];
                const rate = adsr[0] === 0.0 ? 1.0 : Math.min(duration / adsr[0], 1.0);
                stop = start + Math.max((adsr[0] + adsr[1]) * rate, duration) + adsr[3];
            }
            else {
                stop = start + duration;
            }
            if (this.oscillator.LFO) {
                nodes.oscillatorLFO.stop(stop);
            }
            if (this.amp.LFO) {
                nodes.ampLFO.stop(stop);
            }
            if (this.oscillator.envelope) {
                const amount = frequency * (Math.pow(2.0, this.oscillator.envelope.amount / 12.0) - 1.0);
                stopEnvelope(nodes.oscillator.frequency, frequency, amount, this.oscillator.envelope.ADSR);
            }
            if (this.amp.envelope) {
                stopEnvelope(nodes.amp.gain, 0.0, this.amp.envelope.amount, this.amp.envelope.ADSR);
            }
            nodes.oscillator.stop(stop);
        }
        function startEnvelope(param, base, amount, ADSR) {
            const adsr = [ADSR[0] / 1000, ADSR[1] / 1000, ADSR[2], ADSR[3] / 1000];
            param.value = base;
            param.setValueAtTime(base, start);
            param.linearRampToValueAtTime(base + amount, start + adsr[0]);
            param.linearRampToValueAtTime(base + amount * adsr[2], start + (adsr[0] + adsr[1]));
        }
        function stopEnvelope(param, base, amount, ADSR) {
            const adsr = [ADSR[0] / 1000, ADSR[1] / 1000, ADSR[2], ADSR[3] / 1000];
            const rate = adsr[0] === 0.0 ? 1.0 : Math.min(duration / adsr[0], 1.0);
            if (rate < 1.0) {
                param.cancelScheduledValues(start);
                param.setValueAtTime(base, start);
                param.linearRampToValueAtTime(base + amount * rate, start + adsr[0] * rate);
                param.linearRampToValueAtTime(base + amount * rate * adsr[2], start + (adsr[0] + adsr[1]) * rate);
            }
            param.linearRampToValueAtTime(base + amount * rate * adsr[2], start + Math.max((adsr[0] + adsr[1]) * rate, duration));
            param.linearRampToValueAtTime(base, start + Math.max((adsr[0] + adsr[1]) * rate, duration) + adsr[3]);
        }
        return {
            release: release.bind(this),
        };
    }
}
Synthesizer.keymap = {
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
Synthesizer.notemap = {
    '1m': 4.000, '2n': 2.000, '4n': 1.000, '8n': 0.500, '16n': 0.250, '32n': 0.125,
};
Synthesizer.initialize();
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

const basics = {
    Screen,
    UserEvent,
    ResizeEvent,
    ModalFrame,
    ModalContent,
    AccordionFrame,
    AccordionHeader,
    AccordionBullet,
    AccordionContent,
    TabFrame,
    TabButton,
    TabContent,
    InputFrame,
    DragFrame,
    DragTarget,
    TouchStick,
    DirectionalPad,
    TouchButton,
};
const audio = {
    synthesizer, load
};
const xnew = Object.assign(xnew$1, {
    basics,
    audio,
});

export { xnew as default };
