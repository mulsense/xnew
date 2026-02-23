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
class AnimationTicker {
    constructor(callback, fps = 60) {
        const self = this;
        this.id = null;
        let previous = 0;
        function ticker() {
            const delta = Date.now() - previous;
            if (delta > (1000 / fps) * 0.9) {
                callback();
                previous += delta;
            }
            self.id = requestAnimationFrame(ticker);
        }
        self.id = requestAnimationFrame(ticker);
    }
    clear() {
        if (this.id !== null) {
            cancelAnimationFrame(this.id);
            this.id = null;
        }
    }
}
class Timer {
    constructor(options) {
        this.options = options;
        this.startid = null;
        this.endid = null;
        this.time = 0.0;
        this.counter = 0;
        this.offset = 0.0;
        this.status = 0;
        this.ticker = new AnimationTicker((time) => {
            var _a, _b;
            let p = Math.min(this.elapsed() / this.options.duration, 1.0);
            if (this.options.easing === 'ease-out') {
                p = Math.pow((1.0 - Math.pow((1.0 - p), 2.0)), 0.5);
            }
            else if (this.options.easing === 'ease-in') {
                p = Math.pow((1.0 - Math.pow((1.0 - p), 0.5)), 2.0);
            }
            else if (this.options.easing === 'ease' || this.options.easing === 'ease-in-out') {
                // p = (1.0 - Math.cos(p * Math.PI)) / 2.0;
                const bias = (this.options.easing === 'ease') ? 0.7 : 1.0;
                const s = Math.pow(p, bias);
                p = s * s * (3 - 2 * s);
            }
            (_b = (_a = this.options).transition) === null || _b === void 0 ? void 0 : _b.call(_a, p);
        });
        this.visibilitychange = () => document.hidden === false ? this._start() : this._stop();
        document.addEventListener('visibilitychange', this.visibilitychange);
        this.startid = setTimeout(() => {
            var _a, _b;
            (_b = (_a = this.options).transition) === null || _b === void 0 ? void 0 : _b.call(_a, 0.0);
        }, 0);
        this.start();
    }
    clear() {
        if (this.startid !== null) {
            clearTimeout(this.startid);
            this.startid = null;
        }
        if (this.endid !== null) {
            clearTimeout(this.endid);
            this.endid = null;
        }
        document.removeEventListener('visibilitychange', this.visibilitychange);
        this.ticker.clear();
    }
    elapsed() {
        return this.offset + (this.endid !== null ? (Date.now() - this.time) : 0);
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
        if (this.status === 1 && this.endid === null) {
            this.endid = setTimeout(() => {
                var _a, _b, _c, _d;
                (_b = (_a = this.options).transition) === null || _b === void 0 ? void 0 : _b.call(_a, 1.0);
                (_d = (_c = this.options).timeout) === null || _d === void 0 ? void 0 : _d.call(_c);
                this.endid = null;
                this.time = 0.0;
                this.offset = 0.0;
                this.counter++;
                if (this.options.iterations === 0 || this.counter < this.options.iterations) {
                    this.start();
                }
                else {
                    this.clear();
                }
            }, this.options.duration - this.offset);
            this.time = Date.now();
        }
    }
    _stop() {
        if (this.status === 1 && this.endid !== null) {
            this.offset = this.offset + Date.now() - this.time;
            clearTimeout(this.endid);
            this.endid = null;
            this.time = 0.0;
        }
    }
}

function createBasicEvent(target, type, execute, options) {
    let initalized = false;
    const id = setTimeout(() => {
        initalized = true;
        target.addEventListener(type, execute, options);
    }, 0);
    return () => {
        if (initalized === false) {
            clearTimeout(id);
        }
        else {
            target.removeEventListener(type, execute);
        }
    };
}
class Eventor {
    constructor() {
        this.map = new MapMap();
    }
    add(element, type, listener, options) {
        const props = { element, type, listener, options };
        let finalize;
        if (props.type.indexOf('window.') === 0) {
            if (['window.keydown', 'window.keyup'].includes(props.type)) {
                finalize = this.window_key(props);
            }
            else if (['window.keydown.arrow', 'window.keyup.arrow'].includes(props.type)) {
                finalize = this.window_key_arrow(props);
            }
            else if (['window.keydown.wasd', 'window.keyup.wasd'].includes(props.type)) {
                finalize = this.window_key_wasd(props);
            }
            else {
                finalize = this.window_basic(props);
            }
        }
        else if (props.type.indexOf('document.') === 0) {
            {
                finalize = this.document_basic(props);
            }
        }
        else {
            if (props.type === 'resize') {
                finalize = this.element_resize(props);
            }
            else if (props.type === 'change') {
                finalize = this.element_change(props);
            }
            else if (props.type === 'input') {
                finalize = this.element_input(props);
            }
            else if (props.type === 'wheel') {
                finalize = this.element_wheel(props);
            }
            else if (props.type === 'click') {
                finalize = this.element_click(props);
            }
            else if (props.type === 'click.outside') {
                finalize = this.element_click_outside(props);
            }
            else if (['pointerdown', 'pointermove', 'pointerup', 'pointerover', 'pointerout'].includes(props.type)) {
                finalize = this.element_pointer(props);
            }
            else if (['pointerdown.outside', 'pointermove.outside', 'pointerup.outside'].includes(props.type)) {
                finalize = this.element_pointer_outside(props);
            }
            else if (['mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout'].includes(props.type)) {
                finalize = this.element_mouse(props);
            }
            else if (['touchstart', 'touchmove', 'touchend', 'touchcancel'].includes(props.type)) {
                finalize = this.element_touch(props);
            }
            else if (['dragstart', 'dragmove', 'dragend'].includes(props.type)) {
                finalize = this.element_drag(props);
            }
            else {
                finalize = this.element_basic(props);
            }
        }
        this.map.set(props.type, props.listener, finalize);
    }
    remove(type, listener) {
        const finalize = this.map.get(type, listener);
        if (finalize) {
            finalize();
            this.map.delete(type, listener);
        }
    }
    element_basic(props) {
        return createBasicEvent(props.element, props.type, (event) => {
            props.listener({ event });
        }, props.options);
    }
    element_resize(props) {
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                props.listener({});
                break;
            }
        });
        observer.observe(props.element);
        return () => {
            observer.unobserve(props.element);
        };
    }
    element_change(props) {
        return createBasicEvent(props.element, props.type, (event) => {
            let value = null;
            if (event.target.type === 'checkbox') {
                value = event.target.checked;
            }
            else if (event.target.type === 'range' || event.target.type === 'number') {
                value = parseFloat(event.target.value);
            }
            else {
                value = event.target.value;
            }
            props.listener({ event, value });
        }, props.options);
    }
    element_input(props) {
        return createBasicEvent(props.element, props.type, (event) => {
            let value = null;
            if (event.target.type === 'checkbox') {
                value = event.target.checked;
            }
            else if (event.target.type === 'range' || event.target.type === 'number') {
                value = parseFloat(event.target.value);
            }
            else {
                value = event.target.value;
            }
            props.listener({ event, value });
        }, props.options);
    }
    element_click(props) {
        return createBasicEvent(props.element, props.type, (event) => {
            props.listener({ event, position: pointer(props.element, event).position });
        }, props.options);
    }
    element_click_outside(props) {
        return createBasicEvent(document, props.type.split('.')[0], (event) => {
            if (props.element.contains(event.target) === false) {
                props.listener({ event, position: pointer(props.element, event).position });
            }
        }, props.options);
    }
    element_pointer(props) {
        return createBasicEvent(props.element, props.type, (event) => {
            props.listener({ event, position: pointer(props.element, event).position });
        }, props.options);
    }
    element_mouse(props) {
        return createBasicEvent(props.element, props.type, (event) => {
            props.listener({ event, position: pointer(props.element, event).position });
        }, props.options);
    }
    element_touch(props) {
        return createBasicEvent(props.element, props.type, (event) => {
            props.listener({ event, position: pointer(props.element, event).position });
        }, props.options);
    }
    element_pointer_outside(props) {
        return createBasicEvent(document, props.type.split('.')[0], (event) => {
            if (props.element.contains(event.target) === false) {
                props.listener({ event, position: pointer(props.element, event).position });
            }
        }, props.options);
    }
    element_wheel(props) {
        return createBasicEvent(props.element, props.type, (event) => {
            props.listener({ event, delta: { x: event.wheelDeltaX, y: event.wheelDeltaY } });
        }, props.options);
    }
    element_drag(props) {
        let pointermove = null;
        let pointerup = null;
        let pointercancel = null;
        const pointerdown = createBasicEvent(props.element, 'pointerdown', (event) => {
            const id = event.pointerId;
            const position = pointer(props.element, event).position;
            let previous = position;
            pointermove = createBasicEvent(window, 'pointermove', (event) => {
                if (event.pointerId === id) {
                    const position = pointer(props.element, event).position;
                    const delta = { x: position.x - previous.x, y: position.y - previous.y };
                    if (props.type === 'dragmove') {
                        props.listener({ event, position, delta });
                    }
                    previous = position;
                }
            }, props.options);
            pointerup = createBasicEvent(window, 'pointerup', (event) => {
                if (event.pointerId === id) {
                    const position = pointer(props.element, event).position;
                    if (props.type === 'dragend') {
                        props.listener({ event, position, delta: { x: 0, y: 0 } });
                    }
                    remove();
                }
            }, props.options);
            pointercancel = createBasicEvent(window, 'pointercancel', (event) => {
                if (event.pointerId === id) {
                    const position = pointer(props.element, event).position;
                    if (props.type === 'dragend') {
                        props.listener({ event, position, delta: { x: 0, y: 0 } });
                    }
                    remove();
                }
            }, props.options);
            if (props.type === 'dragstart') {
                props.listener({ event, position, delta: { x: 0, y: 0 } });
            }
        }, props.options);
        function remove() {
            pointermove === null || pointermove === void 0 ? void 0 : pointermove();
            pointermove = null;
            pointerup === null || pointerup === void 0 ? void 0 : pointerup();
            pointerup = null;
            pointercancel === null || pointercancel === void 0 ? void 0 : pointercancel();
            pointercancel = null;
        }
        return () => {
            pointerdown();
            remove();
        };
    }
    window_basic(props) {
        const type = props.type.substring('window.'.length);
        return createBasicEvent(window, type, (event) => {
            props.listener({ event });
        }, props.options);
    }
    window_key(props) {
        const type = props.type.substring(props.type.indexOf('.') + 1);
        return createBasicEvent(window, type, (event) => {
            if (event.repeat)
                return;
            props.listener({ event, code: event.code });
        }, props.options);
    }
    window_key_arrow(props) {
        const keymap = {};
        const keydown = createBasicEvent(window, 'keydown', (event) => {
            if (event.repeat)
                return;
            keymap[event.code] = 1;
            if (props.type === 'window.keydown.arrow' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
                const vector = {
                    x: (keymap['ArrowLeft'] ? -1 : 0) + (keymap['ArrowRight'] ? +1 : 0),
                    y: (keymap['ArrowUp'] ? -1 : 0) + (keymap['ArrowDown'] ? +1 : 0)
                };
                props.listener({ event, code: event.code, vector });
            }
        }, props.options);
        const keyup = createBasicEvent(window, 'keyup', (event) => {
            keymap[event.code] = 0;
            if (props.type === 'window.keyup.arrow' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
                const vector = {
                    x: (keymap['ArrowLeft'] ? -1 : 0) + (keymap['ArrowRight'] ? +1 : 0),
                    y: (keymap['ArrowUp'] ? -1 : 0) + (keymap['ArrowDown'] ? +1 : 0)
                };
                props.listener({ event, code: event.code, vector });
            }
        }, props.options);
        return () => {
            keydown();
            keyup();
        };
    }
    window_key_wasd(props) {
        const keymap = {};
        const finalize1 = createBasicEvent(window, 'keydown', (event) => {
            if (event.repeat)
                return;
            keymap[event.code] = 1;
            if (props.type === 'window.keydown.wasd' && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
                const vector = {
                    x: (keymap['KeyA'] ? -1 : 0) + (keymap['KeyD'] ? +1 : 0),
                    y: (keymap['KeyW'] ? -1 : 0) + (keymap['KeyS'] ? +1 : 0)
                };
                props.listener({ event, code: event.code, vector });
            }
        }, props.options);
        const finalize2 = createBasicEvent(window, 'keyup', (event) => {
            keymap[event.code] = 0;
            if (props.type === 'window.keyup.wasd' && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
                const vector = {
                    x: (keymap['KeyA'] ? -1 : 0) + (keymap['KeyD'] ? +1 : 0),
                    y: (keymap['KeyW'] ? -1 : 0) + (keymap['KeyS'] ? +1 : 0)
                };
                props.listener({ event, code: event.code, vector });
            }
        }, props.options);
        return () => {
            finalize1();
            finalize2();
        };
    }
    document_basic(props) {
        const type = props.type.substring('document.'.length);
        return createBasicEvent(document, type, (event) => {
            props.listener({ event });
        }, props.options);
    }
}
function pointer(element, event) {
    const rect = element.getBoundingClientRect();
    const position = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    return { position };
}

//----------------------------------------------------------------------------------------------------
// utils
//----------------------------------------------------------------------------------------------------
const SYSTEM_EVENTS = ['start', 'update', 'render', 'stop', 'finalize'];
class UnitPromise {
    constructor(promise, component) {
        this.promise = promise;
        this.component = component;
    }
    then(callback) {
        const snapshot = Unit.snapshot(Unit.currentUnit);
        this.promise = this.promise.then((...args) => Unit.scope(snapshot, callback, ...args));
        return this;
    }
    catch(callback) {
        const snapshot = Unit.snapshot(Unit.currentUnit);
        this.promise = this.promise.catch((...args) => Unit.scope(snapshot, callback, ...args));
        return this;
    }
    finally(callback) {
        const snapshot = Unit.snapshot(Unit.currentUnit);
        this.promise = this.promise.finally(() => Unit.scope(snapshot, callback));
        return this;
    }
}
class UnitTimer {
    constructor(options) {
        this.stack = [];
        this.unit = new Unit(Unit.currentUnit, null, UnitTimer.Component, { options, snapshot: Unit.snapshot(Unit.currentUnit) });
    }
    clear() {
        this.stack = [];
        this.unit.finalize();
    }
    timeout(timeout, duration = 0) {
        UnitTimer.execute(this, { timeout, duration, iterations: 1 });
        return this;
    }
    iteration(timeout, duration = 0, iterations = -1) {
        UnitTimer.execute(this, { timeout, duration, iterations });
        return this;
    }
    transition(transition, duration = 0, easing) {
        UnitTimer.execute(this, { transition, duration, iterations: 1, easing });
        return this;
    }
    static execute(timer, options) {
        if (timer.unit._.state === 'finalized') {
            timer.unit = new Unit(Unit.currentUnit, null, UnitTimer.Component, { options, snapshot: Unit.snapshot(Unit.currentUnit) });
        }
        else if (timer.stack.length === 0) {
            timer.stack.push({ options, snapshot: Unit.snapshot(Unit.currentUnit) });
            timer.unit.on('finalize', () => UnitTimer.next(timer));
        }
        else {
            timer.stack.push({ options, snapshot: Unit.snapshot(Unit.currentUnit) });
        }
    }
    static next(timer) {
        if (timer.stack.length > 0) {
            timer.unit = new Unit(Unit.currentUnit, null, UnitTimer.Component, timer.stack.shift());
            timer.unit.on('finalize', () => UnitTimer.next(timer));
        }
    }
    static Component(unit, { options, snapshot }) {
        let counter = 0;
        const timer = new Timer({
            transition: (p) => {
                if (options.transition)
                    Unit.scope(snapshot, options.transition, p);
            },
            timeout: () => {
                if (options.transition)
                    Unit.scope(snapshot, options.transition, 1.0);
                if (options.timeout)
                    Unit.scope(snapshot, options.timeout);
                if (options.iterations && counter >= options.iterations - 1) {
                    unit.finalize();
                }
                counter++;
            }, duration: options.duration, iterations: options.iterations, easing: options.easing
        });
        unit.on('finalize', () => timer.clear());
    }
}
//----------------------------------------------------------------------------------------------------
// unit
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
        else if (component !== undefined) {
            baseComponent = (unit) => { unit.element.textContent = component.toString(); };
        }
        else {
            baseComponent = (unit) => { };
        }
        const baseContext = (_a = parent === null || parent === void 0 ? void 0 : parent._.currentContext) !== null && _a !== void 0 ? _a : { stack: null };
        this._ = { parent, target, baseElement, baseContext, baseComponent, props: props !== null && props !== void 0 ? props : {} };
        parent === null || parent === void 0 ? void 0 : parent._.children.push(this);
        Unit.initialize(this, null);
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
        if (this._.parent) {
            this._.parent._.children = this._.parent._.children.filter((unit) => unit !== this);
        }
    }
    reboot() {
        let anchor = null;
        if (this._.nestElements[0] && this._.nestElements[0].owned === true) {
            anchor = this._.nestElements[0].element.nextElementSibling;
        }
        Unit.stop(this);
        Unit.finalize(this);
        Unit.initialize(this, anchor);
    }
    static initialize(unit, anchor) {
        const backup = Unit.currentUnit;
        Unit.currentUnit = unit;
        unit._ = Object.assign(unit._, {
            currentElement: unit._.baseElement,
            currentContext: unit._.baseContext,
            currentComponent: null,
            anchor,
            state: 'invoked',
            tostart: true,
            protected: false,
            ancestors: unit._.parent ? [unit._.parent, ...unit._.parent._.ancestors] : [],
            children: [],
            nestElements: [],
            promises: [],
            components: [],
            listeners: new MapMap(),
            defines: {},
            systems: { start: [], update: [], render: [], stop: [], finalize: [] },
            eventor: new Eventor(),
        });
        // nest html element
        if (typeof unit._.target === 'string') {
            Unit.nest(unit, unit._.target);
        }
        // setup component
        Unit.extend(unit, unit._.baseComponent, unit._.props);
        // whether the unit promise was resolved
        Promise.all(unit._.promises.map(p => p.promise)).then(() => unit._.state = 'initialized');
        Unit.currentUnit = backup;
    }
    static finalize(unit) {
        if (unit._.state !== 'finalized' && unit._.state !== 'finalizing') {
            unit._.state = 'finalizing';
            [...unit._.children].reverse().forEach((child) => child.finalize());
            [...unit._.systems.finalize].reverse().forEach(({ execute }) => execute());
            unit.off();
            unit._.components.forEach((component) => Unit.component2units.delete(component, unit));
            for (const { element, owned } of unit._.nestElements.reverse()) {
                if (owned === true) {
                    element.remove();
                }
            }
            unit._.currentElement = unit._.baseElement;
            // reset defines
            Object.keys(unit._.defines).forEach((key) => {
                delete unit[key];
            });
            unit._.defines = {};
            unit._.state = 'finalized';
        }
    }
    static nest(unit, target, textContent) {
        if (target instanceof HTMLElement || target instanceof SVGElement) {
            unit._.nestElements.push({ element: target, owned: false });
            unit._.currentElement = target;
            return target;
        }
        else {
            const match = target.match(/<((\w+)[^>]*?)\/?>/);
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
                if (textContent !== undefined) {
                    element.textContent = textContent.toString();
                }
                unit._.nestElements.push({ element, owned: true });
                return element;
            }
            else {
                throw new Error(`xnew.nest: invalid html string [${target}]`);
            }
        }
    }
    static extend(unit, component, props) {
        var _a;
        if (unit._.components.includes(component) === true) {
            throw new Error(`The component is already extended.`);
        }
        else {
            const backupComponent = unit._.currentComponent;
            unit._.currentComponent = component;
            const defines = (_a = component(unit, props)) !== null && _a !== void 0 ? _a : {};
            unit._.currentComponent = backupComponent;
            Unit.component2units.add(component, unit);
            unit._.components.push(component);
            Object.keys(defines).forEach((key) => {
                if (unit[key] !== undefined && unit._.defines[key] === undefined) {
                    throw new Error(`The property "${key}" already exists.`);
                }
                const descriptor = Object.getOwnPropertyDescriptor(defines, key);
                const wrapper = { configurable: true, enumerable: true };
                const snapshot = Unit.snapshot(unit);
                if ((descriptor === null || descriptor === void 0 ? void 0 : descriptor.get) || (descriptor === null || descriptor === void 0 ? void 0 : descriptor.set)) {
                    if (descriptor === null || descriptor === void 0 ? void 0 : descriptor.get)
                        wrapper.get = (...args) => Unit.scope(snapshot, descriptor.get, ...args);
                    if (descriptor === null || descriptor === void 0 ? void 0 : descriptor.set)
                        wrapper.set = (...args) => Unit.scope(snapshot, descriptor.set, ...args);
                }
                else if (typeof (descriptor === null || descriptor === void 0 ? void 0 : descriptor.value) === 'function') {
                    wrapper.value = (...args) => Unit.scope(snapshot, descriptor.value, ...args);
                }
                else {
                    throw new Error(`Only function properties can be defined as component defines. [${key}]`);
                }
                Object.defineProperty(unit._.defines, key, wrapper);
                Object.defineProperty(unit, key, wrapper);
            });
            return defines;
        }
    }
    static start(unit) {
        if (unit._.tostart === false)
            return;
        if (unit._.state === 'initialized' || unit._.state === 'stopped') {
            unit._.state = 'started';
            unit._.children.forEach((child) => Unit.start(child));
            unit._.systems.start.forEach(({ execute }) => execute());
        }
        else if (unit._.state === 'started') {
            unit._.children.forEach((child) => Unit.start(child));
        }
    }
    static stop(unit) {
        if (unit._.state === 'started') {
            unit._.state = 'stopped';
            unit._.children.forEach((child) => Unit.stop(child));
            unit._.systems.stop.forEach(({ execute }) => execute());
        }
    }
    static update(unit) {
        if (unit._.state === 'started') {
            unit._.children.forEach((child) => Unit.update(child));
            unit._.systems.update.forEach(({ execute }) => execute());
        }
    }
    static render(unit) {
        if (unit._.state === 'started' || unit._.state === 'started' || unit._.state === 'stopped') {
            unit._.children.forEach((child) => Unit.render(child));
            unit._.systems.render.forEach(({ execute }) => execute());
        }
    }
    static reset() {
        var _a;
        (_a = Unit.rootUnit) === null || _a === void 0 ? void 0 : _a.finalize();
        Unit.currentUnit = Unit.rootUnit = new Unit(null, null);
        const ticker = new AnimationTicker(() => {
            Unit.start(Unit.rootUnit);
            Unit.update(Unit.rootUnit);
            Unit.render(Unit.rootUnit);
        });
        Unit.rootUnit.on('finalize', () => ticker.clear());
    }
    static scope(snapshot, func, ...args) {
        if (snapshot.unit._.state === 'finalized') {
            return;
        }
        const currentUnit = Unit.currentUnit;
        const backup = Unit.snapshot(snapshot.unit);
        try {
            Unit.currentUnit = snapshot.unit;
            snapshot.unit._.currentContext = snapshot.context;
            snapshot.unit._.currentElement = snapshot.element;
            snapshot.unit._.currentComponent = snapshot.component;
            return func(...args);
        }
        catch (error) {
            throw error;
        }
        finally {
            Unit.currentUnit = currentUnit;
            snapshot.unit._.currentContext = backup.context;
            snapshot.unit._.currentElement = backup.element;
            snapshot.unit._.currentComponent = backup.component;
        }
    }
    static snapshot(unit) {
        return { unit, context: unit._.currentContext, element: unit._.currentElement, component: unit._.currentComponent };
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
        const types = type.trim().split(/\s+/);
        types.forEach((type) => Unit.on(this, type, listener, options));
    }
    off(type, listener) {
        const types = typeof type === 'string' ? type.trim().split(/\s+/) : [...this._.listeners.keys()];
        types.forEach((type) => Unit.off(this, type, listener));
    }
    static on(unit, type, listener, options) {
        const snapshot = Unit.snapshot(Unit.currentUnit);
        const execute = (props) => {
            Unit.scope(snapshot, listener, Object.assign({ type }, props));
        };
        if (SYSTEM_EVENTS.includes(type)) {
            unit._.systems[type].push({ listener, execute });
        }
        if (unit._.listeners.has(type, listener) === false) {
            unit._.listeners.set(type, listener, { element: unit.element, component: unit._.currentComponent, execute });
            Unit.type2units.add(type, unit);
            if (/^[A-Za-z]/.test(type)) {
                unit._.eventor.add(unit.element, type, execute, options);
            }
        }
    }
    static off(unit, type, listener) {
        if (SYSTEM_EVENTS.includes(type)) {
            unit._.systems[type] = unit._.systems[type].filter(({ listener: lis }) => listener ? lis !== listener : false);
        }
        (listener ? [listener] : [...unit._.listeners.keys(type)]).forEach((listener) => {
            const item = unit._.listeners.get(type, listener);
            if (item === undefined)
                return;
            unit._.listeners.delete(type, listener);
            if (/^[A-Za-z]/.test(type)) {
                unit._.eventor.remove(type, item.execute);
            }
        });
        if (unit._.listeners.has(type) === false) {
            Unit.type2units.delete(type, unit);
        }
    }
    static emit(type, props = {}) {
        var _a, _b;
        const current = Unit.currentUnit;
        if (type[0] === '+') {
            (_a = Unit.type2units.get(type)) === null || _a === void 0 ? void 0 : _a.forEach((unit) => {
                var _a;
                const find = [unit, ...unit._.ancestors].find(u => u._.protected === true);
                if (find === undefined || current._.ancestors.includes(find) === true || current === find) {
                    (_a = unit._.listeners.get(type)) === null || _a === void 0 ? void 0 : _a.forEach((item) => item.execute(props));
                }
            });
        }
        else if (type[0] === '-') {
            (_b = current._.listeners.get(type)) === null || _b === void 0 ? void 0 : _b.forEach((item) => item.execute(props));
        }
    }
}
Unit.currentComponent = () => { };
Unit.component2units = new MapSet();
//----------------------------------------------------------------------------------------------------
// event
//----------------------------------------------------------------------------------------------------
Unit.type2units = new MapSet();

const xnew$1 = Object.assign(function (...args) {
    if (Unit.rootUnit === undefined)
        Unit.reset();
    let target;
    if (args[0] instanceof HTMLElement || args[0] instanceof SVGElement) {
        target = args.shift(); // an existing html element
    }
    else if (typeof args[0] === 'string' && args[0].match(/<((\w+)[^>]*?)\/?>/)) {
        target = args.shift();
    }
    else {
        target = null;
    }
    const component = args.shift();
    const props = args.shift();
    const unit = new Unit(Unit.currentUnit, target, component, props);
    if (typeof component === 'function') {
        Unit.context(Unit.currentUnit, component, unit);
    }
    return unit;
}, {
    /**
     * Creates a nested HTML/SVG element within the current component
     * @param target - HTML or SVG tag string (e.g., '<div class="my-class">', '<span style="color:red">', '<svg viewBox="0 0 24 24">')
     * @returns The created HTML/SVG element
     * @throws Error if called after component initialization
     * @example
     * const div = xnew.nest('<div>')
     * div.textContent = 'Hello'
     */
    nest(target) {
        try {
            if (Unit.currentUnit._.state !== 'invoked') {
                throw new Error('xnew.nest can not be called after initialized.');
            }
            return Unit.nest(Unit.currentUnit, target);
        }
        catch (error) {
            console.error('xnew.nest(target: HTMLElement | SVGElement | string): ', error);
            throw error;
        }
    },
    /**
     * Extends the current component with another component's functionality
     * @param component - Component function to extend with
     * @param props - Optional properties to pass to the extended component
     * @returns defines returned by the extended component
     * @throws Error if called after component initialization
     * @example
     * const api = xnew.extend(BaseComponent, { data: {} })
     */
    extend(component, props) {
        try {
            if (Unit.currentUnit._.state !== 'invoked') {
                throw new Error('xnew.extend can not be called after initialized.');
            }
            const defines = Unit.extend(Unit.currentUnit, component, props);
            if (typeof component === 'function') {
                return Unit.context(Unit.currentUnit, component, Unit.currentUnit);
            }
            return defines;
        }
        catch (error) {
            console.error('xnew.extend(component: Function, props?: Object): ', error);
            throw error;
        }
    },
    /**
     * Gets a context value that can be accessed in follow context
     * @param component - component function
     * @returns The context value
     * @example
     * // Create unit
     * const a = xnew(A);
     * ------------------------------
     *
     * // Get context in child
     * const a = xnew.context(A)
     */
    context(component) {
        try {
            return Unit.context(Unit.currentUnit, component);
        }
        catch (error) {
            console.error('xnew.context(component: Function): ', error);
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
            const component = Unit.currentUnit._.currentComponent;
            Unit.currentUnit._.promises.push(new UnitPromise(promise, component));
            return Unit.currentUnit._.promises[Unit.currentUnit._.promises.length - 1];
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
            const component = Unit.currentUnit._.currentComponent;
            const promises = Unit.currentUnit._.promises;
            return new UnitPromise(Promise.all(promises.map(p => p.promise)), null)
                .then((results) => {
                callback(results.filter((_result, index) => promises[index].component !== null && promises[index].component === component));
            });
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
            const promises = Unit.currentUnit._.promises;
            return new UnitPromise(Promise.all(promises.map(p => p.promise)), null)
                .catch(callback);
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
            const promises = Unit.currentUnit._.promises;
            return new UnitPromise(Promise.all(promises.map(p => p.promise)), null)
                .finally(callback);
        }
        catch (error) {
            console.error('xnew.finally(callback: Function): ', error);
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
        const snapshot = Unit.snapshot(Unit.currentUnit);
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
        try {
            return Unit.find(component);
        }
        catch (error) {
            console.error('xnew.find(component: Function): ', error);
            throw error;
        }
    },
    /**
     * Emits a custom event to components
     * @param type - Event type to emit (prefix with '+' for global events, '-' for local events)
     * @param args - Additional arguments to pass to event listeners
     * @returns void
     * @example
     * xnew.emit('+globalevent', { data: 123 }); // Global event
     * xnew.emit('-localevent', { data: 123 }); // Local event
     */
    emit(type, ...args) {
        try {
            return Unit.emit(type, ...args);
        }
        catch (error) {
            console.error('xnew.emit(type: string, ...args: any[]): ', error);
            throw error;
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
        return new UnitTimer({ timeout, duration, iterations: 1 });
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
    interval(timeout, duration, iterations = 0) {
        return new UnitTimer({ timeout, duration, iterations });
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
        return new UnitTimer({ transition, duration, easing, iterations: 1 });
    },
    /**
     * Call this method within a component function to enable protection.
     * Protected components will not respond to global events emitted via xnew.emit,
     * and will be excluded from xnew.find searches.
     * @example
     * function MyComponent(unit) {
     *   xnew.protect();
     *   // Component logic here
     * }
     */
    protect() {
        Unit.currentUnit._.protected = true;
    },
});

function OpenAndClose(unit, { open = false }) {
    let state = open ? 1.0 : 0.0;
    let sign = open ? +1 : -1;
    let timer = xnew$1.timeout(() => xnew$1.emit('-transition', { state }));
    return {
        toggle(duration = 200, easing = 'ease') {
            sign < 0 ? unit.open(duration, easing) : unit.close(duration, easing);
        },
        open(duration = 200, easing = 'ease') {
            sign = +1;
            const d = 1 - state;
            timer === null || timer === void 0 ? void 0 : timer.clear();
            timer = xnew$1.transition((x) => {
                state = 1.0 - (x < 1.0 ? (1 - x) * d : 0.0);
                xnew$1.emit('-transition', { state });
            }, duration * d, easing)
                .timeout(() => xnew$1.emit('-opened', { state }));
        },
        close(duration = 200, easing = 'ease') {
            sign = -1;
            const d = state;
            timer === null || timer === void 0 ? void 0 : timer.clear();
            timer = xnew$1.transition((x) => {
                state = x < 1.0 ? (1 - x) * d : 0.0;
                xnew$1.emit('-transition', { state });
            }, duration * d, easing)
                .timeout(() => xnew$1.emit('-closed', { state }));
        },
    };
}
function Accordion(unit) {
    const system = xnew$1.context(OpenAndClose);
    const outer = xnew$1.nest('<div style="overflow: hidden;">');
    const inner = xnew$1.nest('<div style="display: flex; flex-direction: column; box-sizing: border-box;">');
    system.on('-transition', ({ state }) => {
        outer.style.height = state < 1.0 ? inner.offsetHeight * state + 'px' : 'auto';
        outer.style.opacity = state.toString();
    });
}
function Popup(unit) {
    const system = xnew$1.context(OpenAndClose);
    system.on('-closed', () => unit.finalize());
    xnew$1.nest('<div style="position: absolute; inset: 0; z-index: 1000; opacity: 0;">');
    system.on('-transition', ({ state }) => {
        unit.element.style.opacity = state.toString();
    });
}

function Screen(unit, { aspect, fit = 'contain' } = {}) {
    xnew$1.nest('<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; container-type: size; overflow: hidden;">');
    xnew$1.nest(`<div style="position: relative; aspect-ratio: ${aspect}; container-type: size; overflow: hidden;">`);
    if (fit === 'contain') {
        unit.element.style.width = `min(100cqw, calc(100cqh * ${aspect}))`;
    }
    else {
        unit.element.style.flexShrink = '0';
        unit.element.style.width = `max(100cqw, calc(100cqh * ${aspect}))`;
    }
}

//----------------------------------------------------------------------------------------------------
// controller
//----------------------------------------------------------------------------------------------------
function SVGTemplate(self, { stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 1, strokeLinejoin = 'round', fill = null, fillOpacity = 0.8 }) {
    xnew$1.nest(`<svg
        viewBox="0 0 64 64"
        style="position: absolute; width: 100%; height: 100%; select: none;
        stroke: ${stroke}; stroke-opacity: ${strokeOpacity}; stroke-width: ${strokeWidth}; stroke-linejoin: ${strokeLinejoin};
        ${fill ? `fill: ${fill}; fill-opacity: ${fillOpacity};` : ''}
    ">`);
}
function AnalogStick(unit, { stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 1, strokeLinejoin = 'round', fill = '#FFF', fillOpacity = 0.8 } = {}) {
    xnew$1.nest(`<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; container-type: size;">`);
    xnew$1.nest(`<div style="width: min(100cqw, 100cqh); aspect-ratio: 1; cursor: pointer; pointer-select: none; pointer-events: auto; overflow: hidden;">`);
    xnew$1((unit) => {
        xnew$1.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
        xnew$1('<polygon points="32  7 27 13 37 13">');
        xnew$1('<polygon points="32 57 27 51 37 51">');
        xnew$1('<polygon points=" 7 32 13 27 13 37">');
        xnew$1('<polygon points="57 32 51 27 51 37">');
    });
    const target = xnew$1((unit) => {
        xnew$1.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
        xnew$1('<circle cx="32" cy="32" r="14">');
    });
    unit.on('dragstart dragmove', ({ type, position }) => {
        const size = unit.element.clientWidth;
        const x = position.x - size / 2;
        const y = position.y - size / 2;
        const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (size / 4));
        const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
        const vector = { x: Math.cos(a) * d, y: Math.sin(a) * d };
        target.element.style.filter = 'brightness(80%)';
        target.element.style.left = `${vector.x * size / 4}px`;
        target.element.style.top = `${vector.y * size / 4}px`;
        const nexttype = { dragstart: '-down', dragmove: '-move' }[type];
        xnew$1.emit(nexttype, { vector });
    });
    unit.on('dragend', () => {
        const size = unit.element.clientWidth;
        const vector = { x: 0, y: 0 };
        target.element.style.filter = '';
        target.element.style.left = `${vector.x * size / 4}px`;
        target.element.style.top = `${vector.y * size / 4}px`;
        xnew$1.emit('-up', { vector });
    });
}
function DPad(unit, { diagonal = true, stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 1, strokeLinejoin = 'round', fill = '#FFF', fillOpacity = 0.8 } = {}) {
    xnew$1.nest(`<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; container-type: size;">`);
    xnew$1.nest(`<div style="width: min(100cqw, 100cqh); aspect-ratio: 1; cursor: pointer; pointer-select: none; pointer-events: auto; overflow: hidden;">`);
    const polygons = [
        '<polygon points="32 32 23 23 23  4 24  3 40  3 41  4 41 23">',
        '<polygon points="32 32 23 41 23 60 24 61 40 61 41 60 41 41">',
        '<polygon points="32 32 23 23  4 23  3 24  3 40  4 41 23 41">',
        '<polygon points="32 32 41 23 60 23 61 24 61 40 60 41 41 41">'
    ];
    const targets = polygons.map((polygon) => {
        return xnew$1((unit) => {
            xnew$1.extend(SVGTemplate, { stroke: 'none', fill, fillOpacity });
            xnew$1(polygon);
        });
    });
    xnew$1((unit) => {
        xnew$1.extend(SVGTemplate, { fill: 'none', stroke, strokeOpacity, strokeWidth, strokeLinejoin });
        xnew$1('<polyline points="23 23 23  4 24  3 40  3 41  4 41 23">');
        xnew$1('<polyline points="23 41 23 60 24 61 40 61 41 60 41 41">');
        xnew$1('<polyline points="23 23  4 23  3 24  3 40  4 41 23 41">');
        xnew$1('<polyline points="41 23 60 23 61 24 61 40 60 41 41 41">');
        xnew$1('<polygon points="32  7 27 13 37 13">');
        xnew$1('<polygon points="32 57 27 51 37 51">');
        xnew$1('<polygon points=" 7 32 13 27 13 37">');
        xnew$1('<polygon points="57 32 51 27 51 37">');
    });
    unit.on('dragstart dragmove', ({ type, position }) => {
        const size = unit.element.clientWidth;
        const x = position.x - size / 2;
        const y = position.y - size / 2;
        const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
        const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (size / 4));
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
        targets[0].element.style.filter = (vector.y < 0) ? 'brightness(80%)' : '';
        targets[1].element.style.filter = (vector.y > 0) ? 'brightness(80%)' : '';
        targets[2].element.style.filter = (vector.x < 0) ? 'brightness(80%)' : '';
        targets[3].element.style.filter = (vector.x > 0) ? 'brightness(80%)' : '';
        const nexttype = { dragstart: '-down', dragmove: '-move' }[type];
        xnew$1.emit(nexttype, { vector });
    });
    unit.on('dragend', () => {
        const vector = { x: 0, y: 0 };
        targets[0].element.style.filter = '';
        targets[1].element.style.filter = '';
        targets[2].element.style.filter = '';
        targets[3].element.style.filter = '';
        xnew$1.emit('-up', { vector });
    });
}

const currentColorA = 'color-mix(in srgb, currentColor 70%, transparent)';
const currentColorB = 'color-mix(in srgb, currentColor 10%, transparent)';
function Panel(unit, { name, open = false, params }) {
    const object = params !== null && params !== void 0 ? params : {};
    xnew$1.extend(Group, { name, open });
    return {
        group({ name, open, params }, inner) {
            const group = xnew$1((unit) => {
                xnew$1.extend(Panel, { name, open, params: params !== null && params !== void 0 ? params : object });
                inner(unit);
            });
            return group;
        },
        button(key) {
            const button = xnew$1(Button, { key });
            return button;
        },
        select(key, { options = [] } = {}) {
            var _a, _b;
            object[key] = (_b = (_a = object[key]) !== null && _a !== void 0 ? _a : options[0]) !== null && _b !== void 0 ? _b : '';
            const select = xnew$1(Select, { key, value: object[key], options });
            select.on('input', ({ value }) => object[key] = value);
            return select;
        },
        range(key, options = {}) {
            var _a, _b;
            object[key] = (_b = (_a = object[key]) !== null && _a !== void 0 ? _a : options.min) !== null && _b !== void 0 ? _b : 0;
            const number = xnew$1(Range, Object.assign({ key, value: object[key] }, options));
            number.on('input', ({ value }) => object[key] = value);
            return number;
        },
        checkbox(key) {
            var _a;
            object[key] = (_a = object[key]) !== null && _a !== void 0 ? _a : false;
            const checkbox = xnew$1(Checkbox, { key, value: object[key] });
            checkbox.on('input', ({ value }) => object[key] = value);
            return checkbox;
        },
        separator() {
            xnew$1(Separator);
        }
    };
}
function Group(group, { name, open = false }) {
    xnew$1.extend(OpenAndClose, { open });
    if (name) {
        xnew$1('<div style="height: 2rem; margin: 0.125rem 0; display: flex; align-items: center; cursor: pointer; user-select: none;">', (unit) => {
            unit.on('click', () => group.toggle());
            xnew$1('<svg viewBox="0 0 12 12" style="width: 1rem; height: 1rem; margin-right: 0.25rem;" fill="none" stroke="currentColor">', (unit) => {
                xnew$1('<path d="M6 2 10 6 6 10" />');
                group.on('-transition', ({ state }) => unit.element.style.transform = `rotate(${state * 90}deg)`);
            });
            xnew$1('<div>', name);
        });
    }
    xnew$1.extend(Accordion);
}
function Button(unit, { key = '' }) {
    xnew$1.nest('<button style="margin: 0.125rem 0; height: 2rem; border: 1px solid; border-radius: 0.25rem; cursor: pointer;">');
    unit.element.textContent = key;
    unit.on('pointerover', () => {
        unit.element.style.background = currentColorB;
        unit.element.style.borderColor = currentColorA;
    });
    unit.on('pointerout', () => {
        unit.element.style.background = '';
        unit.element.style.borderColor = '';
    });
    unit.on('pointerdown', () => {
        unit.element.style.filter = 'brightness(0.5)';
    });
    unit.on('pointerup', () => {
        unit.element.style.filter = '';
    });
}
function Separator(unit) {
    xnew$1.nest(`<div style="margin: 0.5rem 0; border-top: 1px solid ${currentColorA};">`);
}
function Range(unit, { key = '', value, min = 0, max = 100, step = 1 }) {
    value = value !== null && value !== void 0 ? value : min;
    xnew$1.nest(`<div style="position: relative; height: 2rem; margin: 0.125rem 0; cursor: pointer; user-select: none;">`);
    // fill bar
    const ratio = (value - min) / (max - min);
    const fill = xnew$1(`<div style="position: absolute; top: 0; left: 0; bottom: 0; width: ${ratio * 100}%; background: ${currentColorB}; border: 1px solid ${currentColorA}; border-radius: 0.25rem; transition: width 0.05s;">`);
    // overlay labels
    const status = xnew$1('<div style="position: absolute; inset: 0; padding: 0 0.5rem; display: flex; justify-content: space-between; align-items: center; pointer-events: none;">', (unit) => {
        xnew$1('<div>', key);
        xnew$1('<div key="status">', value);
    });
    // hidden native input for interaction
    xnew$1.nest(`<input type="range" name="${key}" min="${min}" max="${max}" step="${step}" value="${value}" style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; margin: 0;">`);
    unit.on('input', ({ event }) => {
        const v = Number(event.target.value);
        const r = (v - min) / (max - min);
        fill.element.style.width = `${r * 100}%`;
        status.element.querySelector('[key="status"]').textContent = String(v);
    });
}
function Checkbox(unit, { key = '', value } = {}) {
    xnew$1.nest(`<div style="position: relative; height: 2rem; margin: 0.125rem 0; padding: 0 0.5rem; display: flex; align-items: center; cursor: pointer; user-select: none;">`);
    xnew$1('<div style="flex: 1;">', key);
    const box = xnew$1(`<div style="width: 1.25rem; height: 1.25rem; border: 1px solid ${currentColorA}; border-radius: 0.25rem; display: flex; align-items: center; justify-content: center; transition: background 0.1s;">`, () => {
        xnew$1(`<svg viewBox="0 0 12 12" style="width: 1.25rem; height: 1.25rem; opacity: 0; transition: opacity 0.1s;" fill="none" stroke="${currentColorA}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`, () => {
            xnew$1('<path d="M2 6 5 9 10 3" />');
        });
    });
    const check = box.element.querySelector('svg');
    const update = (checked) => {
        box.element.style.background = checked ? currentColorB : '';
        check.style.opacity = checked ? '1' : '0';
    };
    update(!!value);
    xnew$1.nest(`<input type="checkbox" name="${key}" ${value ? 'checked' : ''} style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; margin: 0;">`);
    unit.on('input', ({ event, value }) => {
        update(value);
    });
}
function Select(_, { key = '', value, options = [] } = {}) {
    var _a;
    const initial = (_a = value !== null && value !== void 0 ? value : options[0]) !== null && _a !== void 0 ? _a : '';
    xnew$1.nest(`<div style="position: relative; height: 2rem; margin: 0.125rem 0; padding: 0 0.5rem; display: flex; align-items: center;">`);
    xnew$1('<div style="flex: 1;">', key);
    const native = xnew$1(`<select name="${key}" style="display: none;">`, () => {
        for (const option of options) {
            xnew$1(`<option value="${option}" ${option === initial ? 'selected' : ''}>`, option);
        }
    });
    const button = xnew$1(`<div style="height: 2rem; padding: 0 1.5rem 0 0.5rem; display: flex; align-items: center; border: 1px solid ${currentColorA}; border-radius: 0.25rem; cursor: pointer; user-select: none; min-width: 3rem; white-space: nowrap;">`, initial);
    xnew$1(`<svg viewBox="0 0 12 12" style="position: absolute; right: 1.0rem; width: 0.75rem; height: 0.75rem; pointer-events: none;" fill="none" stroke="${currentColorA}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`, () => {
        xnew$1('<path d="M2 4 6 8 10 4" />');
    });
    button.on('click', () => {
        xnew$1(document.body, (list) => {
            xnew$1.nest(`<div style="position: absolute; border: 1px solid ${currentColorA}; border-radius: 0.25rem; overflow: hidden; z-index: 1000; transform: translateX(-100%);">`);
            const rect = button.element.getBoundingClientRect();
            list.element.style.left = (rect.right + window.scrollX) + 'px';
            list.element.style.top = (rect.bottom + window.scrollY) + 'px';
            list.element.style.minWidth = rect.width + 'px';
            list.element.style.background = getEffectiveBg(button.element);
            for (const option of options) {
                const item = xnew$1(`<div style="height: 2rem; padding: 0 0.5rem; display: flex; align-items: center; cursor: pointer; user-select: none;">`, option);
                item.on('pointerover', () => item.element.style.background = currentColorB);
                item.on('pointerout', () => item.element.style.background = '');
                item.on('click', () => {
                    button.element.textContent = option;
                    native.element.value = option;
                    native.element.dispatchEvent(new Event('input', { bubbles: false }));
                    list.finalize();
                });
            }
            list.on('click.outside', () => {
                list.finalize();
            });
        });
    });
    xnew$1.nest(native.element);
    function getEffectiveBg(el) {
        let current = el.parentElement;
        while (current) {
            const bg = getComputedStyle(current).backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent')
                return bg;
            current = current.parentElement;
        }
        return 'Canvas';
    }
}

const context = new window.AudioContext();
const master = context.createGain();
//----------------------------------------------------------------------------------------------------
// master volume
//----------------------------------------------------------------------------------------------------
master.gain.value = 0.1;
master.connect(context.destination);
//----------------------------------------------------------------------------------------------------
// audio file
//----------------------------------------------------------------------------------------------------
class AudioFile {
    constructor(path) {
        this.promise = fetch(path)
            .then((response) => response.arrayBuffer())
            .then((response) => context.decodeAudioData(response))
            .then((response) => { this.buffer = response; })
            .catch(() => {
            console.warn(`"${path}" could not be loaded.`);
        });
        this.amp = context.createGain();
        this.amp.gain.value = 1.0;
        this.amp.connect(master);
        this.fade = context.createGain();
        this.fade.gain.value = 1.0;
        this.fade.connect(this.amp);
        this.source = null;
        this.start = null;
    }
    set volume(value) {
        this.amp.gain.value = value;
    }
    get volume() {
        return this.amp.gain.value;
    }
    play({ offset = 0, fade = 0, loop = false } = {}) {
        if (this.buffer !== undefined && this.start === null) {
            this.source = context.createBufferSource();
            this.source.buffer = this.buffer;
            this.source.loop = loop;
            this.source.connect(this.fade);
            this.start = context.currentTime;
            this.source.playbackRate.value = 1;
            this.source.start(context.currentTime, offset / 1000);
            // Apply fade-in effect if fade duration is specified
            if (fade > 0) {
                this.fade.gain.setValueAtTime(0, context.currentTime);
                this.fade.gain.linearRampToValueAtTime(1.0, context.currentTime + fade / 1000);
            }
            this.source.onended = () => {
                var _a;
                this.start = null;
                (_a = this.source) === null || _a === void 0 ? void 0 : _a.disconnect();
                this.source = null;
            };
        }
    }
    pause({ fade = 0 } = {}) {
        var _a, _b;
        if (this.buffer !== undefined && this.start !== null) {
            const elapsed = (context.currentTime - this.start) % this.buffer.duration * 1000;
            // Apply fade-out effect if fade duration is specified
            if (fade > 0) {
                this.fade.gain.setValueAtTime(1.0, context.currentTime);
                this.fade.gain.linearRampToValueAtTime(0, context.currentTime + fade / 1000);
                (_a = this.source) === null || _a === void 0 ? void 0 : _a.stop(context.currentTime + fade / 1000);
            }
            else {
                (_b = this.source) === null || _b === void 0 ? void 0 : _b.stop(context.currentTime);
            }
            this.start = null;
            return elapsed;
        }
    }
    clear() {
        var _a;
        this.amp.disconnect();
        this.fade.disconnect();
        (_a = this.source) === null || _a === void 0 ? void 0 : _a.disconnect();
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
                const rate = adsr[0] === 0.0 ? 1.0 : Math.min(end / (adsr[0] + 0.001), 1.0);
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
            const end = dv > 0 ? dv : (context.currentTime - start);
            const rate = ADSR[0] === 0.0 ? 1.0 : Math.min(end / (ADSR[0] / 1000), 1.0);
            if (rate < 1.0) {
                param.cancelScheduledValues(start);
                param.setValueAtTime(base, start);
                param.linearRampToValueAtTime(base + amount * rate, start + ADSR[0] / 1000 * rate);
                param.linearRampToValueAtTime(base + amount * rate * ADSR[2], start + (ADSR[0] + ADSR[1]) / 1000 * rate);
            }
            param.linearRampToValueAtTime(base + amount * rate * ADSR[2], start + Math.max((ADSR[0] + ADSR[1]) / 1000 * rate, dv));
            param.linearRampToValueAtTime(base, start + Math.max((ADSR[0] + ADSR[1]) / 1000 * rate, end) + ADSR[3] / 1000);
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
    OpenAndClose,
    AnalogStick,
    DPad,
    Panel,
    Accordion,
    Popup,
};
const audio = {
    load(path) {
        const music = new AudioFile(path);
        const object = {
            play(options = {}) {
                const unit = xnew();
                if (music.start === null) {
                    music.play(options);
                    unit.on('finalize', () => music.pause({ fade: options.fade }));
                }
            },
            pause(options = {}) {
                music.pause(options);
            }
        };
        return xnew.promise(music.promise).then(() => object);
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
const xnew = Object.assign(xnew$1, { basics, audio });

export { xnew as default };
