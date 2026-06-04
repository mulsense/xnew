(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xnew = factory());
})(this, (function () { 'use strict';

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
            let set = super.get(key);
            if (set === undefined) {
                set = new Set();
                super.set(key, set);
            }
            set.add(value);
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
            if (value === undefined) {
                return super.delete(key);
            }
            else {
                const set = super.get(key);
                if (set === undefined) {
                    return false;
                }
                else {
                    const ret = set.delete(value);
                    if (set.size === 0) {
                        super.delete(key);
                    }
                    return ret;
                }
            }
        }
    }
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
            if (value === undefined) {
                super.set(key1, key2OrValue);
            }
            else {
                let inner = super.get(key1);
                if (inner === undefined) {
                    inner = new Map();
                    super.set(key1, inner);
                }
                inner.set(key2OrValue, value);
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
            if (key2 === undefined) {
                return super.delete(key1);
            }
            else {
                const inner = super.get(key1);
                if (inner === undefined) {
                    return false;
                }
                else {
                    const ret = inner.delete(key2);
                    if (inner.size === 0) {
                        super.delete(key1);
                    }
                    return ret;
                }
            }
        }
    }

    class Ticker {
        constructor(callback, fps = 60) {
            this.cancel = null;
            const minDelta = (1000 / fps) * 0.9;
            const interval = 1000 / fps;
            let previous = 0;
            const tick = () => {
                const delta = Date.now() - previous;
                if (delta > minDelta) {
                    callback();
                    previous += delta;
                }
                schedule();
            };
            const schedule = () => {
                if (typeof requestAnimationFrame !== 'undefined') {
                    const id = requestAnimationFrame(tick);
                    this.cancel = () => cancelAnimationFrame(id);
                }
                else {
                    const id = setTimeout(tick, interval);
                    this.cancel = () => clearTimeout(id);
                }
            };
            schedule();
        }
        clear() {
            if (this.cancel !== null) {
                this.cancel();
                this.cancel = null;
            }
        }
    }
    class Timer {
        constructor(options) {
            var _a, _b;
            this.options = options;
            this.id = null;
            this.time = { start: 0.0, processed: 0.0 };
            this.request = true;
            this.ticker = new Ticker(() => this.animation());
            this.visibilityListener = () => document.hidden === false ? this._start() : this._stop();
            if (typeof document !== 'undefined') {
                document.addEventListener('visibilitychange', this.visibilityListener);
            }
            (_b = (_a = this.options).transition) === null || _b === void 0 ? void 0 : _b.call(_a, 0.0);
            this.start();
        }
        animation() {
            var _a, _b;
            let p = Math.min(this.elapsed() / this.options.duration, 1.0);
            if (this.options.easing === 'ease-out') {
                p = Math.pow((1.0 - Math.pow((1.0 - p), 2.0)), 0.5);
            }
            else if (this.options.easing === 'ease-in') {
                p = Math.pow((1.0 - Math.pow((1.0 - p), 0.5)), 2.0);
            }
            else if (this.options.easing === 'ease' || this.options.easing === 'ease-in-out') {
                const bias = (this.options.easing === 'ease') ? 0.7 : 1.0;
                const s = p ** bias;
                p = s * s * (3 - 2 * s);
            }
            (_b = (_a = this.options).transition) === null || _b === void 0 ? void 0 : _b.call(_a, p);
        }
        clear() {
            if (this.id !== null) {
                clearTimeout(this.id);
                this.id = null;
            }
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', this.visibilityListener);
            }
            this.ticker.clear();
        }
        elapsed() {
            return this.time.processed + (this.id !== null ? (Date.now() - this.time.start) : 0);
        }
        start() {
            this.request = true;
            this._start();
        }
        stop() {
            this._stop();
            this.request = false;
        }
        _start() {
            if (this.request === true && this.id === null) {
                this.id = setTimeout(() => {
                    var _a, _b, _c, _d;
                    this.id = null;
                    this.time = { start: 0.0, processed: 0.0 };
                    (_b = (_a = this.options).transition) === null || _b === void 0 ? void 0 : _b.call(_a, 1.0);
                    (_d = (_c = this.options).timeout) === null || _d === void 0 ? void 0 : _d.call(_c);
                    this.clear();
                }, this.options.duration - this.time.processed);
                this.time.start = Date.now();
            }
        }
        _stop() {
            if (this.request === true && this.id !== null) {
                this.time.processed = this.time.processed + Date.now() - this.time.start;
                clearTimeout(this.id);
                this.id = null;
            }
        }
    }

    function listen(target, type, execute, options) {
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
    function getPointerPosition(element, event) {
        const rect = element.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
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
            return listen(props.element, props.type, (event) => {
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
            return listen(props.element, props.type, (event) => {
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
            return listen(props.element, props.type, (event) => {
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
            return listen(props.element, props.type, (event) => {
                props.listener({ event, position: getPointerPosition(props.element, event) });
            }, props.options);
        }
        element_click_outside(props) {
            return listen(document, props.type.split('.')[0], (event) => {
                if (props.element.contains(event.target) === false) {
                    props.listener({ event, position: getPointerPosition(props.element, event) });
                }
            }, props.options);
        }
        element_pointer(props) {
            return listen(props.element, props.type, (event) => {
                props.listener({ event, position: getPointerPosition(props.element, event) });
            }, props.options);
        }
        element_mouse(props) {
            return listen(props.element, props.type, (event) => {
                props.listener({ event, position: getPointerPosition(props.element, event) });
            }, props.options);
        }
        element_touch(props) {
            return listen(props.element, props.type, (event) => {
                props.listener({ event, position: getPointerPosition(props.element, event) });
            }, props.options);
        }
        element_pointer_outside(props) {
            return listen(document, props.type.split('.')[0], (event) => {
                if (props.element.contains(event.target) === false) {
                    props.listener({ event, position: getPointerPosition(props.element, event) });
                }
            }, props.options);
        }
        element_wheel(props) {
            return listen(props.element, props.type, (event) => {
                props.listener({ event, delta: { x: event.wheelDeltaX, y: event.wheelDeltaY } });
            }, props.options);
        }
        element_drag(props) {
            let pointermove = null;
            let pointerup = null;
            let pointercancel = null;
            const pointerdown = listen(props.element, 'pointerdown', (event) => {
                const id = event.pointerId;
                const position = getPointerPosition(props.element, event);
                let previous = position;
                pointermove = listen(window, 'pointermove', (event) => {
                    if (event.pointerId === id) {
                        const position = getPointerPosition(props.element, event);
                        const delta = { x: position.x - previous.x, y: position.y - previous.y };
                        if (props.type === 'dragmove') {
                            props.listener({ event, position, delta });
                        }
                        previous = position;
                    }
                }, props.options);
                pointerup = listen(window, 'pointerup', (event) => {
                    if (event.pointerId === id) {
                        const position = getPointerPosition(props.element, event);
                        if (props.type === 'dragend') {
                            props.listener({ event, position, delta: { x: 0, y: 0 } });
                        }
                        remove();
                    }
                }, props.options);
                pointercancel = listen(window, 'pointercancel', (event) => {
                    if (event.pointerId === id) {
                        const position = getPointerPosition(props.element, event);
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
            return listen(window, type, (event) => {
                props.listener({ event });
            }, props.options);
        }
        window_key(props) {
            const type = props.type.substring(props.type.indexOf('.') + 1);
            return listen(window, type, (event) => {
                if (event.repeat)
                    return;
                props.listener({ event });
            }, props.options);
        }
        window_key_arrow(props) {
            const keymap = {};
            const keydown = listen(window, 'keydown', (event) => {
                if (event.repeat)
                    return;
                keymap[event.code] = 1;
                if (props.type === 'window.keydown.arrow' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
                    const vector = {
                        x: (keymap['ArrowLeft'] ? -1 : 0) + (keymap['ArrowRight'] ? +1 : 0),
                        y: (keymap['ArrowUp'] ? -1 : 0) + (keymap['ArrowDown'] ? +1 : 0)
                    };
                    props.listener({ event, vector });
                }
            }, props.options);
            const keyup = listen(window, 'keyup', (event) => {
                keymap[event.code] = 0;
                if (props.type === 'window.keyup.arrow' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
                    const vector = {
                        x: (keymap['ArrowLeft'] ? -1 : 0) + (keymap['ArrowRight'] ? +1 : 0),
                        y: (keymap['ArrowUp'] ? -1 : 0) + (keymap['ArrowDown'] ? +1 : 0)
                    };
                    props.listener({ event, vector });
                }
            }, props.options);
            return () => {
                keydown();
                keyup();
            };
        }
        window_key_wasd(props) {
            const keymap = {};
            const finalize1 = listen(window, 'keydown', (event) => {
                if (event.repeat)
                    return;
                keymap[event.code] = 1;
                if (props.type === 'window.keydown.wasd' && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
                    const vector = {
                        x: (keymap['KeyA'] ? -1 : 0) + (keymap['KeyD'] ? +1 : 0),
                        y: (keymap['KeyW'] ? -1 : 0) + (keymap['KeyS'] ? +1 : 0)
                    };
                    props.listener({ event, vector });
                }
            }, props.options);
            const finalize2 = listen(window, 'keyup', (event) => {
                keymap[event.code] = 0;
                if (props.type === 'window.keyup.wasd' && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
                    const vector = {
                        x: (keymap['KeyA'] ? -1 : 0) + (keymap['KeyD'] ? +1 : 0),
                        y: (keymap['KeyW'] ? -1 : 0) + (keymap['KeyS'] ? +1 : 0)
                    };
                    props.listener({ event, vector });
                }
            }, props.options);
            return () => {
                finalize1();
                finalize2();
            };
        }
        document_basic(props) {
            const type = props.type.substring('document.'.length);
            return listen(document, type, (event) => {
                props.listener({ event });
            }, props.options);
        }
    }

    function isDomElement(value) {
        return (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) || (typeof SVGElement !== 'undefined' && value instanceof SVGElement);
    }

    const SYSTEM_EVENTS = ['start', 'update', 'render', 'stop', 'finalize'];
    class Unit {
        constructor(parent, ...args) {
            var _a, _b, _c, _d;
            let target;
            let Component;
            let props;
            if (isDomElement(args[0]) || typeof args[0] === 'string') {
                target = args[0];
                Component = args[1];
                props = args[2];
            }
            else {
                target = null;
                Component = args[0];
                props = args[1];
            }
            const backup = Unit.currentUnit;
            Unit.currentUnit = this;
            parent === null || parent === void 0 ? void 0 : parent._.children.push(this);
            let baseElement;
            if (isDomElement(target)) {
                baseElement = target;
            }
            else if (parent !== null) {
                baseElement = parent._.currentElement;
            }
            else if ((_a = globalThis.document) === null || _a === void 0 ? void 0 : _a.body) {
                baseElement = globalThis.document.body;
            }
            else {
                baseElement = null;
            }
            let baseComponent;
            if (typeof Component === 'function') {
                baseComponent = Component;
            }
            else if (typeof Component === 'string' || typeof Component === 'number') {
                baseComponent = (unit) => { unit.element.textContent = Component.toString(); };
            }
            else {
                baseComponent = (unit) => { };
            }
            const baseContext = (_b = parent === null || parent === void 0 ? void 0 : parent._.currentContext) !== null && _b !== void 0 ? _b : { previous: null };
            this._ = {
                parent,
                state: 'invoked',
                tostart: true,
                protected: false,
                currentElement: baseElement,
                currentContext: baseContext,
                currentComponent: null,
                afterSnapshot: null,
                children: [],
                nestElements: [],
                promises: [],
                results: {},
                Components: [],
                listeners: new MapMap(),
                defines: {},
                systems: { start: [], update: [], render: [], stop: [], finalize: [] },
                eventor: new Eventor(),
                mode: parent ? ((_d = (_c = parent._.mode) !== null && _c !== void 0 ? _c : Unit.config.mode) !== null && _d !== void 0 ? _d : null) : null,
                syncState: null,
                syncId: null,
            };
            if (typeof target === 'string') {
                Unit.nest(this, target);
            }
            Unit.extend(this, baseComponent, props);
            if (this._.state === 'invoked') {
                this._.state = 'initialized';
            }
            this._.afterSnapshot = Unit.snapshot(this);
            Unit.currentUnit = backup;
        }
        get parent() {
            return this._.parent;
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
        }
        static finalize(unit) {
            if (unit._.state !== 'finalized' && unit._.state !== 'finalizing') {
                unit._.state = 'finalizing';
                unit._.children.reverse().forEach((child) => child.finalize());
                unit._.systems.finalize.reverse().forEach(({ execute }) => execute());
                unit.off();
                unit._.nestElements.reverse().filter(item => item.owned).forEach(item => item.element.remove());
                unit._.Components.forEach((Component) => Unit.component2units.delete(Component, unit));
                const contexts = Unit.unit2Contexts.get(unit);
                contexts === null || contexts === void 0 ? void 0 : contexts.forEach((context) => {
                    let temp = context.previous;
                    while (temp !== null) {
                        if (contexts.has(temp) === false && temp.key !== undefined) {
                            context.previous = temp;
                            context.key = undefined;
                            context.value = undefined;
                            break;
                        }
                        temp = temp.previous;
                    }
                });
                Unit.unit2Contexts.delete(unit);
                unit._.currentContext = { previous: null };
                Object.keys(unit._.defines).forEach((key) => {
                    delete unit[key];
                });
                unit._.defines = {};
                unit._.state = 'finalized';
                if (unit._.parent) {
                    unit._.parent._.children = unit._.parent._.children.filter((u) => u !== unit);
                }
            }
        }
        static nest(unit, target, textContent) {
            if (isDomElement(target)) {
                unit._.nestElements.push({ element: target, owned: false });
                unit._.currentElement = target;
                return target;
            }
            else {
                const match = target.match(/<((\w+)[^>]*?)\/?>/);
                if (match !== null) {
                    unit._.currentElement.insertAdjacentHTML('beforeend', `<${match[1]}></${match[2]}>`);
                    const element = unit._.currentElement.children[unit._.currentElement.children.length - 1];
                    unit._.currentElement = element;
                    if (textContent !== undefined) {
                        element.textContent = textContent.toString();
                    }
                    unit._.nestElements.push({ element, owned: true });
                    return element;
                }
                else {
                    throw new Error(`xnew.nest: invalid tag string [${target}]`);
                }
            }
        }
        static extend(unit, Component, props) {
            var _a;
            const backupComponent = unit._.currentComponent;
            unit._.currentComponent = Component;
            if (unit._.parent !== null) {
                Unit.addContext(unit._.parent, unit, Component, unit);
            }
            Unit.addContext(unit, unit, Component, unit);
            const defines = (_a = Component(unit, props !== null && props !== void 0 ? props : {})) !== null && _a !== void 0 ? _a : {};
            unit._.currentComponent = backupComponent;
            Unit.component2units.add(Component, unit);
            unit._.Components.push(Component);
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
                    throw new Error(`Only function properties can be defined as Component defines. [${key}]`);
                }
                Object.defineProperty(unit._.defines, key, wrapper);
                Object.defineProperty(unit, key, wrapper);
            });
            let clone = {};
            Object.defineProperties(clone, Object.getOwnPropertyDescriptors(unit._.defines));
            return clone;
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
            Unit.syncIdCounter = 1;
            (_a = Unit.rootUnit) === null || _a === void 0 ? void 0 : _a.finalize();
            Unit.currentUnit = Unit.rootUnit = new Unit(null);
            const ticker = new Ticker(() => {
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
                snapshot.unit._.currentComponent = snapshot.Component;
                return func(...args);
            }
            catch (error) {
                throw error;
            }
            finally {
                Unit.currentUnit = currentUnit;
                snapshot.unit._.currentContext = backup.context;
                snapshot.unit._.currentElement = backup.element;
                snapshot.unit._.currentComponent = backup.Component;
            }
        }
        static snapshot(unit) {
            return { unit, context: unit._.currentContext, element: unit._.currentElement, Component: unit._.currentComponent };
        }
        static addContext(unit, orner, key, value) {
            unit._.currentContext = { previous: unit._.currentContext, key, value };
            Unit.unit2Contexts.add(orner, unit._.currentContext);
        }
        static getContext(unit, key) {
            for (let context = unit._.currentContext; context.previous !== null; context = context.previous) {
                if (context.value === Unit.currentUnit && key === unit._.currentComponent)
                    continue;
                if (key === context.key)
                    return context.value;
            }
        }
        static find(Component) {
            var _a, _b;
            const current = Unit.currentUnit;
            const ancestors = [];
            for (let u = (_a = current === null || current === void 0 ? void 0 : current._.parent) !== null && _a !== void 0 ? _a : null; u !== null; u = u._.parent)
                ancestors.push(u);
            return [...((_b = Unit.component2units.get(Component)) !== null && _b !== void 0 ? _b : [])].filter((unit) => {
                let boundary = undefined;
                for (let u = unit._.parent; u !== null && boundary === undefined; u = u._.parent) {
                    if (u._.protected === true)
                        boundary = u;
                }
                return boundary === undefined || ancestors.includes(boundary) === true || current === boundary;
            });
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
                unit._.listeners.set(type, listener, { element: unit.element, Component: unit._.currentComponent, execute });
                Unit.type2units.add(type, unit);
                if (/^[A-Za-z]/.test(type) && unit.element !== null) {
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
                const ancestors = [];
                for (let u = current._.parent; u !== null; u = u._.parent)
                    ancestors.push(u);
                (_a = Unit.type2units.get(type)) === null || _a === void 0 ? void 0 : _a.forEach((unit) => {
                    var _a;
                    let find = undefined;
                    for (let u = unit; u !== null && find === undefined; u = u._.parent) {
                        if (u._.protected === true)
                            find = u;
                    }
                    if (find === undefined || ancestors.includes(find) === true || current === find) {
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
    Unit.config = { mode: null };
    Unit.syncIdCounter = 1;
    Unit.unit2Contexts = new MapSet();
    Unit.component2units = new MapSet();
    Unit.type2units = new MapSet();
    class UnitPromise {
        constructor(promise) { this.promise = promise; }
        then(callback) { return this.wrap('then', callback); }
        catch(callback) { return this.wrap('catch', callback); }
        finally(callback) { return this.wrap('finally', callback); }
        static all(promises) {
            return new UnitPromise(Promise.all(promises.map(p => p.promise)));
        }
        wrap(key, callback) {
            const snapshot = Unit.snapshot(Unit.currentUnit);
            this.promise = this.promise[key]((...args) => Unit.scope(snapshot, callback, ...args));
            return this;
        }
    }
    class UnitTimer {
        constructor() {
            this.unit = null;
            this.queue = [];
        }
        clear() {
            var _a;
            this.queue = [];
            (_a = this.unit) === null || _a === void 0 ? void 0 : _a.finalize();
            this.unit = null;
        }
        timeout(timeout, duration = 0) {
            return UnitTimer.execute(this, { timeout, duration }, 1);
        }
        interval(timeout, duration = 0, iterations = 0) {
            return UnitTimer.execute(this, { timeout, duration }, iterations);
        }
        transition(transition, duration = 0, easing) {
            return UnitTimer.execute(this, { transition, duration, easing }, 1);
        }
        static execute(timer, options, iterations) {
            const props = { options, iterations, snapshot: Unit.snapshot(Unit.currentUnit) };
            if (timer.unit === null || timer.unit._.state === 'finalized') {
                timer.unit = new Unit(Unit.currentUnit, UnitTimer.Component, props);
            }
            else if (timer.queue.length === 0) {
                timer.queue.push(props);
                timer.unit.on('finalize', () => UnitTimer.next(timer));
            }
            else {
                timer.queue.push(props);
            }
            return timer;
        }
        static next(timer) {
            if (timer.queue.length > 0) {
                timer.unit = new Unit(Unit.currentUnit, UnitTimer.Component, timer.queue.shift());
                timer.unit.on('finalize', () => UnitTimer.next(timer));
            }
        }
        static Component(unit, { options, iterations, snapshot }) {
            let counter = 0;
            let timer = new Timer({ timeout, transition, duration: options.duration, easing: options.easing });
            function timeout() {
                if (options.timeout)
                    Unit.scope(snapshot, options.timeout);
                if (iterations <= 0 || counter < iterations - 1) {
                    timer = new Timer({ timeout, transition, duration: options.duration, easing: options.easing });
                }
                else {
                    unit.finalize();
                }
                counter++;
            }
            function transition(value) {
                if (options.transition)
                    Unit.scope(snapshot, options.transition, { value });
            }
            unit.on('finalize', () => timer.clear());
        }
    }

    const nameToComponent = new Map();
    const componentToName = new Map();
    function registerComponent(name, Component) {
        nameToComponent.set(name, Component);
        componentToName.set(Component, name);
    }
    function getRegisteredName(Component) {
        return componentToName.get(Component);
    }
    function getRegisteredComponent(name) {
        return nameToComponent.get(name);
    }
    function getSyncName(unit) {
        for (const Component of unit._.Components) {
            const name = getRegisteredName(Component);
            if (name !== undefined) {
                return name;
            }
        }
        return undefined;
    }
    function captureStateTree(root) {
        const nodes = [];
        const walk = (unit, nearestSyncedId) => {
            var _a;
            let parentForChildren = nearestSyncedId;
            const name = getSyncName(unit);
            if (name !== undefined) {
                if (unit._.syncId === null) {
                    unit._.syncId = Unit.syncIdCounter++;
                }
                nodes.push({
                    id: unit._.syncId,
                    name,
                    parentId: nearestSyncedId,
                    state: Object.assign({}, ((_a = unit._.syncState) !== null && _a !== void 0 ? _a : {})),
                });
                parentForChildren = unit._.syncId;
            }
            unit._.children.forEach((child) => walk(child, parentForChildren));
        };
        walk(root, null);
        return nodes;
    }
    const reconcileMaps = new WeakMap();
    function xnewChild(parent, Component) {
        return xnew$1(parent, Component);
    }
    function applyStateTree(root, tree) {
        let map = reconcileMaps.get(root);
        if (map === undefined) {
            map = new Map();
            reconcileMaps.set(root, map);
        }
        const incoming = new Set(tree.map((node) => node.id));
        for (const node of tree) {
            const existing = map.get(node.id);
            if (existing === undefined) {
                const Component = getRegisteredComponent(node.name);
                if (Component === undefined) {
                    continue;
                }
                const parent = node.parentId === null ? root : map.get(node.parentId);
                if (parent === undefined) {
                    continue;
                }
                const unit = xnewChild(parent, Component);
                unit._.syncId = node.id;
                if (unit._.syncState === null) {
                    unit._.syncState = {};
                }
                Object.assign(unit._.syncState, node.state);
                map.set(node.id, unit);
            }
            else {
                if (existing._.syncState === null) {
                    existing._.syncState = {};
                }
                for (const key of Object.keys(node.state)) {
                    if (existing._.syncState[key] !== node.state[key]) {
                        existing._.syncState[key] = node.state[key];
                    }
                }
            }
        }
        for (const [id, unit] of [...map.entries()]) {
            if (incoming.has(id) === false) {
                unit.finalize();
                map.delete(id);
            }
        }
    }

    const xnew$1 = Object.assign(function (...args) {
        var _a, _b;
        if (Unit.rootUnit === undefined)
            Unit.reset();
        if (args[0] instanceof Unit) {
            const parent = args.shift();
            const snapshot = (_a = parent._.afterSnapshot) !== null && _a !== void 0 ? _a : Unit.snapshot(parent);
            return Unit.scope(snapshot, () => new Unit(parent, ...args));
        }
        else {
            const parent = (_b = Unit.currentUnit) !== null && _b !== void 0 ? _b : null;
            return new Unit(parent, ...args);
        }
    }, {
        nest(target) {
            try {
                if (Unit.currentUnit._.state !== 'invoked') {
                    throw new Error('xnew.nest can not be called after initialized.');
                }
                return Unit.nest(Unit.currentUnit, target);
            }
            catch (error) {
                console.error('xnew.nest(target: DomElement | string): ', error);
                throw error;
            }
        },
        extend(Component, props) {
            try {
                if (Unit.currentUnit._.state !== 'invoked') {
                    throw new Error('xnew.extend can not be called after initialized.');
                }
                if (Unit.currentUnit._.Components.includes(Component) === true) {
                    console.warn('Component is already extended in this unit:', Component);
                }
                const defines = Unit.extend(Unit.currentUnit, Component, props);
                return defines;
            }
            catch (error) {
                console.error('xnew.extend(component: Function, props?: Object): ', error);
                throw error;
            }
        },
        context(key) {
            try {
                return Unit.getContext(Unit.currentUnit, key);
            }
            catch (error) {
                console.error('xnew.context(key: any): ', error);
                throw error;
            }
        },
        promise(promise) {
            try {
                let unitPromise;
                if (promise instanceof Unit) {
                    unitPromise = UnitPromise.all(promise._.promises).then(() => promise._.results);
                }
                else if (promise instanceof Promise) {
                    unitPromise = new UnitPromise(promise);
                }
                else {
                    unitPromise = new UnitPromise(new Promise(xnew$1.scope(promise)));
                }
                Unit.currentUnit._.promises.push(unitPromise);
                return unitPromise;
            }
            catch (error) {
                console.error('xnew.promise(promise: Promise<any>): ', error);
                throw error;
            }
        },
        then(callback) {
            try {
                const currentUnit = Unit.currentUnit;
                return UnitPromise.all(Unit.currentUnit._.promises).then(() => callback(currentUnit._.results));
            }
            catch (error) {
                console.error('xnew.then(callback: Function): ', error);
                throw error;
            }
        },
        catch(callback) {
            try {
                return UnitPromise.all(Unit.currentUnit._.promises)
                    .catch(callback);
            }
            catch (error) {
                console.error('xnew.catch(callback: Function): ', error);
                throw error;
            }
        },
        finally(callback) {
            try {
                return UnitPromise.all(Unit.currentUnit._.promises).finally(callback);
            }
            catch (error) {
                console.error('xnew.finally(callback: Function): ', error);
                throw error;
            }
        },
        defer() {
            let settled = false;
            let resolve;
            let reject;
            const unitPromise = new UnitPromise(new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            }));
            Unit.currentUnit._.promises.push(unitPromise);
            return {
                resolve() {
                    if (settled)
                        return;
                    settled = true;
                    resolve();
                },
                reject() {
                    if (settled)
                        return;
                    settled = true;
                    reject();
                },
            };
        },
        collect(object) {
            try {
                Object.assign(Unit.currentUnit._.results, object);
            }
            catch (error) {
                console.error('xnew.collect(object?: Record<string, any>): ', error);
                throw error;
            }
        },
        scope(callback) {
            const snapshot = Unit.snapshot(Unit.currentUnit);
            return (...args) => Unit.scope(snapshot, callback, ...args);
        },
        find(Component) {
            try {
                return Unit.find(Component);
            }
            catch (error) {
                console.error('xnew.find(Component: Function): ', error);
                throw error;
            }
        },
        emit(type, ...args) {
            try {
                return Unit.emit(type, ...args);
            }
            catch (error) {
                console.error('xnew.emit(type: string, ...args: any[]): ', error);
                throw error;
            }
        },
        timeout(callback, duration = 0) {
            return new UnitTimer().timeout(callback, duration);
        },
        interval(callback, duration, iterations = 0) {
            return new UnitTimer().interval(callback, duration, iterations);
        },
        transition(transition, duration = 0, easing = 'linear') {
            return new UnitTimer().transition(transition, duration, easing);
        },
        protect() {
            Unit.currentUnit._.protected = true;
        },
        server(callback, props) {
            try {
                if (Unit.currentUnit._.state !== 'invoked') {
                    throw new Error('xnew.server can not be called after initialized.');
                }
                if (Unit.currentUnit._.mode === 'client') {
                    return {};
                }
                return Unit.extend(Unit.currentUnit, callback, props);
            }
            catch (error) {
                console.error('xnew.server(callback: Function, props?: Object): ', error);
                throw error;
            }
        },
        client(callback, props) {
            try {
                if (Unit.currentUnit._.state !== 'invoked') {
                    throw new Error('xnew.client can not be called after initialized.');
                }
                if (Unit.currentUnit._.mode === 'server') {
                    return {};
                }
                return Unit.extend(Unit.currentUnit, callback, props);
            }
            catch (error) {
                console.error('xnew.client(callback: Function, props?: Object): ', error);
                throw error;
            }
        },
        sync: {
            state(initial = {}) {
                const unit = Unit.currentUnit;
                if (unit._.syncState === null) {
                    unit._.syncState = {};
                }
                Object.assign(unit._.syncState, initial);
                return unit._.syncState;
            },
            register(components) {
                for (const [name, Component] of Object.entries(components)) {
                    registerComponent(name, Component);
                }
            },
            capture(root) {
                return captureStateTree(root);
            },
            apply(root, tree) {
                applyStateTree(root, tree);
            },
        },
        config: Unit.config,
    });

    function OpenAndClose(unit, { open = true, transition = { duration: 200, easing: 'ease' } }) {
        let value = open ? 1.0 : 0.0;
        let sign = open ? +1 : -1;
        let timer = xnew$1.timeout(() => xnew$1.emit('-transition', { value }));
        return {
            toggle() {
                sign < 0 ? unit.open() : unit.close();
            },
            open() {
                var _a, _b;
                sign = +1;
                const d = 1 - value;
                const duration = ((_a = transition === null || transition === void 0 ? void 0 : transition.duration) !== null && _a !== void 0 ? _a : 200) * d;
                const easing = (_b = transition === null || transition === void 0 ? void 0 : transition.easing) !== null && _b !== void 0 ? _b : 'ease';
                timer === null || timer === void 0 ? void 0 : timer.clear();
                timer = xnew$1.transition(({ value: x }) => {
                    value = 1.0 - (x < 1.0 ? (1 - x) * d : 0.0);
                    xnew$1.emit('-transition', { value });
                }, duration, easing)
                    .timeout(() => xnew$1.emit('-opened'));
            },
            close() {
                var _a, _b;
                sign = -1;
                const d = value;
                const duration = ((_a = transition === null || transition === void 0 ? void 0 : transition.duration) !== null && _a !== void 0 ? _a : 200) * d;
                const easing = (_b = transition === null || transition === void 0 ? void 0 : transition.easing) !== null && _b !== void 0 ? _b : 'ease';
                timer === null || timer === void 0 ? void 0 : timer.clear();
                timer = xnew$1.transition(({ value: x }) => {
                    value = x < 1.0 ? (1 - x) * d : 0.0;
                    xnew$1.emit('-transition', { value });
                }, duration, easing)
                    .timeout(() => xnew$1.emit('-closed'));
            },
        };
    }
    function Accordion(unit) {
        const system = xnew$1.context(OpenAndClose);
        const outer = xnew$1.nest('<div style="overflow: hidden;">');
        const inner = xnew$1.nest('<div style="display: flex; flex-direction: column; box-sizing: border-box;">');
        system.on('-transition', ({ value }) => {
            outer.style.height = value < 1.0 ? inner.offsetHeight * value + 'px' : 'auto';
            outer.style.opacity = value.toString();
        });
    }
    function Popup(unit) {
        const system = xnew$1.context(OpenAndClose);
        system.on('-closed', () => unit.finalize());
        system.open();
        xnew$1.nest('<div style="position: fixed; inset: 0; z-index: 1000; opacity: 0;">');
        unit.on('click', ({ event }) => event.target === unit.element && system.close());
        system.on('-transition', ({ value }) => {
            unit.element.style.opacity = value.toString();
        });
    }

    function SVG(unit, { viewBox = '0 0 64 64', className = '', style = '', stroke = 'none', strokeOpacity = 1, strokeWidth = 1, strokeLinejoin = 'round', strokeLinecap = 'round', fill = 'none', fillOpacity = 1 } = {}) {
        xnew$1.nest(`<svg
        viewBox="${viewBox}"
        class="${className}"
        style="${style}"
        stroke="${stroke}"
        stroke-opacity="${strokeOpacity}"
        stroke-width="${strokeWidth}"
        stroke-linejoin="${strokeLinejoin}"
        stroke-linecap="${strokeLinecap}"
        fill="${fill}"
        fill-opacity="${fillOpacity}"
    ">`);
    }
    function SVGText(unit, { text = '', fontSize = 20, anchor = { x: 0, y: 0 }, className = '', style = '', stroke = 'none', strokeOpacity = 1, strokeWidth = 1, strokeLinejoin = 'round', strokeLinecap = 'round', fill = 'currentColor', fillOpacity = 1 } = {}) {
        xnew$1.extend(SVG, { className, style, stroke, strokeOpacity, strokeWidth, strokeLinejoin, strokeLinecap, fill, fillOpacity });
        const svg = unit.element;
        xnew$1.nest(`<text x="0" y="0" font-size="${fontSize}" paint-order="stroke fill">`);
        unit.element.textContent = text;
        function resize() {
            const bbox = unit.element.getBBox();
            const padding = 0;
            svg.setAttribute('viewBox', `
            ${bbox.x - padding}
            ${bbox.y - padding}
            ${bbox.width + padding * 2}
            ${bbox.height + padding * 2}
        `);
            svg.style.width = (bbox.width + padding * 2) + 'px';
        }
        resize();
        unit.on('resize', resize);
        svg.style.overflow = 'visible';
    }

    function Aspect(unit, { aspect = 1.0, fit = 'contain' } = {}) {
        xnew$1.nest('<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; container-type: size;">');
        xnew$1.nest(`<div style="position: relative; aspect-ratio: ${aspect}; container-type: size;">`);
        if (fit === 'contain') {
            unit.element.style.width = `min(100cqw, calc(100cqh * ${aspect}))`;
        }
        else {
            unit.element.style.flexShrink = '0';
            unit.element.style.width = `max(100cqw, calc(100cqh * ${aspect}))`;
        }
    }

    function Screen(unit, { width = 800, height = 600, fit = 'contain' } = {}) {
        xnew$1.extend(Aspect, { aspect: width / height, fit });
        const canvas = xnew$1(`<canvas width="${width}" height="${height}" style="width: 100%; height: 100%; vertical-align: bottom;">`);
        return {
            get canvas() { return canvas.element; },
        };
    }

    function AnalogStick(unit, { stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 1, fill = '#FFF', fillOpacity = 0.8 } = {}) {
        xnew$1.extend(Aspect, { aspect: 1.0, fit: 'contain' });
        xnew$1.nest(`<div style="width: 100%; height: 100%; cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: none; pointer-events: auto;">`);
        xnew$1((unit) => {
            xnew$1.extend(SVG, { style: 'position: absolute; width: 100%; height: 100%;', stroke, strokeOpacity, strokeWidth, fill, fillOpacity });
            xnew$1('<polygon points="32  7 27 13 37 13">');
            xnew$1('<polygon points="32 57 27 51 37 51">');
            xnew$1('<polygon points=" 7 32 13 27 13 37">');
            xnew$1('<polygon points="57 32 51 27 51 37">');
        });
        const target = xnew$1((unit) => {
            xnew$1.extend(SVG, { style: 'position: absolute; width: 100%; height: 100%;', stroke, strokeOpacity, strokeWidth, fill, fillOpacity });
            xnew$1('<circle cx="32" cy="32" r="14">');
        });
        unit.on('dragstart dragmove', ({ type, position }) => {
            const size = unit.element.clientWidth;
            const x = position.x - size / 2;
            const y = position.y - size / 2;
            const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (size / 4));
            const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
            const vector = { x: Math.cos(a) * d, y: Math.sin(a) * d };
            Object.assign(target.element.style, { filter: 'brightness(80%)', left: `${vector.x * size / 4}px`, top: `${vector.y * size / 4}px` });
            const nexttype = { dragstart: '-down', dragmove: '-move' }[type];
            xnew$1.emit(nexttype, { vector });
        });
        unit.on('dragend', () => {
            Object.assign(target.element.style, { filter: '', left: '0px', top: '0px' });
            xnew$1.emit('-up', { vector: { x: 0, y: 0 } });
        });
    }
    function DPad(unit, { diagonal = true, stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 1, fill = '#FFF', fillOpacity = 0.8 } = {}) {
        xnew$1.extend(Aspect, { aspect: 1.0, fit: 'contain' });
        xnew$1.nest(`<div style="width: 100%; height: 100%; cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: none; pointer-events: auto;">`);
        const polygons = [
            '<polygon points="32 32 23 23 23  4 24  3 40  3 41  4 41 23">',
            '<polygon points="32 32 23 41 23 60 24 61 40 61 41 60 41 41">',
            '<polygon points="32 32 23 23  4 23  3 24  3 40  4 41 23 41">',
            '<polygon points="32 32 41 23 60 23 61 24 61 40 60 41 41 41">'
        ];
        const targets = polygons.map((polygon) => {
            return xnew$1((unit) => {
                xnew$1.extend(SVG, { style: 'position: absolute; width: 100%; height: 100%;', fill, fillOpacity });
                xnew$1(polygon);
            });
        });
        xnew$1((unit) => {
            xnew$1.extend(SVG, { style: 'position: absolute; width: 100%; height: 100%;', stroke, strokeOpacity, strokeWidth });
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
            targets[0].element.style.filter = '';
            targets[1].element.style.filter = '';
            targets[2].element.style.filter = '';
            targets[3].element.style.filter = '';
            xnew$1.emit('-up', { vector: { x: 0, y: 0 } });
        });
    }

    const paleColor$1 = 'color-mix(in srgb, currentColor 20%, transparent)';
    function Panel(unit, { params }) {
        const object = params !== null && params !== void 0 ? params : {};
        return {
            group({ name, open, params }, inner) {
                const group = xnew$1((unit) => {
                    xnew$1.extend(Group, { name, open });
                    xnew$1.extend(Panel, { params: params !== null && params !== void 0 ? params : object });
                    inner(unit);
                });
                return group;
            },
            button(key) {
                const button = xnew$1(Button, { key });
                return button;
            },
            select(key, { value, items = [] } = {}) {
                var _a, _b;
                object[key] = (_b = (_a = value !== null && value !== void 0 ? value : object[key]) !== null && _a !== void 0 ? _a : items[0]) !== null && _b !== void 0 ? _b : '';
                const select = xnew$1(Select, { key, value: object[key], items });
                select.on('input', ({ value }) => object[key] = value);
                return select;
            },
            range(key, { value, min = 0, max = 100, step = 1 } = {}) {
                var _a;
                object[key] = (_a = value !== null && value !== void 0 ? value : object[key]) !== null && _a !== void 0 ? _a : min;
                const number = xnew$1(Range, { key, value: object[key], min, max, step });
                number.on('input', ({ value }) => object[key] = value);
                return number;
            },
            checkbox(key, { value } = {}) {
                var _a;
                object[key] = (_a = value !== null && value !== void 0 ? value : object[key]) !== null && _a !== void 0 ? _a : false;
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
            xnew$1('<div style="height: 2em; margin: 0.125em 0; display: flex; align-items: center; cursor: pointer; user-select: none;">', (unit) => {
                unit.on('click', () => group.toggle());
                xnew$1((unit) => {
                    xnew$1.extend(SVG, { viewBox: '0 0 12 12', stroke: 'currentColor', style: 'width: 1em; height: 1em; margin-right: 0.25em;' });
                    xnew$1('<path d="M6 2 10 6 6 10"/>');
                    group.on('-transition', ({ value }) => unit.element.style.transform = `rotate(${value * 90}deg)`);
                });
                xnew$1('<div>', name);
            });
        }
        xnew$1.extend(Accordion);
    }
    function Button(unit, { key = '' }) {
        xnew$1.nest('<button style="margin: 0.125em 0; height: 2em; border: 1px solid; border-radius: 0.25em; cursor: pointer;">');
        unit.element.textContent = key;
        unit.on('pointerover', () => {
            Object.assign(unit.element.style, { background: paleColor$1, borderColor: 'currentColor' });
        });
        unit.on('pointerout', () => {
            Object.assign(unit.element.style, { background: '', borderColor: '' });
        });
        unit.on('pointerdown', () => {
            unit.element.style.filter = 'brightness(0.5)';
        });
        unit.on('pointerup', () => {
            unit.element.style.filter = '';
        });
    }
    function Separator(unit) {
        xnew$1.nest(`<div style="margin: 0.5em 0; border-top: 1px solid currentColor;">`);
    }
    function Range(unit, { key = '', value, min = 0, max = 100, step = 1 }) {
        value = value !== null && value !== void 0 ? value : min;
        xnew$1.nest(`<div style="position: relative; height: 2em; margin: 0.125em 0; cursor: pointer; user-select: none;">`);
        const ratio = (value - min) / (max - min);
        const fill = xnew$1(`<div style="position: absolute; top: 0; left: 0; bottom: 0; width: ${ratio * 100}%; background: ${paleColor$1}; border: 1px solid currentColor; border-radius: 0.25em; transition: width 0.05s;">`);
        const status = xnew$1('<div style="position: absolute; inset: 0; padding: 0 0.5em; display: flex; justify-content: space-between; align-items: center; pointer-events: none;">', (unit) => {
            xnew$1('<div>', key);
            xnew$1('<div key="status">', value);
        });
        xnew$1.nest(`<input type="range" name="${key}" min="${min}" max="${max}" step="${step}" value="${value}" style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; margin: 0;">`);
        unit.on('input', ({ event }) => {
            const v = Number(event.target.value);
            const r = (v - min) / (max - min);
            fill.element.style.width = `${r * 100}%`;
            status.element.querySelector('[key="status"]').textContent = String(v);
        });
    }
    function Checkbox(unit, { key = '', value } = {}) {
        xnew$1.nest(`<div style="position: relative; height: 2em; margin: 0.125em 0; padding: 0 0.5em; display: flex; align-items: center; cursor: pointer; user-select: none;">`);
        xnew$1('<div style="flex: 1;">', key);
        const box = xnew$1(`<div style="width: 1.25em; height: 1.25em; border: 1px solid currentColor; border-radius: 0.25em; display: flex; align-items: center; justify-content: center;">`, () => {
            xnew$1((unit) => {
                xnew$1.extend(SVG, { viewBox: '0 0 12 12', style: 'width: 1.25em; height: 1.25em; opacity: 0;', stroke: 'currentColor', strokeWidth: 2 });
                xnew$1('<path d="M2 6 5 9 10 3" />');
            });
        });
        const check = box.element.querySelector('svg');
        const update = (checked) => {
            box.element.style.background = checked ? paleColor$1 : '';
            check.style.opacity = checked ? '1' : '0';
        };
        update(!!value);
        xnew$1.nest(`<input type="checkbox" name="${key}" ${value ? 'checked' : ''} style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; margin: 0;">`);
        unit.on('input', ({ event, value }) => {
            update(value);
        });
    }
    function Select(_, { key = '', value, items = [] } = {}) {
        var _a;
        const initial = (_a = value !== null && value !== void 0 ? value : items[0]) !== null && _a !== void 0 ? _a : '';
        xnew$1.nest(`<div style="position: relative; height: 2em; margin: 0.125em 0; padding: 0 0.5em; display: flex; align-items: center;">`);
        xnew$1('<div style="flex: 1;">', key);
        const native = xnew$1(`<select name="${key}" style="display: none;">`, () => {
            for (const item of items) {
                xnew$1(`<option value="${item}" ${item === initial ? 'selected' : ''}>`, item);
            }
        });
        const button = xnew$1(`<div style="height: 2em; padding: 0 1.5em 0 0.5em; display: flex; align-items: center; border: 1px solid currentColor; border-radius: 0.25em; cursor: pointer; user-select: none; min-width: 3em; white-space: nowrap;">`, initial);
        xnew$1((unit) => {
            xnew$1.extend(SVG, { viewBox: '0 0 12 12', stroke: 'currentColor', strokeWidth: 2, style: 'position: absolute; right: 1.0em; width: 0.75em; height: 0.75em; pointer-events: none;' });
            xnew$1('<path d="M2 4 6 8 10 4" />');
        });
        button.on('click', () => {
            xnew$1((list) => {
                xnew$1(OpenAndClose, { open: false });
                xnew$1.extend(Popup);
                xnew$1.nest('<div style="position: absolute; padding: 0.25em 0;">');
                list.on('render', () => {
                    const rect = button.element.getBoundingClientRect();
                    list.element.style.right = (window.innerWidth - rect.right) + 'px';
                    list.element.style.top = rect.bottom + 'px';
                    list.element.style.background = getEffectiveBg(button.element);
                });
                xnew$1.extend(Accordion);
                xnew$1.nest(`<div style="position: relative; border: 1px solid currentColor; border-radius: 0.25em; overflow: hidden;">`);
                for (const item of items) {
                    const div = xnew$1(`<div style="height: 2em; padding: 0 0.5em; display: flex; align-items: center; cursor: pointer; user-select: none;">`, item);
                    div.on('pointerover', () => div.element.style.background = paleColor$1);
                    div.on('pointerout', () => div.element.style.background = '');
                    div.on('click', () => {
                        button.element.textContent = item;
                        native.element.value = item;
                        native.element.dispatchEvent(new Event('input', { bubbles: false }));
                        list.finalize();
                    });
                }
                list.on('click.outside', () => list.finalize());
            });
        });
        xnew$1.nest(native.element);
        function getEffectiveBg(element) {
            let current = element.parentElement;
            while (current) {
                const bg = getComputedStyle(current).backgroundColor;
                if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent')
                    return bg;
                current = current.parentElement;
            }
            return 'Canvas';
        }
    }

    function Scene(unit) {
        return {
            change(Component, props) {
                xnew$1(unit.parent, Component, props);
                unit.finalize();
            },
            add(Component, props) {
                xnew$1(unit, Component, props);
            }
        };
    }

    const DEFAULT_MASTER_GAIN = 0.1;
    const DEFAULT_BPM = 120;
    const RELEASE_CLEANUP_DELAY_MS = 2000;
    const context = typeof window !== 'undefined' ? new window.AudioContext() : null;
    const master = context !== null ? context.createGain() : null;
    if (context !== null && master !== null) {
        master.gain.value = DEFAULT_MASTER_GAIN;
        master.connect(context.destination);
    }
    class AudioTrack {
        constructor(path) {
            this.promise = fetch(path)
                .then((response) => response.arrayBuffer())
                .then((response) => context.decodeAudioData(response))
                .then((response) => { this.buffer = response; });
            this.amp = context.createGain();
            this.amp.gain.value = 1.0;
            this.amp.connect(master);
            this.fade = context.createGain();
            this.fade.gain.value = 1.0;
            this.fade.connect(this.amp);
            this.source = null;
            this.startedAt = null;
            this.pausedOffsetMs = 0;
            this.loop = false;
        }
        get isPlaying() {
            return this.startedAt !== null;
        }
        get isLoaded() {
            return this.buffer !== undefined;
        }
        set volume(value) {
            this.amp.gain.value = value;
        }
        get volume() {
            return this.amp.gain.value;
        }
        play({ offset, fade = 0, loop } = {}) {
            if (this.buffer === undefined) {
                throw new Error('AudioTrack.play(): buffer is not loaded yet. Await `promise` first.');
            }
            if (this.startedAt !== null) {
                return;
            }
            if (loop !== undefined) {
                this.loop = loop;
            }
            this.startSource(offset !== null && offset !== void 0 ? offset : this.pausedOffsetMs, fade);
        }
        pause({ fade = 0 } = {}) {
            if (this.buffer === undefined || this.startedAt === null) {
                return;
            }
            const elapsedSec = context.currentTime - this.startedAt;
            const positionSec = this.loop ? elapsedSec % this.buffer.duration : Math.min(elapsedSec, this.buffer.duration);
            this.pausedOffsetMs = positionSec * 1000;
            const source = this.source;
            this.source = null;
            this.startedAt = null;
            this.stopSource(source, fade);
        }
        stop({ fade = 0 } = {}) {
            if (this.startedAt !== null) {
                const source = this.source;
                this.source = null;
                this.startedAt = null;
                this.stopSource(source, fade);
            }
            this.pausedOffsetMs = 0;
        }
        clear() {
            this.forceStop();
            this.amp.disconnect();
            this.fade.disconnect();
            this.pausedOffsetMs = 0;
        }
        forceStop() {
            if (this.source !== null) {
                this.source.onended = null;
                try {
                    this.source.stop();
                }
                catch (_a) {
                }
                this.source.disconnect();
                this.source = null;
            }
            this.startedAt = null;
        }
        startSource(offsetMs, fadeMs) {
            const source = context.createBufferSource();
            this.source = source;
            source.buffer = this.buffer;
            source.loop = this.loop;
            source.connect(this.fade);
            const now = context.currentTime;
            this.startedAt = now - offsetMs / 1000;
            source.start(now, offsetMs / 1000);
            if (fadeMs > 0) {
                this.fade.gain.setValueAtTime(0, now);
                this.fade.gain.linearRampToValueAtTime(1.0, now + fadeMs / 1000);
            }
            source.onended = () => {
                source.disconnect();
                if (this.source === source) {
                    this.source = null;
                    this.startedAt = null;
                    this.pausedOffsetMs = 0;
                }
            };
        }
        stopSource(source, fadeMs) {
            const now = context.currentTime;
            if (fadeMs > 0) {
                this.fade.gain.setValueAtTime(1.0, now);
                this.fade.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
                source.stop(now + fadeMs / 1000);
            }
            else {
                source.stop(now);
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
    function resolveFrequency(value) {
        if (typeof value === 'string') {
            return keymap[value];
        }
        else {
            return value;
        }
    }
    function resolveDurationSeconds(value, bpm) {
        if (typeof value === 'string') {
            return notemap[value] * 60 / bpm;
        }
        else if (typeof value === 'number') {
            return value / 1000;
        }
        else {
            return 0;
        }
    }
    function semitoneOffset(baseFreq, amount) {
        return baseFreq * (Math.pow(2.0, amount / 12.0) - 1.0);
    }
    function scheduleAttackDecay(param, start, base, amount, ADSR) {
        const [a, d, s] = ADSR;
        param.value = base;
        param.setValueAtTime(base, start);
        param.linearRampToValueAtTime(base + amount, start + a / 1000);
        param.linearRampToValueAtTime(base + amount * s, start + (a + d) / 1000);
    }
    function scheduleRelease(param, start, dv, base, amount, ADSR) {
        const [a, d, s, r] = ADSR;
        const end = dv > 0 ? dv : (context.currentTime - start);
        const rate = a === 0 ? 1.0 : Math.min(end / (a / 1000), 1.0);
        if (rate < 1.0) {
            param.cancelScheduledValues(start);
            param.setValueAtTime(base, start);
            param.linearRampToValueAtTime(base + amount * rate, start + (a / 1000) * rate);
            param.linearRampToValueAtTime(base + amount * rate * s, start + ((a + d) / 1000) * rate);
        }
        param.linearRampToValueAtTime(base + amount * rate * s, start + Math.max(((a + d) / 1000) * rate, dv));
        param.linearRampToValueAtTime(base, start + Math.max(((a + d) / 1000) * rate, end) + r / 1000);
    }
    function createImpulseResponse(timeMs, decay = 2.0) {
        const length = context.sampleRate * timeMs / 1000;
        const impulse = context.createBuffer(2, length, context.sampleRate);
        const ch0 = impulse.getChannelData(0);
        const ch1 = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
            const k = Math.pow(1 - i / length, decay);
            ch0[i] = (2 * Math.random() - 1) * k;
            ch1[i] = (2 * Math.random() - 1) * k;
        }
        return impulse;
    }
    function attachLFO(target, baseFreq, lfo, start) {
        const oscillator = context.createOscillator();
        const depth = context.createGain();
        depth.gain.value = semitoneOffset(baseFreq, lfo.amount);
        oscillator.type = lfo.type;
        oscillator.frequency.value = lfo.rate;
        oscillator.start(start);
        oscillator.connect(depth);
        depth.connect(target.frequency);
        return { oscillator, depth };
    }
    function attachReverb(amp, target, reverb) {
        const convolver = context.createConvolver();
        convolver.buffer = createImpulseResponse(reverb.time);
        const depth = context.createGain();
        depth.gain.value = reverb.mix;
        target.gain.value *= (1.0 - reverb.mix);
        amp.connect(convolver);
        convolver.connect(depth);
        depth.connect(master);
        return { convolver, depth };
    }
    class Synthesizer {
        constructor(props) { this.props = props; }
        press(frequency, duration, wait) {
            var _a;
            const props = this.props;
            const freq = resolveFrequency(frequency);
            const dv = resolveDurationSeconds(duration, (_a = props.bpm) !== null && _a !== void 0 ? _a : DEFAULT_BPM);
            const start = context.currentTime + (wait !== null && wait !== void 0 ? wait : 0) / 1000;
            const oscillator = context.createOscillator();
            oscillator.type = props.oscillator.type;
            oscillator.frequency.value = freq;
            const lfo = props.oscillator.LFO ? attachLFO(oscillator, freq, props.oscillator.LFO, start) : null;
            const amp = context.createGain();
            amp.gain.value = 0.0;
            const target = context.createGain();
            target.gain.value = 1.0;
            amp.connect(target);
            target.connect(master);
            let filter = null;
            if (props.filter) {
                filter = context.createBiquadFilter();
                filter.type = props.filter.type;
                filter.frequency.value = props.filter.cutoff;
                oscillator.connect(filter);
                filter.connect(amp);
            }
            else {
                oscillator.connect(amp);
            }
            const reverb = props.reverb ? attachReverb(amp, target, props.reverb) : null;
            if (props.oscillator.envelope) {
                const amount = semitoneOffset(freq, props.oscillator.envelope.amount);
                scheduleAttackDecay(oscillator.frequency, start, freq, amount, props.oscillator.envelope.ADSR);
            }
            if (props.amp.envelope) {
                scheduleAttackDecay(amp.gain, start, 0.0, props.amp.envelope.amount, props.amp.envelope.ADSR);
            }
            oscillator.start(start);
            const oscillators = [oscillator];
            const nodesToDisconnect = [oscillator, amp, target];
            if (lfo) {
                oscillators.push(lfo.oscillator);
                nodesToDisconnect.push(lfo.oscillator, lfo.depth);
            }
            if (filter) {
                nodesToDisconnect.push(filter);
            }
            if (reverb) {
                nodesToDisconnect.push(reverb.convolver, reverb.depth);
            }
            const release = () => {
                const end = dv > 0 ? dv : (context.currentTime - start);
                let stop;
                if (props.amp.envelope) {
                    const [a, d, , r] = props.amp.envelope.ADSR;
                    const aSec = a / 1000;
                    const dSec = d / 1000;
                    const rSec = r / 1000;
                    const rate = aSec === 0.0 ? 1.0 : Math.min(end / (aSec + 0.001), 1.0);
                    stop = start + Math.max((aSec + dSec) * rate, end) + rSec;
                }
                else {
                    stop = start + end;
                }
                if (props.oscillator.envelope) {
                    const amount = semitoneOffset(freq, props.oscillator.envelope.amount);
                    scheduleRelease(oscillator.frequency, start, dv, freq, amount, props.oscillator.envelope.ADSR);
                }
                if (props.amp.envelope) {
                    scheduleRelease(amp.gain, start, dv, 0.0, props.amp.envelope.amount, props.amp.envelope.ADSR);
                }
                for (const o of oscillators) {
                    o.stop(stop);
                }
                setTimeout(() => {
                    for (const n of nodesToDisconnect) {
                        n.disconnect();
                    }
                }, RELEASE_CLEANUP_DELAY_MS);
            };
            if (dv > 0) {
                release();
            }
            else {
                return { release };
            }
        }
    }

    const paleColor = 'color-mix(in srgb, currentColor 20%, transparent)';
    function SpeakerIcon(unit, { muted = false } = {}) {
        xnew$1.extend(SVG, { viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.5 });
        const path = muted
            ? 'M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9 9 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25z'
            : 'M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9 9 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25z';
        xnew$1(`<path d="${path}" />`);
    }
    function VolumeController(unit, { anchor = 'left' } = {}) {
        xnew$1.extend(Aspect, { aspect: 1.0, fit: 'contain' });
        unit.on('pointerdown', ({ event }) => event.stopPropagation());
        const system = xnew$1(OpenAndClose, { open: false, transition: { duration: 250, easing: 'ease' } });
        const button = xnew$1((unit) => {
            xnew$1.nest('<div style="width: 100%; height: 100%; cursor: pointer;">');
            unit.on('click', () => system.toggle());
            let icon = xnew$1(SpeakerIcon, { muted: master.gain.value === 0 });
            return {
                update() {
                    icon === null || icon === void 0 ? void 0 : icon.finalize();
                    icon = xnew$1(SpeakerIcon, { muted: master.gain.value === 0 });
                }
            };
        });
        xnew$1(() => {
            const isHoriz = anchor === 'left' || anchor === 'right';
            const unit = isHoriz ? 'cqw' : 'cqh';
            const fillProp = isHoriz ? 'width' : 'height';
            const pct = master.gain.value * 100;
            const outerSize = isHoriz ? `top: 20%; bottom: 20%; width: 0${unit}` : `left: 20%; right: 20%; height: 0${unit}`;
            const fillSize = isHoriz ? `top: 0; left: 0; bottom: 0; width: ${pct}%; height: 100%` : `bottom: 0; left: 0; right: 0; width: 100%; height: ${pct}%`;
            const outer = xnew$1.nest(`<div style="position: absolute; ${outerSize};">`);
            xnew$1.nest(`<div style="position: relative; width: 100%; height: 100%; border: 1px solid currentColor; border-radius: 0.25em; box-sizing: border-box;">`);
            const fill = xnew$1(`<div style="position: absolute; ${fillSize}; background: ${paleColor};">`);
            const input = xnew$1(`<input type="range" min="0" max="100" value="${pct}" style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; margin: 0;${isHoriz ? '' : ' writing-mode: vertical-lr; direction: rtl;'}">`);
            const css = (el) => el.style;
            input.on('input', ({ event }) => {
                const v = Number(event.target.value);
                css(fill.element)[fillProp] = `${v}%`;
                master.gain.value = v / 100;
                button.update();
            });
            system.on('-transition', ({ value }) => {
                css(outer)[anchor] = `-${value * 400 + 20}${unit}`;
                css(outer)[fillProp] = `${value * 400}${unit}`;
                outer.style.opacity = value.toString();
                outer.style.pointerEvents = value < 0.9 ? 'none' : 'auto';
            });
        });
        unit.on('click.outside', () => system.close());
    }

    class ImageData {
        constructor(...args) {
            if (args[0] instanceof HTMLCanvasElement) {
                this.canvas = args[0];
            }
            else {
                const canvas = document.createElement('canvas');
                canvas.width = args[0];
                canvas.height = args[1];
                this.canvas = canvas;
            }
        }
        crop(x, y, width, height) {
            var _a;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            (_a = canvas.getContext('2d')) === null || _a === void 0 ? void 0 : _a.drawImage(this.canvas, x, y, width, height, 0, 0, width, height);
            return new ImageData(canvas);
        }
        download(filename) {
            const link = document.createElement('a');
            link.download = filename;
            link.href = this.canvas.toDataURL('image/png');
            link.click();
        }
    }

    const basics = {
        SVG,
        SVGText,
        Screen,
        OpenAndClose,
        AnalogStick,
        DPad,
        Panel,
        Accordion,
        Popup,
        Scene,
        VolumeController,
    };
    const audio = {
        AudioTrack,
        load(path) {
            const music = new AudioTrack(path);
            xnew().on('finalize', () => music.pause({ fade: 500 }));
            return xnew.promise(music.promise).then(() => music);
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
    const image = {
        from(canvas) {
            return new ImageData(canvas);
        }
    };
    const xnew = Object.assign(xnew$1, { basics, audio, image });

    return xnew;

}));
