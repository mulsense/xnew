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
        ticker();
        function ticker() {
            const delta = Date.now() - previous;
            if (delta > (1000 / fps) * 0.9) {
                callback();
                previous += delta;
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
class Timer {
    constructor(options) {
        var _a, _b;
        this.options = options;
        this.id = null;
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
            else if (this.options.easing === 'ease') {
                p = (1.0 - Math.cos(p * Math.PI)) / 2.0; // todo
            }
            else if (this.options.easing === 'ease-in-out') {
                p = (1.0 - Math.cos(p * Math.PI)) / 2.0;
            }
            (_b = (_a = this.options).transition) === null || _b === void 0 ? void 0 : _b.call(_a, p);
        });
        this.visibilitychange = () => document.hidden === false ? this._start() : this._stop();
        document.addEventListener('visibilitychange', this.visibilitychange);
        (_b = (_a = this.options).transition) === null || _b === void 0 ? void 0 : _b.call(_a, 0.0);
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
                var _a, _b, _c, _d;
                (_b = (_a = this.options).transition) === null || _b === void 0 ? void 0 : _b.call(_a, 1.0);
                (_d = (_c = this.options).timeout) === null || _d === void 0 ? void 0 : _d.call(_c);
                this.id = null;
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
        if (this.status === 1 && this.id !== null) {
            this.offset = this.offset + Date.now() - this.time;
            clearTimeout(this.id);
            this.id = null;
            this.time = 0.0;
        }
    }
}

const SYSTEM_EVENTS = ['start', 'update', 'render', 'stop', 'finalize'];

class EventManager {
    constructor() {
        this.map = new MapMap();
    }
    add(props) {
        let finalize;
        if (props.type === 'resize') {
            finalize = this.resize(props);
        }
        else if (props.type === 'wheel') {
            finalize = this.wheel(props);
        }
        else if (props.type === 'click') {
            finalize = this.click(props);
        }
        else if (props.type === 'click.outside') {
            finalize = this.click_outside(props);
        }
        else if (['pointerdown', 'pointermove', 'pointerup', 'pointerover', 'pointerout'].includes(props.type)) {
            finalize = this.pointer(props);
        }
        else if (['pointerdown.outside', 'pointermove.outside', 'pointerup.outside'].includes(props.type)) {
            finalize = this.pointer_outside(props);
        }
        else if (['mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout'].includes(props.type)) {
            finalize = this.mouse(props);
        }
        else if (['touchstart', 'touchmove', 'touchend', 'touchcancel'].includes(props.type)) {
            finalize = this.touch(props);
        }
        else if (['dragstart', 'dragmove', 'dragend'].includes(props.type)) {
            finalize = this.drag(props);
        }
        else if (['gesturestart', 'gesturemove', 'gestureend'].includes(props.type)) {
            finalize = this.gesture(props);
        }
        else if (['keydown', 'keyup'].includes(props.type)) {
            finalize = this.key(props);
        }
        else if (['keydown.arrow', 'keyup.arrow'].includes(props.type)) {
            finalize = this.key_arrow(props);
        }
        else {
            finalize = this.basic(props);
        }
        this.map.set(props.type, props.listener, finalize);
    }
    remove({ type, listener }) {
        const finalize = this.map.get(type, listener);
        if (finalize) {
            finalize();
            this.map.delete(type, listener);
        }
    }
    basic(props) {
        const execute = (event) => {
            props.listener({ event, type: event.type });
        };
        props.element.addEventListener(props.type, execute, props.options);
        return () => {
            props.element.removeEventListener(props.type, execute);
        };
    }
    resize(props) {
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                props.listener({ type: 'resize' });
                break;
            }
        });
        observer.observe(props.element);
        return () => {
            observer.unobserve(props.element);
        };
    }
    click(props) {
        const execute = (event) => {
            props.listener({ event, type: props.type, position: pointer(props.element, event).position });
        };
        props.element.addEventListener(props.type, execute, props.options);
        return () => {
            props.element.removeEventListener(props.type, execute);
        };
    }
    click_outside(props) {
        const execute = (event) => {
            if (props.element.contains(event.target) === false) {
                props.listener({ event, type: props.type, position: pointer(props.element, event).position });
            }
        };
        document.addEventListener(props.type.split('.')[0], execute, props.options);
        return () => {
            document.removeEventListener(props.type.split('.')[0], execute);
        };
    }
    pointer(props) {
        const execute = (event) => {
            props.listener({ event, type: props.type, position: pointer(props.element, event).position });
        };
        props.element.addEventListener(props.type, execute, props.options);
        return () => {
            props.element.removeEventListener(props.type, execute);
        };
    }
    mouse(props) {
        const execute = (event) => {
            props.listener({ event, type: props.type, position: pointer(props.element, event).position });
        };
        props.element.addEventListener(props.type, execute, props.options);
        return () => {
            props.element.removeEventListener(props.type, execute);
        };
    }
    touch(props) {
        const execute = (event) => {
            props.listener({ event, type: props.type, position: pointer(props.element, event).position });
        };
        props.element.addEventListener(props.type, execute, props.options);
        return () => {
            props.element.removeEventListener(props.type, execute);
        };
    }
    pointer_outside(props) {
        const execute = (event) => {
            if (props.element.contains(event.target) === false) {
                props.listener({ event, type: props.type, position: pointer(props.element, event).position });
            }
        };
        document.addEventListener(props.type.split('.')[0], execute, props.options);
        return () => {
            document.removeEventListener(props.type.split('.')[0], execute);
        };
    }
    wheel(props) {
        const execute = (event) => {
            props.listener({ event, type: props.type, delta: { x: event.wheelDeltaX, y: event.wheelDeltaY } });
        };
        props.element.addEventListener(props.type, execute, props.options);
        return () => {
            props.element.removeEventListener(props.type, execute);
        };
    }
    drag(props) {
        let pointermove = null;
        let pointerup = null;
        let pointercancel = null;
        const pointerdown = (event) => {
            const id = event.pointerId;
            const position = pointer(props.element, event).position;
            let previous = position;
            pointermove = (event) => {
                if (event.pointerId === id) {
                    const position = pointer(props.element, event).position;
                    const delta = { x: position.x - previous.x, y: position.y - previous.y };
                    if (props.type === 'dragmove') {
                        props.listener({ event, type: props.type, position, delta });
                    }
                    previous = position;
                }
            };
            pointerup = (event) => {
                if (event.pointerId === id) {
                    const position = pointer(props.element, event).position;
                    if (props.type === 'dragend') {
                        props.listener({ event, type: props.type, position, delta: { x: 0, y: 0 } });
                    }
                    remove();
                }
            };
            pointercancel = (event) => {
                if (event.pointerId === id) {
                    const position = pointer(props.element, event).position;
                    if (props.type === 'dragend') {
                        props.listener({ event, type: props.type, position, delta: { x: 0, y: 0 } });
                    }
                    remove();
                }
            };
            window.addEventListener('pointermove', pointermove);
            window.addEventListener('pointerup', pointerup);
            window.addEventListener('pointercancel', pointercancel);
            if (props.type === 'dragstart') {
                props.listener({ event, type: props.type, position, delta: { x: 0, y: 0 } });
            }
        };
        function remove() {
            if (pointermove)
                window.removeEventListener('pointermove', pointermove);
            if (pointerup)
                window.removeEventListener('pointerup', pointerup);
            if (pointercancel)
                window.removeEventListener('pointercancel', pointercancel);
            pointermove = null;
            pointerup = null;
            pointercancel = null;
        }
        props.element.addEventListener('pointerdown', pointerdown, props.options);
        return () => {
            props.element.removeEventListener('pointerdown', pointerdown);
            remove();
        };
    }
    gesture(props) {
        let isActive = false;
        const map = new Map();
        const element = props.element;
        const options = props.options;
        const dragstart = ({ event, position }) => {
            map.set(event.pointerId, position);
            isActive = map.size === 2 ? true : false;
            if (isActive === true && props.type === 'gesturestart') {
                props.listener({ event, type: props.type });
            }
        };
        const dragmove = ({ event, position, delta }) => {
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
                if (props.type === 'gesturemove') {
                    props.listener({ event, type: props.type, scale });
                }
            }
            map.set(event.pointerId, position);
        };
        const dragend = ({ event }) => {
            map.delete(event.pointerId);
            if (isActive === true && props.type === 'gestureend') {
                props.listener({ event, type: props.type, scale: 1.0 });
            }
            isActive = false;
        };
        this.add({ element, options, type: 'dragstart', listener: dragstart });
        this.add({ element, options, type: 'dragmove', listener: dragmove });
        this.add({ element, options, type: 'dragend', listener: dragend });
        function getOthers(id) {
            const backup = map.get(id);
            map.delete(id);
            const others = [...map.values()];
            map.set(id, backup);
            return others;
        }
        return () => {
            this.remove({ type: 'dragstart', listener: dragstart });
            this.remove({ type: 'dragmove', listener: dragmove });
            this.remove({ type: 'dragend', listener: dragend });
        };
    }
    key(props) {
        const execute = (event) => {
            if (props.type === 'keydown' && event.repeat)
                return;
            props.listener({ event, type: props.type, code: event.code });
        };
        window.addEventListener(props.type, execute, props.options);
        return () => {
            window.removeEventListener(props.type, execute);
        };
    }
    key_arrow(props) {
        const keymap = {};
        const keydown = (event) => {
            if (event.repeat)
                return;
            keymap[event.code] = 1;
            if (props.type === 'keydown.arrow' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
                const vector = {
                    x: (keymap['ArrowLeft'] ? -1 : 0) + (keymap['ArrowRight'] ? +1 : 0),
                    y: (keymap['ArrowUp'] ? -1 : 0) + (keymap['ArrowDown'] ? +1 : 0)
                };
                props.listener({ event, type: props.type, code: event.code, vector });
            }
        };
        const keyup = (event) => {
            keymap[event.code] = 0;
            if (props.type === 'keyup.arrow' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
                const vector = {
                    x: (keymap['ArrowLeft'] ? -1 : 0) + (keymap['ArrowRight'] ? +1 : 0),
                    y: (keymap['ArrowUp'] ? -1 : 0) + (keymap['ArrowDown'] ? +1 : 0)
                };
                props.listener({ event, type: props.type, code: event.code, vector });
            }
        };
        window.addEventListener('keydown', keydown, props.options);
        window.addEventListener('keyup', keyup, props.options);
        return () => {
            window.removeEventListener('keydown', keydown);
            window.removeEventListener('keyup', keyup);
        };
    }
}
function pointer(element, event) {
    const rect = element.getBoundingClientRect();
    const position = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    return { position };
}

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
    static initialize(unit, anchor) {
        var _a, _b;
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
            ancestors: [...(unit._.parent ? [unit._.parent] : []), ...((_b = (_a = unit._.parent) === null || _a === void 0 ? void 0 : _a._.ancestors) !== null && _b !== void 0 ? _b : [])],
            children: [],
            elements: [],
            promises: [],
            components: [],
            listeners: new MapMap(),
            defines: {},
            systems: { start: [], update: [], render: [], stop: [], finalize: [] },
            eventManager: new EventManager(),
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
            unit._.children.forEach((child) => child.finalize());
            unit._.systems.finalize.forEach(({ execute }) => execute());
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
            unit._.state = 'finalized';
        }
    }
    static nest(unit, tag) {
        if (unit._.state !== 'invoked') {
            throw new Error('This function can not be called after initialized.');
        }
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
        if (unit._.state !== 'invoked') {
            throw new Error('This function can not be called after initialized.');
        }
        unit._.components.push(component);
        Unit.component2units.add(component, unit);
        const backupComponent = unit._.currentComponent;
        unit._.currentComponent = component;
        const defines = (_a = component(unit, props)) !== null && _a !== void 0 ? _a : {};
        unit._.currentComponent = backupComponent;
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
    static wrap(unit, listener) {
        const snapshot = Unit.snapshot(unit);
        return (...args) => Unit.scope(snapshot, listener, ...args);
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
        if (SYSTEM_EVENTS.includes(type)) {
            unit._.systems[type].push({ listener, execute: Unit.wrap(Unit.currentUnit, listener) });
        }
        if (unit._.listeners.has(type, listener) === false) {
            const execute = Unit.wrap(Unit.currentUnit, listener);
            unit._.listeners.set(type, listener, { element: unit.element, component: unit._.currentComponent, execute });
            Unit.type2units.add(type, unit);
            if (/^[A-Za-z]/.test(type)) {
                unit._.eventManager.add({ element: unit.element, type, listener: execute, options });
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
                unit._.eventManager.remove({ type, listener: item.execute });
            }
        });
        if (unit._.listeners.has(type) === false) {
            Unit.type2units.delete(type, unit);
        }
    }
    static emit(type, ...args) {
        var _a, _b;
        const current = Unit.currentUnit;
        if (type[0] === '+') {
            (_a = Unit.type2units.get(type)) === null || _a === void 0 ? void 0 : _a.forEach((unit) => {
                var _a;
                const find = [unit, ...unit._.ancestors].find(u => u._.protected === true);
                if (find === undefined || current._.ancestors.includes(find) === true || current === find) {
                    (_a = unit._.listeners.get(type)) === null || _a === void 0 ? void 0 : _a.forEach((item) => item.execute(...args));
                }
            });
        }
        else if (type[0] === '-') {
            (_b = current._.listeners.get(type)) === null || _b === void 0 ? void 0 : _b.forEach((item) => item.execute(...args));
        }
    }
}
Unit.currentComponent = () => { };
Unit.component2units = new MapSet();
//----------------------------------------------------------------------------------------------------
// event
//----------------------------------------------------------------------------------------------------
Unit.type2units = new MapSet();
//----------------------------------------------------------------------------------------------------
// unit promise
//----------------------------------------------------------------------------------------------------
class UnitPromise {
    constructor(promise, component) {
        this.promise = promise;
        this.component = component;
    }
    then(callback) {
        this.promise = this.promise.then(Unit.wrap(Unit.currentUnit, callback));
        return this;
    }
    catch(callback) {
        this.promise = this.promise.catch(Unit.wrap(Unit.currentUnit, callback));
        return this;
    }
    finally(callback) {
        this.promise = this.promise.finally(Unit.wrap(Unit.currentUnit, callback));
        return this;
    }
}
//----------------------------------------------------------------------------------------------------
// unit timer
//----------------------------------------------------------------------------------------------------
class UnitTimer {
    constructor(options) {
        this.stack = [];
        this.unit = new Unit(Unit.currentUnit, UnitTimer.Component, Object.assign({ snapshot: Unit.snapshot(Unit.currentUnit) }, options));
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
            timer.unit = new Unit(Unit.currentUnit, UnitTimer.Component, Object.assign({ snapshot: Unit.snapshot(Unit.currentUnit) }, options));
        }
        else if (timer.stack.length === 0) {
            timer.stack.push(Object.assign({ snapshot: Unit.snapshot(Unit.currentUnit) }, options));
            timer.unit.on('finalize', () => { UnitTimer.next(timer); });
        }
        else {
            timer.stack.push(Object.assign({ snapshot: Unit.snapshot(Unit.currentUnit) }, options));
        }
    }
    static next(timer) {
        if (timer.stack.length > 0) {
            timer.unit = new Unit(Unit.currentUnit, UnitTimer.Component, timer.stack.shift());
            timer.unit.on('finalize', () => { UnitTimer.next(timer); });
        }
    }
    static Component(unit, options) {
        let counter = 0;
        const timer = new Timer({
            transition: (p) => {
                if (options.transition)
                    Unit.scope(options.snapshot, options.transition, p);
            },
            timeout: () => {
                if (options.transition)
                    Unit.scope(options.snapshot, options.transition, 1.0);
                if (options.timeout)
                    Unit.scope(options.snapshot, options.timeout);
                if (options.iterations && counter >= options.iterations - 1) {
                    unit.finalize();
                }
                counter++;
            }, duration: options.duration, iterations: options.iterations, easing: options.easing
        });
        unit.on('finalize', () => timer.clear());
    }
}

const xnew$1 = Object.assign(function (...args) {
    if (Unit.rootUnit === undefined) {
        Unit.reset();
    }
    return new Unit(Unit.currentUnit, ...args);
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
        try {
            return Unit.nest(Unit.currentUnit, tag);
        }
        catch (error) {
            console.error('xnew.nest(tag: string): ', error);
            throw error;
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
        try {
            return Unit.extend(Unit.currentUnit, component, props);
        }
        catch (error) {
            console.error('xnew.extend(component: Function, props?: Object): ', error);
            throw error;
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
            return Unit.context(Unit.currentUnit, key, value);
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
    protect() {
        Unit.currentUnit._.protected = true;
    }
});

function AccordionFrame(frame, { open = false, duration = 200, easing = 'ease' } = {}) {
    const internal = xnew$1((internal) => {
        return {
            frame, open, rate: 0.0,
            transition(rate) {
                xnew$1.emit('-transition', { rate });
            }
        };
    });
    xnew$1.context('xnew.accordionframe', internal);
    internal.on('-transition', ({ rate }) => internal.rate = rate);
    internal.transition(open ? 1.0 : 0.0);
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
                xnew$1.transition((x) => internal.transition(x), duration, easing);
            }
        },
        close() {
            if (internal.rate === 1.0) {
                xnew$1.transition((x) => internal.transition(1.0 - x), duration, easing);
            }
        }
    };
}
function AccordionHeader(unit, {} = {}) {
    const internal = xnew$1.context('xnew.accordionframe');
    xnew$1.nest('<button style="display: flex; align-items: center; margin: 0; padding: 0; width: 100%; text-align: left; border: none; font: inherit; color: inherit; background: none; cursor: pointer;">');
    unit.on('click', () => internal.frame.toggle());
}
function AccordionBullet(unit, { type = 'arrow' } = {}) {
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
function AccordionContent(unit, {} = {}) {
    const internal = xnew$1.context('xnew.accordionframe');
    xnew$1.nest(`<div style="display: ${internal.open ? 'block' : 'none'};">`);
    xnew$1.nest('<div style="padding: 0; display: flex; flex-direction: column; box-sizing: border-box;">');
    internal.on('-transition', ({ rate }) => {
        unit.transition({ element: unit.element, rate });
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

function Screen(unit, { width = 640, height = 480, fit = 'contain' } = {}) {
    const size = { width, height };
    const wrapper = xnew$1.nest('<div style="position: relative; width: 100%; height: 100%; overflow: hidden;">');
    unit.on('resize', resize);
    const absolute = xnew$1.nest('<div style="position: absolute; margin: auto; container-type: size; overflow: hidden;">');
    const canvas = xnew$1(`<canvas width="${width}" height="${height}" style="width: 100%; height: 100%; vertical-align: bottom; user-select: none; user-drag: none; pointer-events: auto;">`);
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
        return {
            emit(type, ...args) { xnew$1.emit(type, ...args); }
        };
    });
    xnew$1.context('xnew.modalframe', internal);
    xnew$1.nest('<div style="position: fixed; inset: 0; z-index: 1000;">');
    xnew$1().on('click', (event) => frame.close());
    xnew$1.transition((x) => internal.emit('-transition', { rate: x }), duration, easing);
    return {
        close() {
            xnew$1.transition((x) => internal.emit('-transition', { rate: 1.0 - x }), duration, easing)
                .timeout(() => frame.finalize());
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
        return {
            frame, buttons, contents,
            emit(type, ...args) { xnew$1.emit(type, ...args); }
        };
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
function DragTarget(unit, {} = {}) {
    const { frame, absolute } = xnew$1.context('xnew.dragframe');
    const target = xnew$1(absolute.parentElement);
    const current = { x: 0, y: 0 };
    const offset = { x: 0, y: 0 };
    let dragged = false;
    target.on('dragstart', ({ event, position }) => {
        if (unit.element.contains(event.target) === false)
            return;
        dragged = true;
        offset.x = position.x - parseFloat(absolute.style.left || '0');
        offset.y = position.y - parseFloat(absolute.style.top || '0');
        current.x = position.x - offset.x;
        current.y = position.y - offset.y;
    });
    target.on('dragmove', ({ event, delta }) => {
        if (dragged !== true)
            return;
        current.x += delta.x;
        current.y += delta.y;
        absolute.style.left = `${current.x}px`;
        absolute.style.top = `${current.y}px`;
    });
    target.on('dragend', ({ event }) => {
        dragged = false;
    });
    xnew$1.nest('<div>');
}

//----------------------------------------------------------------------------------------------------
// controller
//----------------------------------------------------------------------------------------------------
function SVGTemplate(self, { stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round', fill = null, fillOpacity = 0.8 }) {
    xnew$1.nest(`<svg
        viewBox="0 0 100 100"
        style="position: absolute; width: 100%; height: 100%; select: none;
        stroke: ${stroke}; stroke-opacity: ${strokeOpacity}; stroke-width: ${strokeWidth}; stroke-linejoin: ${strokeLinejoin};
        ${fill ? `fill: ${fill}; fill-opacity: ${fillOpacity};` : ''}
    ">`);
}
function AnalogStick(unit, { stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round', fill = '#FFF', fillOpacity = 0.8 } = {}) {
    const outer = xnew$1.nest(`<div style="position: relative; width: 100%; height: 100%;">`);
    const internal = xnew$1((unit) => {
        let newsize = Math.min(outer.clientWidth, outer.clientHeight);
        const inner = xnew$1.nest(`<div style="position: absolute; width: ${newsize}px; height: ${newsize}px; margin: auto; inset: 0; cursor: pointer; pointer-select: none; pointer-events: auto; overflow: hidden;">`);
        xnew$1(outer).on('resize', () => {
            newsize = Math.min(outer.clientWidth, outer.clientHeight);
            inner.style.width = `${newsize}px`;
            inner.style.height = `${newsize}px`;
        });
        xnew$1((unit) => {
            xnew$1.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
            xnew$1('<polygon points="50  7 40 18 60 18">');
            xnew$1('<polygon points="50 93 40 83 60 83">');
            xnew$1('<polygon points=" 7 50 18 40 18 60">');
            xnew$1('<polygon points="93 50 83 40 83 60">');
        });
        const target = xnew$1((unit) => {
            xnew$1.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
            xnew$1('<circle cx="50" cy="50" r="23">');
        });
        unit.on('dragstart', ({ event, position }) => {
            const vector = getVector(position);
            target.element.style.filter = 'brightness(90%)';
            target.element.style.left = vector.x * newsize / 4 + 'px';
            target.element.style.top = vector.y * newsize / 4 + 'px';
            xnew$1.emit('-down', { vector });
        });
        unit.on('dragmove', ({ event, position }) => {
            const vector = getVector(position);
            target.element.style.filter = 'brightness(90%)';
            target.element.style.left = vector.x * newsize / 4 + 'px';
            target.element.style.top = vector.y * newsize / 4 + 'px';
            xnew$1.emit('-move', { vector });
        });
        unit.on('dragend', ({ event }) => {
            const vector = { x: 0, y: 0 };
            target.element.style.filter = '';
            target.element.style.left = vector.x * newsize / 4 + 'px';
            target.element.style.top = vector.y * newsize / 4 + 'px';
            xnew$1.emit('-up', { vector });
        });
        function getVector(position) {
            const x = position.x - newsize / 2;
            const y = position.y - newsize / 2;
            const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (newsize / 4));
            const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
            return { x: Math.cos(a) * d, y: Math.sin(a) * d };
        }
    });
    internal.on('-down', (...args) => xnew$1.emit('-down', ...args));
    internal.on('-move', (...args) => xnew$1.emit('-move', ...args));
    internal.on('-up', (...args) => xnew$1.emit('-up', ...args));
}
function DirectionalPad(unit, { diagonal = true, stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round', fill = '#FFF', fillOpacity = 0.8 } = {}) {
    const outer = xnew$1.nest(`<div style="position: relative; width: 100%; height: 100%;">`);
    const internal = xnew$1((unit) => {
        let newsize = Math.min(outer.clientWidth, outer.clientHeight);
        const inner = xnew$1.nest(`<div style="position: absolute; width: ${newsize}px; height: ${newsize}px; margin: auto; inset: 0; cursor: pointer; pointer-select: none; pointer-events: auto; overflow: hidden;">`);
        xnew$1(outer).on('resize', () => {
            newsize = Math.min(outer.clientWidth, outer.clientHeight);
            inner.style.width = `${newsize}px`;
            inner.style.height = `${newsize}px`;
        });
        const polygons = [
            '<polygon points="50 50 35 35 35  5 37  3 63  3 65  5 65 35">',
            '<polygon points="50 50 35 65 35 95 37 97 63 97 65 95 65 65">',
            '<polygon points="50 50 35 35  5 35  3 37  3 63  5 65 35 65">',
            '<polygon points="50 50 65 35 95 35 97 37 97 63 95 65 65 65">'
        ];
        const targets = polygons.map((polygon) => {
            return xnew$1((unit) => {
                xnew$1.extend(SVGTemplate, { stroke: 'none', fill, fillOpacity });
                xnew$1(polygon);
            });
        });
        xnew$1((unit) => {
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
        unit.on('dragstart', ({ event, position }) => {
            const vector = getVector(position);
            targets[0].element.style.filter = (vector.y < 0) ? 'brightness(90%)' : '';
            targets[1].element.style.filter = (vector.y > 0) ? 'brightness(90%)' : '';
            targets[2].element.style.filter = (vector.x < 0) ? 'brightness(90%)' : '';
            targets[3].element.style.filter = (vector.x > 0) ? 'brightness(90%)' : '';
            xnew$1.emit('-down', { vector });
        });
        unit.on('dragmove', ({ event, position }) => {
            const vector = getVector(position);
            targets[0].element.style.filter = (vector.y < 0) ? 'brightness(90%)' : '';
            targets[1].element.style.filter = (vector.y > 0) ? 'brightness(90%)' : '';
            targets[2].element.style.filter = (vector.x < 0) ? 'brightness(90%)' : '';
            targets[3].element.style.filter = (vector.x > 0) ? 'brightness(90%)' : '';
            xnew$1.emit('-move', { vector });
        });
        unit.on('dragend', ({ event }) => {
            const vector = { x: 0, y: 0 };
            targets[0].element.style.filter = '';
            targets[1].element.style.filter = '';
            targets[2].element.style.filter = '';
            targets[3].element.style.filter = '';
            xnew$1.emit('-up', { vector });
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
    internal.on('-down', (...args) => xnew$1.emit('-down', ...args));
    internal.on('-move', (...args) => xnew$1.emit('-move', ...args));
    internal.on('-up', (...args) => xnew$1.emit('-up', ...args));
}

function TextStream(unit, { text = '', speed = 50, fade = 300 } = {}) {
    const chars = [];
    for (let i = 0; i < text.length; i++) {
        const unit = xnew$1('<span>');
        unit.element.textContent = text[i];
        unit.element.style.opacity = '0';
        unit.element.style.transition = `opacity ${fade}ms ease-in-out`;
        chars.push(unit);
    }
    let start = 0;
    unit.on('start', () => {
        start = new Date().getTime();
    });
    let state = 0;
    unit.on('update', () => {
        const index = Math.floor((new Date().getTime() - start) / speed);
        // Display characters up to the current index (fade in)
        for (let i = 0; i < chars.length; i++) {
            if (i <= index) {
                chars[i].element.style.opacity = '1';
            }
        }
        if (state === 0 && index >= text.length) {
            action();
        }
    });
    xnew$1.timeout(() => {
        xnew$1(document.body).on('click wheel', action);
        unit.on('keydown', action);
    }, 100);
    function action() {
        if (state === 0) {
            state = 1;
            for (let i = 0; i < chars.length; i++) {
                chars[i].element.style.opacity = '1';
            }
            xnew$1.emit('-complete');
        }
        else if (state === 1) {
            state = 2;
            xnew$1.emit('-next');
        }
    }
}

// heroicons
// https://heroicons.com/outline
// MIT License
const icondata = {
    AcademicCap: {
        outline: ['<path d="M4.26 10.147a60 60 0 0 0-.491 6.347A48.6 48.6 0 0 1 12 20.904a48.6 48.6 0 0 1 8.232-4.41a61 61 0 0 0-.491-6.347m-15.482 0a51 51 0 0 0-2.658-.813A60 60 0 0 1 12 3.493a60 60 0 0 1 10.399 5.84q-1.345.372-2.658.814m-15.482 0A51 51 0 0 1 12 13.489a50.7 50.7 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5a.75.75 0 0 0 0 1.5m0 0v-3.675A55 55 0 0 1 12 8.443m-7.007 11.55A5.98 5.98 0 0 0 6.75 15.75v-1.5" />'],
        solid: null
    },
    AdjustmentsHorizontal: {
        outline: ['<path d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />'],
        solid: null
    },
    AdjustmentsVertical: {
        outline: ['<path d="M6 13.5V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 9.75V10.5" />'],
        solid: null
    },
    ArchiveBox: {
        outline: ['<path d="m20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125" />'],
        solid: null
    },
    ArchiveBoxArrowDown: {
        outline: ['<path d="m20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125" />'],
        solid: null
    },
    ArchiveBoxXMark: {
        outline: ['<path d="m20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125" />'],
        solid: null
    },
    ArrowDown: {
        outline: ['<path d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />'],
        solid: null
    },
    ArrowDownCircle: {
        outline: ['<path d="m9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    ArrowDownLeft: {
        outline: ['<path d="m19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25" />'],
        solid: null
    },
    ArrowDownOnSquare: {
        outline: ['<path d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" />'],
        solid: null
    },
    ArrowDownOnSquareStack: {
        outline: ['<path d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75l3 3m0 0l3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />'],
        solid: null
    },
    ArrowDownRight: {
        outline: ['<path d="m4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />'],
        solid: null
    },
    ArrowDownTray: {
        outline: ['<path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />'],
        solid: null
    },
    ArrowLeft: {
        outline: ['<path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />'],
        solid: null
    },
    ArrowLeftCircle: {
        outline: ['<path d="m11.25 9l-3 3m0 0l3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    ArrowLeftEndOnRectangle: {
        outline: ['<path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />'],
        solid: null
    },
    ArrowLeftOnRectangle: {
        outline: ['<path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />'],
        solid: null
    },
    ArrowLeftStartOnRectangle: {
        outline: ['<path d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0l-3-3m0 0l3-3m-3 3H15" />'],
        solid: null
    },
    ArrowLongDown: {
        outline: ['<path d="M15.75 17.25L12 21m0 0l-3.75-3.75M12 21V3" />'],
        solid: null
    },
    ArrowLongLeft: {
        outline: ['<path d="M6.75 15.75L3 12m0 0l3.75-3.75M3 12h18" />'],
        solid: null
    },
    ArrowLongRight: {
        outline: ['<path d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />'],
        solid: null
    },
    ArrowLongUp: {
        outline: ['<path d="M8.25 6.75L12 3m0 0l3.75 3.75M12 3v18" />'],
        solid: null
    },
    ArrowPath: {
        outline: ['<path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />'],
        solid: null
    },
    ArrowPathRoundedSquare: {
        outline: ['<path d="M19.5 12q0-1.848-.138-3.662a4.006 4.006 0 0 0-3.7-3.7a49 49 0 0 0-7.324 0a4.006 4.006 0 0 0-3.7 3.7q-.025.33-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3q0 1.848.138 3.662a4.006 4.006 0 0 0 3.7 3.7a49 49 0 0 0 7.324 0a4.006 4.006 0 0 0 3.7-3.7q.025-.33.046-.662M4.5 12l3 3m-3-3l-3 3" />'],
        solid: null
    },
    ArrowRight: {
        outline: ['<path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />'],
        solid: null
    },
    ArrowRightCircle: {
        outline: ['<path d="m12.75 15l3-3m0 0l-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    ArrowRightEndOnRectangle: {
        outline: ['<path d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25" />'],
        solid: null
    },
    ArrowRightOnRectangle: {
        outline: ['<path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />'],
        solid: null
    },
    ArrowRightStartOnRectangle: {
        outline: ['<path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />'],
        solid: null
    },
    ArrowSmallDown: {
        outline: ['<path d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />'],
        solid: null
    },
    ArrowSmallLeft: {
        outline: ['<path d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" />'],
        solid: null
    },
    ArrowSmallRight: {
        outline: ['<path d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />'],
        solid: null
    },
    ArrowSmallUp: {
        outline: ['<path d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />'],
        solid: null
    },
    ArrowTopRightOnSquare: {
        outline: ['<path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />'],
        solid: null
    },
    ArrowTrendingDown: {
        outline: ['<path d="M2.25 6L9 12.75l4.286-4.286a11.95 11.95 0 0 1 4.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />'],
        solid: null
    },
    ArrowTrendingUp: {
        outline: ['<path d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.942" />'],
        solid: null
    },
    ArrowTurnDownLeft: {
        outline: ['<path d="m7.49 12l-3.75 3.75m0 0l3.75 3.75m-3.75-3.75h16.5V4.499" />'],
        solid: null
    },
    ArrowTurnDownRight: {
        outline: ['<path d="m16.49 12l3.75 3.75m0 0l-3.75 3.75m3.75-3.75H3.74V4.499" />'],
        solid: null
    },
    ArrowTurnLeftDown: {
        outline: ['<path d="m11.99 16.5l-3.75 3.75m0 0L4.49 16.5m3.75 3.75V3.75h11.25" />'],
        solid: null
    },
    ArrowTurnLeftUp: {
        outline: ['<path d="M11.99 7.5L8.24 3.75m0 0L4.49 7.5m3.75-3.75v16.499h11.25" />'],
        solid: null
    },
    ArrowTurnRightDown: {
        outline: ['<path d="m11.99 16.5l3.75 3.75m0 0l3.75-3.75m-3.75 3.75V3.75H4.49" />'],
        solid: null
    },
    ArrowTurnRightUp: {
        outline: ['<path d="m11.99 7.5l3.75-3.75m0 0l3.75 3.75m-3.75-3.75v16.499H4.49" />'],
        solid: null
    },
    ArrowTurnUpLeft: {
        outline: ['<path d="M7.49 12L3.74 8.248m0 0l3.75-3.75m-3.75 3.75h16.5V19.5" />'],
        solid: null
    },
    ArrowTurnUpRight: {
        outline: ['<path d="m16.49 12l3.75-3.751m0 0l-3.75-3.75m3.75 3.75H3.74V19.5" />'],
        solid: null
    },
    ArrowUp: {
        outline: ['<path d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />'],
        solid: null
    },
    ArrowUpCircle: {
        outline: ['<path d="m15 11.25l-3-3m0 0l-3 3m3-3v7.5M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    ArrowUpLeft: {
        outline: ['<path d="m19.5 19.5l-15-15m0 0v11.25m0-11.25h11.25" />'],
        solid: null
    },
    ArrowUpOnSquare: {
        outline: ['<path d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />'],
        solid: null
    },
    ArrowUpOnSquareStack: {
        outline: ['<path d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m0-3l-3-3m0 0l-3 3m3-3v11.25m6-2.25h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />'],
        solid: null
    },
    ArrowUpRight: {
        outline: ['<path d="m4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />'],
        solid: null
    },
    ArrowUpTray: {
        outline: ['<path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />'],
        solid: null
    },
    ArrowUturnDown: {
        outline: ['<path d="m15 15l-6 6m0 0l-6-6m6 6V9a6 6 0 0 1 12 0v3" />'],
        solid: null
    },
    ArrowUturnLeft: {
        outline: ['<path d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 0 1 0 12h-3" />'],
        solid: null
    },
    ArrowUturnRight: {
        outline: ['<path d="m15 15l6-6m0 0l-6-6m6 6H9a6 6 0 0 0 0 12h3" />'],
        solid: null
    },
    ArrowUturnUp: {
        outline: ['<path d="m9 9l6-6m0 0l6 6m-6-6v12a6 6 0 0 1-12 0v-3" />'],
        solid: null
    },
    ArrowsPointingIn: {
        outline: ['<path d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />'],
        solid: null
    },
    ArrowsPointingOut: {
        outline: ['<path d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />'],
        solid: null
    },
    ArrowsRightLeft: {
        outline: ['<path d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />'],
        solid: null
    },
    ArrowsUpDown: {
        outline: ['<path d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />'],
        solid: null
    },
    AtSymbol: {
        outline: ['<path d="M16.5 12a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0m0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25" />'],
        solid: null
    },
    Backspace: {
        outline: ['<path d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.374-6.375a1.125 1.125 0 0 1 0-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-9.284c-.298 0-.585-.119-.795-.33" />'],
        solid: null
    },
    Backward: {
        outline: ['<path d="M21 16.812c0 .863-.933 1.405-1.683.976l-7.108-4.061a1.125 1.125 0 0 1 0-1.954l7.108-4.061A1.125 1.125 0 0 1 21 8.689zm-9.75 0c0 .863-.933 1.405-1.683.976l-7.108-4.061a1.125 1.125 0 0 1 0-1.954l7.108-4.061a1.125 1.125 0 0 1 1.683.977z" />'],
        solid: null
    },
    Banknotes: {
        outline: ['<path d="M2.25 18.75a60 60 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0a3 3 0 0 1 6 0m3 0h.008v.008H18zm-12 0h.008v.008H6z" />'],
        solid: null
    },
    Bars2: {
        outline: ['<path d="M3.75 9h16.5m-16.5 6.75h16.5" />'],
        solid: null
    },
    Bars3: {
        outline: ['<path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />'],
        solid: null
    },
    Bars3BottomLeft: {
        outline: ['<path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />'],
        solid: null
    },
    Bars3BottomRight: {
        outline: ['<path d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" />'],
        solid: null
    },
    Bars3CenterLeft: {
        outline: ['<path d="M3.75 6.75h16.5M3.75 12H12m-8.25 5.25h16.5" />'],
        solid: null
    },
    Bars4: {
        outline: ['<path d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />'],
        solid: null
    },
    BarsArrowDown: {
        outline: ['<path d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" />'],
        solid: null
    },
    BarsArrowUp: {
        outline: ['<path d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />'],
        solid: null
    },
    Battery0: {
        outline: ['<path d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M3.75 18h15A2.25 2.25 0 0 0 21 15.75v-6a2.25 2.25 0 0 0-2.25-2.25h-15A2.25 2.25 0 0 0 1.5 9.75v6A2.25 2.25 0 0 0 3.75 18" />'],
        solid: null
    },
    Battery100: {
        outline: ['<path d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M4.5 10.5H18V15H4.5zM3.75 18h15A2.25 2.25 0 0 0 21 15.75v-6a2.25 2.25 0 0 0-2.25-2.25h-15A2.25 2.25 0 0 0 1.5 9.75v6A2.25 2.25 0 0 0 3.75 18" />'],
        solid: null
    },
    Battery50: {
        outline: ['<path d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M4.5 10.5h6.75V15H4.5zM3.75 18h15A2.25 2.25 0 0 0 21 15.75v-6a2.25 2.25 0 0 0-2.25-2.25h-15A2.25 2.25 0 0 0 1.5 9.75v6A2.25 2.25 0 0 0 3.75 18" />'],
        solid: null
    },
    Beaker: {
        outline: ['<path d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104q-.376.034-.75.082m.75-.082a24.3 24.3 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104q.377.034.75.082M19.8 15.3l-1.57.393A9.07 9.07 0 0 1 12 15a9.07 9.07 0 0 0-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.3 48.3 0 0 1 12 21a48 48 0 0 1-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />'],
        solid: null
    },
    Bell: {
        outline: ['<path d="M14.857 17.082a24 24 0 0 0 5.454-1.31A8.97 8.97 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.97 8.97 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.3 24.3 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />'],
        solid: null
    },
    BellAlert: {
        outline: ['<path d="M14.857 17.082a24 24 0 0 0 5.454-1.31A8.97 8.97 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.97 8.97 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.3 24.3 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.124 7.5A8.97 8.97 0 0 1 5.292 3m13.416 0a8.97 8.97 0 0 1 2.168 4.5" />'],
        solid: null
    },
    BellSlash: {
        outline: ['<path d="M9.143 17.082a24 24 0 0 0 3.844.148m-3.844-.148a24 24 0 0 1-5.455-1.31a8.96 8.96 0 0 0 2.3-5.542m3.155 6.852Q9.002 17.518 9 18a3 3 0 0 0 5.81 1.053m1.965-2.278L21 21m-4.225-4.225a24 24 0 0 0 3.536-1.003A8.97 8.97 0 0 1 18 9.75V9A6 6 0 0 0 6.53 6.53m10.245 10.245L6.53 6.53M3 3l3.53 3.53" />'],
        solid: null
    },
    BellSnooze: {
        outline: ['<path d="M14.857 17.082a24 24 0 0 0 5.454-1.31A8.97 8.97 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.97 8.97 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.3 24.3 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M10.5 8.25h3l-3 4.5h3" />'],
        solid: null
    },
    Bold: {
        outline: ['<path d="M6.75 3.744h-.753v8.25h7.125a4.125 4.125 0 0 0 0-8.25zm0 0v.38m0 16.122h6.747a4.5 4.5 0 0 0 0-9.001h-7.5v9zm0 0v-.37m0-15.751h6a3.75 3.75 0 1 1 0 7.5h-6m0-7.5v7.5m0 0v8.25m0-8.25h6.375a4.125 4.125 0 0 1 0 8.25H6.75m.747-15.38h4.875a3.375 3.375 0 0 1 0 6.75H7.497zm0 7.5h5.25a3.75 3.75 0 0 1 0 7.5h-5.25z" />'],
        solid: null
    },
    Bolt: {
        outline: ['<path d="m3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75L12 13.5z" />'],
        solid: null
    },
    BoltSlash: {
        outline: ['<path d="M11.412 15.655L9.75 21.75l3.745-4.012M9.257 13.5H3.75l2.659-2.849m2.048-2.194L14.25 2.25L12 10.5h8.25l-4.707 5.043M8.457 8.457L3 3m5.457 5.457l7.086 7.086m0 0L21 21" />'],
        solid: null
    },
    BookOpen: {
        outline: ['<path d="M12 6.042A8.97 8.97 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A9 9 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.97 8.97 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A9 9 0 0 0 18 18a8.97 8.97 0 0 0-6 2.292m0-14.25v14.25" />'],
        solid: null
    },
    Bookmark: {
        outline: ['<path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25L4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.5 48.5 0 0 1 11.186 0" />'],
        solid: null
    },
    BookmarkSlash: {
        outline: ['<path d="m3 3l1.664 1.664M21 21l-1.5-1.5m-5.485-1.242L12 17.25L4.5 21V8.742m.164-4.078a2.15 2.15 0 0 1 1.743-1.342a48.5 48.5 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185V19.5M4.664 4.664L19.5 19.5" />'],
        solid: null
    },
    BookmarkSquare: {
        outline: ['<path d="M16.5 3.75V16.5L12 14.25L7.5 16.5V3.75m9 0H18A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6A2.25 2.25 0 0 1 6 3.75h1.5m9 0h-9" />'],
        solid: null
    },
    Briefcase: {
        outline: ['<path d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18c-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48 48 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A24 24 0 0 1 12 15.75a24 24 0 0 1-7.577-1.22a2 2 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48 48 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a49 49 0 0 0-7.5 0M12 12.75h.008v.008H12z" />'],
        solid: null
    },
    BugAnt: {
        outline: ['<path d="M12 12.75q1.724 0 3.383.237c1.037.146 1.866.966 1.866 2.013c0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24 24 0 0 1 12 12.75m0 0c2.883 0 5.647.508 8.208 1.44a24 24 0 0 1-1.153 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44c.125 2.105.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 0 0 2.248-2.354M12 12.75a2.25 2.25 0 0 1-2.248-2.354M12 8.25q1.494-.001 2.922-.236c.403-.066.74-.358.795-.762a3.8 3.8 0 0 0-.399-2.25M12 8.25q-1.493-.001-2.922-.236c-.402-.066-.74-.358-.795-.762a3.73 3.73 0 0 1 .4-2.253M12 8.25a2.25 2.25 0 0 0-2.248 2.146M12 8.25a2.25 2.25 0 0 1 2.248 2.146M8.683 5a6 6 0 0 1-1.155-1.002c.07-.63.27-1.222.574-1.747M8.683 5a3.75 3.75 0 0 1 6.635 0m0 0c.427-.283.815-.62 1.155-.999a4.5 4.5 0 0 0-.575-1.752M4.921 6a24 24 0 0 0-.392 3.314a24 24 0 0 0 5.223 1.082M19.08 6q.308 1.622.392 3.314a24 24 0 0 1-5.223 1.082" />'],
        solid: null
    },
    BuildingLibrary: {
        outline: ['<path d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6l9 6m-1.5 12V10.333A48.4 48.4 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12z" />'],
        solid: null
    },
    BuildingOffice: {
        outline: ['<path d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />'],
        solid: null
    },
    BuildingOffice2: {
        outline: ['<path d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008zm0 3h.008v.008h-.008zm0 3h.008v.008h-.008z" />'],
        solid: null
    },
    BuildingStorefront: {
        outline: ['<path d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3 3 0 0 0 3.75-.615A3 3 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a3 3 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015q.062.07.128.136a3 3 0 0 0 3.622.478m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75" />'],
        solid: null
    },
    Cake: {
        outline: ['<path d="M12 8.25v-1.5m0 1.5q-2.033 0-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871q2.033 0 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.35 3.35 0 0 1-3 0a3.35 3.35 0 0 0-3 0a3.35 3.35 0 0 1-3 0a3.35 3.35 0 0 0-3 0a3.35 3.35 0 0 1-3 0L3 16.5m15-3.379a49 49 0 0 0-6-.371q-3.05.002-6 .371m12 0q.585.073 1.163.16c1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A48 48 0 0 1 6 13.12m6.265-10.01a.375.375 0 1 1-.53 0L12 2.845zm-3 0a.375.375 0 1 1-.53 0L9 2.845zm6 0a.375.375 0 1 1-.53 0L15 2.845z" />'],
        solid: null
    },
    Calculator: {
        outline: ['<path d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25zm0 2.25h.008v.008H8.25zm0 2.25h.008v.008H8.25zm0 2.25h.008v.008H8.25zm2.498-6.75h.007v.008h-.007zm0 2.25h.007v.008h-.007zm0 2.25h.007v.008h-.007zm0 2.25h.007v.008h-.007zm2.504-6.75h.008v.008h-.008zm0 2.25h.008v.008h-.008zm0 2.25h.008v.008h-.008zm0 2.25h.008v.008h-.008zm2.498-6.75h.008v.008h-.008zm0 2.25h.008v.008h-.008zM8.25 6h7.5v2.25h-7.5zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A49 49 0 0 0 12 2.25" />'],
        solid: null
    },
    Calendar: {
        outline: ['<path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />'],
        solid: null
    },
    CalendarDateRange: {
        outline: ['<path d="M6.75 2.995v2.25m10.5-2.252v2.25m-14.252 13.5V7.493a2.25 2.25 0 0 1 2.25-2.251h13.5a2.25 2.25 0 0 1 2.25 2.25v11.251m-18 0a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5m-6.75-6h2.25m-9 2.25h4.5m.002-2.25h.005v.006H12zm-.001 4.5h.006v.006h-.006zm-2.25.001h.005v.006H9.75zm-2.25 0h.005v.005h-.006zm6.75-2.247h.005v.005h-.005zm0 2.247h.006v.006h-.006zm2.25-2.248h.006V15H16.5z" />'],
        solid: null
    },
    CalendarDays: {
        outline: ['<path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12zM12 15h.008v.008H12zm0 2.25h.008v.008H12zM9.75 15h.008v.008H9.75zm0 2.25h.008v.008H9.75zM7.5 15h.008v.008H7.5zm0 2.25h.008v.008H7.5zm6.75-4.5h.008v.008h-.008zm0 2.25h.008v.008h-.008zm0 2.25h.008v.008h-.008zm2.25-4.5h.008v.008H16.5zm0 2.25h.008v.008H16.5z" />'],
        solid: null
    },
    Camera: {
        outline: ['<path d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23q-.57.08-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a48 48 0 0 0-1.134-.175a2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.19 2.19 0 0 0-1.736-1.039a49 49 0 0 0-5.232 0a2.19 2.19 0 0 0-1.736 1.039z" />', '<path d="M16.5 12.75a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0m2.25-2.25h.008v.008h-.008z" />'],
        solid: null
    },
    ChartBar: {
        outline: ['<path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875zm6.75-4.5c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125zm6.75-4.5c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125z" />'],
        solid: null
    },
    ChartBarSquare: {
        outline: ['<path d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25" />'],
        solid: null
    },
    ChartPie: {
        outline: ['<path d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5z" />', '<path d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3z" />'],
        solid: null
    },
    ChatBubbleBottomCenter: {
        outline: ['<path d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227q1.603.236 3.238.364c.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67q1.635-.13 3.238-.365c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.4 48.4 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741z" />'],
        solid: null
    },
    ChatBubbleBottomCenterText: {
        outline: ['<path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227q1.694.25 3.423.379c.35.026.67.21.865.501L12 21l2.755-4.132a1.14 1.14 0 0 1 .865-.502a48 48 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.4 48.4 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741z" />'],
        solid: null
    },
    ChatBubbleLeft: {
        outline: ['<path d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227q1.63.24 3.293.369V21l4.076-4.076a1.53 1.53 0 0 1 1.037-.443a48 48 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.4 48.4 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741z" />'],
        solid: null
    },
    ChatBubbleLeftEllipsis: {
        outline: ['<path d="M8.625 9.75a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0m0 0H8.25m4.125 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0m0 0H12m4.125 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0m0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227q1.63.24 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332a48 48 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.4 48.4 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741z" />'],
        solid: null
    },
    ChatBubbleLeftRight: {
        outline: ['<path d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193q-.51.041-1.02.072v3.091l-3-3q-2.031 0-4.02-.163a2.1 2.1 0 0 1-.825-.242m9.345-8.334a2 2 0 0 0-.476-.095a48.6 48.6 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.5 48.5 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402c-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235q.865.113 1.74.194V21l4.155-4.155" />'],
        solid: null
    },
    ChatBubbleOvalLeft: {
        outline: ['<path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48c.432.447.74 1.04.586 1.641a4.5 4.5 0 0 1-.923 1.785A6 6 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087c.81.22 1.668.337 2.555.337" />'],
        solid: null
    },
    ChatBubbleOvalLeftEllipsis: {
        outline: ['<path d="M8.625 12a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0m0 0H8.25m4.125 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0m0 0H12m4.125 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0m0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.8 9.8 0 0 1-2.555-.337A5.97 5.97 0 0 1 5.41 20.97a6 6 0 0 1-.474-.065a4.5 4.5 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25" />'],
        solid: null
    },
    Check: {
        outline: ['<path d="m4.5 12.75l6 6l9-13.5" />'],
        solid: null
    },
    CheckBadge: {
        outline: ['<path d="M9 12.75L11.25 15L15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.75 3.75 0 0 1-1.043 3.296a3.75 3.75 0 0 1-3.296 1.043A3.75 3.75 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.75 3.75 0 0 1-3.296-1.043a3.75 3.75 0 0 1-1.043-3.296A3.75 3.75 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.75 3.75 0 0 1 1.043-3.296a3.75 3.75 0 0 1 3.296-1.043A3.75 3.75 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.75 3.75 0 0 1 3.296 1.043a3.75 3.75 0 0 1 1.043 3.296A3.75 3.75 0 0 1 21 12" />'],
        solid: null
    },
    CheckCircle: {
        outline: ['<path d="M9 12.75L11.25 15L15 9.75M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    ChevronDoubleDown: {
        outline: ['<path d="m4.5 5.25l7.5 7.5l7.5-7.5m-15 6l7.5 7.5l7.5-7.5" />'],
        solid: null
    },
    ChevronDoubleLeft: {
        outline: ['<path d="m18.75 4.5l-7.5 7.5l7.5 7.5m-6-15L5.25 12l7.5 7.5" />'],
        solid: null
    },
    ChevronDoubleRight: {
        outline: ['<path d="m5.25 4.5l7.5 7.5l-7.5 7.5m6-15l7.5 7.5l-7.5 7.5" />'],
        solid: null
    },
    ChevronDoubleUp: {
        outline: ['<path d="m4.5 18.75l7.5-7.5l7.5 7.5" />', '<path d="m4.5 12.75l7.5-7.5l7.5 7.5" />'],
        solid: null
    },
    ChevronDown: {
        outline: ['<path d="m19.5 8.25l-7.5 7.5l-7.5-7.5" />'],
        solid: null
    },
    ChevronLeft: {
        outline: ['<path d="M15.75 19.5L8.25 12l7.5-7.5" />'],
        solid: null
    },
    ChevronRight: {
        outline: ['<path d="m8.25 4.5l7.5 7.5l-7.5 7.5" />'],
        solid: null
    },
    ChevronUp: {
        outline: ['<path d="m4.5 15.75l7.5-7.5l7.5 7.5" />'],
        solid: null
    },
    ChevronUpDown: {
        outline: ['<path d="M8.25 15L12 18.75L15.75 15m-7.5-6L12 5.25L15.75 9" />'],
        solid: null
    },
    CircleStack: {
        outline: ['<path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />'],
        solid: null
    },
    Clipboard: {
        outline: ['<path d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0q.083.292.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0q.002-.32.084-.612m7.332 0q.969.073 1.927.184c1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48 48 0 0 1 1.927-.184" />'],
        solid: null
    },
    ClipboardDocument: {
        outline: ['<path d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192q.56-.045 1.124-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48 48 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.25 2.25 0 0 0 15 2.25h-1.5a2.25 2.25 0 0 0-2.15 1.586m5.8 0q.099.316.1.664v.75h-6V4.5q.001-.348.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9" />'],
        solid: null
    },
    ClipboardDocumentCheck: {
        outline: ['<path d="M11.35 3.836q-.099.316-.1.664c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75a2.3 2.3 0 0 0-.1-.664m-5.8 0A2.25 2.25 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0q-.563.035-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414q.564.035 1.124.08c1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5l3-3.75" />'],
        solid: null
    },
    ClipboardDocumentList: {
        outline: ['<path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48 48 0 0 0-1.123-.08m-5.801 0q-.099.316-.1.664c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75a2.3 2.3 0 0 0-.1-.664m-5.8 0A2.25 2.25 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0q-.563.035-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125zM6.75 12h.008v.008H6.75zm0 3h.008v.008H6.75zm0 3h.008v.008H6.75z" />'],
        solid: null
    },
    Clock: {
        outline: ['<path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    Cloud: {
        outline: ['<path d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257a3 3 0 0 0-3.758-3.848a5.25 5.25 0 0 0-10.233 2.33A4.5 4.5 0 0 0 2.25 15" />'],
        solid: null
    },
    CloudArrowDown: {
        outline: ['<path d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 0 1-1.41-8.775a5.25 5.25 0 0 1 10.233-2.33a3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5z" />'],
        solid: null
    },
    CloudArrowUp: {
        outline: ['<path d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775a5.25 5.25 0 0 1 10.233-2.33a3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5z" />'],
        solid: null
    },
    CodeBracket: {
        outline: ['<path d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />'],
        solid: null
    },
    CodeBracketSquare: {
        outline: ['<path d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25" />'],
        solid: null
    },
    Cog: {
        outline: ['<path d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495" />'],
        solid: null
    },
    Cog6Tooth: {
        outline: ['<path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87q.11.06.22.127c.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a8 8 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a7 7 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a7 7 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a7 7 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124q.108-.066.22-.128c.332-.183.582-.495.644-.869z" />', '<path d="M15 12a3 3 0 1 1-6 0a3 3 0 0 1 6 0" />'],
        solid: null
    },
    Cog8Tooth: {
        outline: ['<path d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93c.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204s.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78c-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107c-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93c-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204s-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78c.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107s.71-.505.78-.929z" />', '<path d="M15 12a3 3 0 1 1-6 0a3 3 0 0 1 6 0" />'],
        solid: null
    },
    CommandLine: {
        outline: ['<path d="m6.75 7.5l3 2.25l-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25" />'],
        solid: null
    },
    ComputerDesktop: {
        outline: ['<path d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />'],
        solid: null
    },
    CpuChip: {
        outline: ['<path d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25m.75-12h9v9h-9z" />'],
        solid: null
    },
    CreditCard: {
        outline: ['<path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5" />'],
        solid: null
    },
    Cube: {
        outline: ['<path d="m21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />'],
        solid: null
    },
    CubeTransparent: {
        outline: ['<path d="m21 7.5l-2.25-1.312M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.312M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.312M12 12.75l-2.25-1.312M12 12.75V15m0 6.75l2.25-1.312M12 21.75V19.5m0 2.25l-2.25-1.312m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />'],
        solid: null
    },
    CurrencyBangladeshi: {
        outline: ['<path d="m8.25 7.5l.415-.207a.75.75 0 0 1 1.085.67V10.5m0 0h6m-6 0h-1.5m1.5 0v5.438c0 .354.161.697.473.865a3.75 3.75 0 0 0 5.452-2.553c.083-.409-.263-.75-.68-.75h-.745M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    CurrencyDollar: {
        outline: ['<path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0s1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659c-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    CurrencyEuro: {
        outline: ['<path d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    CurrencyPound: {
        outline: ['<path d="M14.121 7.629A3 3 0 0 0 9.017 9.43a2.6 2.6 0 0 0 .028.636l.506 3.541a4.5 4.5 0 0 1-.43 2.65L9 16.5l1.539-.513a2.25 2.25 0 0 1 1.422 0l.655.218a2.25 2.25 0 0 0 1.718-.122L15 15.75M8.25 12H12m9 0a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    CurrencyRupee: {
        outline: ['<path d="M15 8.25H9m6 3H9m3 6l-3-3h1.5a3 3 0 1 0 0-6M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    CurrencyYen: {
        outline: ['<path d="m9 7.5l3 4.5m0 0l3-4.5M12 12v5.25M15 12H9m6 3H9m12-3a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    CursorArrowRays: {
        outline: ['<path d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225l.569-9.47l5.227 7.917zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />'],
        solid: null
    },
    CursorArrowRipple: {
        outline: ['<path d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225l.569-9.47l5.227 7.917zm-7.518-.267A8.25 8.25 0 1 1 20.25 10.5M8.288 14.212A5.25 5.25 0 1 1 17.25 10.5" />'],
        solid: null
    },
    DevicePhoneMobile: {
        outline: ['<path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />'],
        solid: null
    },
    DeviceTablet: {
        outline: ['<path d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-15a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25" />'],
        solid: null
    },
    Divide: {
        outline: ['<path d="M4.499 11.998h15m-7.5-6.75h.008v.008h-.008zm.375 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0M12 18.751h.007v.007H12zm.375 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0" />'],
        solid: null
    },
    Document: {
        outline: ['<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9" />'],
        solid: null
    },
    DocumentArrowDown: {
        outline: ['<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9" />'],
        solid: null
    },
    DocumentArrowUp: {
        outline: ['<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9" />'],
        solid: null
    },
    DocumentChartBar: {
        outline: ['<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9" />'],
        solid: null
    },
    DocumentCheck: {
        outline: ['<path d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" />'],
        solid: null
    },
    DocumentCurrencyBangladeshi: {
        outline: ['<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 8.25l.22-.22a.75.75 0 0 1 1.28.53v6.441c0 .472.214.934.64 1.137a3.75 3.75 0 0 0 4.994-1.77c.205-.428-.152-.868-.627-.868h-.507m-6-2.25h7.5M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9" />'],
        solid: null
    },
    DocumentCurrencyDollar: {
        outline: ['<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v7.5m2.25-6.466a9 9 0 0 0-3.461-.203c-.536.072-.974.478-1.021 1.017a5 5 0 0 0-.018.402c0 .464.336.844.775.994l2.95 1.012c.44.15.775.53.775.994q0 .204-.018.402c-.047.539-.485.945-1.021 1.017a9.1 9.1 0 0 1-3.461-.203M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9" />'],
        solid: null
    },
    DocumentCurrencyEuro: {
        outline: ['<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 11.625h4.5m-4.5 2.25h4.5m2.121 1.527c-1.171 1.464-3.07 1.464-4.242 0c-1.172-1.465-1.172-3.84 0-5.304s3.07-1.464 4.242 0M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9" />'],
        solid: null
    },
    DocumentCurrencyPound: {
        outline: ['<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.621 9.879a3 3 0 0 0-5.02 2.897l.164.609a4.5 4.5 0 0 1-.108 2.676l-.157.439l.44-.22a2.86 2.86 0 0 1 2.185-.155c.72.24 1.507.184 2.186-.155L15 18m-6.75-2.25H12m-1.5-13.5H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9" />'],
        solid: null
    },
    DocumentCurrencyRupee: {
        outline: ['<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 9h3.75m-4.5 2.625h4.5M12 18.75L9.75 16.5h.375a2.625 2.625 0 0 0 0-5.25H9.75m.75-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9" />'],
        solid: null
    },
    DocumentCurrencyYen: {
        outline: ['<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m1.5 9l2.25 3m0 0l2.25-3m-2.25 3v4.5M9.75 15h4.5m-4.5 2.25h4.5m-3.75-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9" />'],
        solid: null
    },
    DocumentDuplicate: {
        outline: ['<path d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9 9 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9 9 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />'],
        solid: null
    },
    DocumentMagnifyingGlass: {
        outline: ['<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9m3.75 11.625a2.625 2.625 0 1 1-5.25 0a2.625 2.625 0 0 1 5.25 0" />'],
        solid: null
    },
    DocumentMinus: {
        outline: ['<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9" />'],
        solid: null
    },
    DocumentPlus: {
        outline: ['<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9" />'],
        solid: null
    },
    DocumentText: {
        outline: ['<path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9" />'],
        solid: null
    },
    EllipsisHorizontal: {
        outline: ['<path d="M6.75 12a.75.75 0 1 1-1.5 0a.75.75 0 0 1 1.5 0m6 0a.75.75 0 1 1-1.5 0a.75.75 0 0 1 1.5 0m6 0a.75.75 0 1 1-1.5 0a.75.75 0 0 1 1.5 0" />'],
        solid: null
    },
    EllipsisHorizontalCircle: {
        outline: ['<path d="M8.625 12a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0m0 0H8.25m4.125 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0m0 0H12m4.125 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0m0 0h-.375M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    EllipsisVertical: {
        outline: ['<path d="M12 6.75a.75.75 0 1 1 0-1.5a.75.75 0 0 1 0 1.5m0 6a.75.75 0 1 1 0-1.5a.75.75 0 0 1 0 1.5m0 6a.75.75 0 1 1 0-1.5a.75.75 0 0 1 0 1.5" />'],
        solid: null
    },
    Envelope: {
        outline: ['<path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />'],
        solid: null
    },
    EnvelopeOpen: {
        outline: ['<path d="M21.75 9v.906a2.25 2.25 0 0 1-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 0 0 1.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 0 0-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V8.844a2.25 2.25 0 0 1 1.183-1.981l7.5-4.039a2.25 2.25 0 0 1 2.134 0l7.5 4.039a2.25 2.25 0 0 1 1.183 1.98z" />'],
        solid: null
    },
    Equals: {
        outline: ['<path d="M4.499 8.248h15m-15 7.501h15" />'],
        solid: null
    },
    ExclamationCircle: {
        outline: ['<path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0a9 9 0 0 1 18 0m-9 3.75h.008v.008H12z" />'],
        solid: null
    },
    ExclamationTriangle: {
        outline: ['<path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0zM12 15.75h.007v.008H12z" />'],
        solid: null
    },
    Eye: {
        outline: ['<path d="M2.036 12.322a1 1 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178c.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178" />', '<path d="M15 12a3 3 0 1 1-6 0a3 3 0 0 1 6 0" />'],
        solid: null
    },
    EyeDropper: {
        outline: ['<path d="m15 11.25l1.5 1.5l.75-.75V8.758l2.276-.61a3 3 0 1 0-3.675-3.675l-.61 2.277H12l-.75.75l1.5 1.5M15 11.25l-8.47 8.47c-.34.34-.8.53-1.28.53s-.94.19-1.28.53l-.97.97l-.75-.75l.97-.97c.34-.34.53-.8.53-1.28s.19-.94.53-1.28L12.75 9M15 11.25L12.75 9" />'],
        solid: null
    },
    EyeSlash: {
        outline: ['<path d="M3.98 8.223A10.5 10.5 0 0 0 1.934 12c1.292 4.339 5.31 7.5 10.066 7.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.499a10.52 10.52 0 0 1-4.293 5.773M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />'],
        solid: null
    },
    FaceFrown: {
        outline: ['<path d="M15.182 16.318A4.5 4.5 0 0 0 12.016 15a4.5 4.5 0 0 0-3.198 1.318M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0M9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75S9.168 9 9.375 9s.375.336.375.75m-.375 0h.008v.015h-.008zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75s.168-.75.375-.75s.375.336.375.75m-.375 0h.008v.015h-.008z" />'],
        solid: null
    },
    FaceSmile: {
        outline: ['<path d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0M9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75S9.168 9 9.375 9s.375.336.375.75m-.375 0h.008v.015h-.008zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75s.168-.75.375-.75s.375.336.375.75m-.375 0h.008v.015h-.008z" />'],
        solid: null
    },
    Film: {
        outline: ['<path d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0 1 18 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 0 1 6 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />'],
        solid: null
    },
    FingerPrint: {
        outline: ['<path d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.269M5.742 6.364A7.47 7.47 0 0 0 4.5 10.5a7.46 7.46 0 0 1-1.15 3.993m1.989 3.559A11.2 11.2 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0q0 .79-.064 1.565M12 10.5a14.94 14.94 0 0 1-3.6 9.75m6.633-4.596a18.7 18.7 0 0 1-2.485 5.33" />'],
        solid: null
    },
    Fire: {
        outline: ['<path d="M15.362 5.214A8.252 8.252 0 0 1 12 21A8.25 8.25 0 0 1 6.038 7.047A8.3 8.3 0 0 0 9 9.601a8.98 8.98 0 0 1 3.361-6.867a8.2 8.2 0 0 0 3 2.48" />', '<path d="M12 18a3.75 3.75 0 0 0 .495-7.468a6 6 0 0 0-1.925 3.547a6 6 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18" />'],
        solid: null
    },
    Flag: {
        outline: ['<path d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.5 48.5 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />'],
        solid: null
    },
    Folder: {
        outline: ['<path d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44" />'],
        solid: null
    },
    FolderArrowDown: {
        outline: ['<path d="m9 13.5l3 3m0 0l3-3m-3 3v-6m1.06-4.19l-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44" />'],
        solid: null
    },
    FolderMinus: {
        outline: ['<path d="M15 13.5H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44" />'],
        solid: null
    },
    FolderOpen: {
        outline: ['<path d="M3.75 9.776q.168-.026.344-.026h15.812q.176 0 .344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />'],
        solid: null
    },
    FolderPlus: {
        outline: ['<path d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44" />'],
        solid: null
    },
    Forward: {
        outline: ['<path d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811zm9.75 0c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061a1.125 1.125 0 0 1-1.683-.977z" />'],
        solid: null
    },
    Funnel: {
        outline: ['<path d="M12 3c2.755 0 5.455.232 8.083.678c.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.3 48.3 0 0 1 12 3" />'],
        solid: null
    },
    Gif: {
        outline: ['<path d="M12.75 8.25v7.5m6-7.5h-3V12m0 0v3.75m0-3.75H18M9.75 9.348c-1.03-1.464-2.698-1.464-3.728 0c-1.03 1.465-1.03 3.84 0 5.304s2.699 1.464 3.728 0V12h-1.5M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5" />'],
        solid: null
    },
    Gift: {
        outline: ['<path d="M20.625 11.505v8.25a1.5 1.5 0 0 1-1.5 1.5H4.875a1.5 1.5 0 0 1-1.5-1.5v-8.25m8.25-6.375A2.625 2.625 0 1 0 9 7.755h2.625m0-2.625v2.625m0-2.625a2.625 2.625 0 1 1 2.625 2.625h-2.625m0 0v13.5M3 11.505h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.622-.504-1.125-1.125-1.125H3c-.621 0-1.125.503-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125" />'],
        solid: null
    },
    GiftTop: {
        outline: ['<path d="M12 3.75v16.5M2.25 12h19.5M6.375 17.25a4.875 4.875 0 0 0 4.875-4.875V12m6.375 5.25a4.875 4.875 0 0 1-4.875-4.875V12m-9 8.25h16.5a1.5 1.5 0 0 0 1.5-1.5V5.25a1.5 1.5 0 0 0-1.5-1.5H3.75a1.5 1.5 0 0 0-1.5 1.5v13.5a1.5 1.5 0 0 0 1.5 1.5m12.621-9.44c-1.409 1.41-4.242 1.061-4.242 1.061s-.349-2.833 1.06-4.242a2.25 2.25 0 0 1 3.182 3.182M10.773 7.63c1.409 1.409 1.06 4.242 1.06 4.242S9 12.22 7.592 10.811a2.25 2.25 0 1 1 3.182-3.182" />'],
        solid: null
    },
    GlobeAlt: {
        outline: ['<path d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a9 9 0 0 1 7.843 4.582M12 3a9 9 0 0 0-7.843 4.582m15.686 0A11.95 11.95 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.96 8.96 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.9 17.9 0 0 1 12 16.5a17.9 17.9 0 0 1-8.716-2.247m0 0A9 9 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />'],
        solid: null
    },
    GlobeAmericas: {
        outline: ['<path d="m6.115 5.19l.319 1.913A6 6 0 0 0 8.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 0 0 2.288-4.042a1.09 1.09 0 0 0-.358-1.099l-1.33-1.108a1.12 1.12 0 0 0-.905-.245l-1.17.195a1.13 1.13 0 0 1-.98-.314l-.295-.295a1.125 1.125 0 0 1 0-1.591l.13-.132a1.125 1.125 0 0 1 1.3-.21l.603.302a.809.809 0 0 0 1.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 0 0 1.528-1.732l.146-.292M6.115 5.19a9 9 0 1 0 11.065-.55m-11.065.55A8.97 8.97 0 0 1 12 3c1.929 0 3.716.607 5.18 1.64" />'],
        solid: null
    },
    GlobeAsiaAustralia: {
        outline: ['<path d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 0 1-1.161.886l-.143.048a1.107 1.107 0 0 0-.57 1.664a1.108 1.108 0 0 1-.427 1.605L9 13.125l.423 1.059a.956.956 0 0 1-1.652.928l-.679-.906a1.125 1.125 0 0 0-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 0 0-8.862 12.872M12.75 3.031a9 9 0 0 1 6.69 14.036m0 0l-.177-.529A2.25 2.25 0 0 0 17.128 15H16.5l-.324-.324a1.453 1.453 0 0 0-2.328.377l-.036.073a1.6 1.6 0 0 1-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438c.08.474.49.821.97.821c.846 0 1.598.542 1.865 1.345l.215.643m5.276-3.67a9 9 0 0 1-5.276 3.67m0 0a9 9 0 0 1-10.275-4.835M15.75 9c0 .896-.393 1.7-1.016 2.25" />'],
        solid: null
    },
    GlobeEuropeAfrica: {
        outline: ['<path d="m20.893 13.393l-1.135-1.135a2.3 2.3 0 0 1-.421-.585l-1.08-2.16a.414.414 0 0 0-.663-.107a.83.83 0 0 1-.812.21l-1.273-.363a.89.89 0 0 0-.738 1.595l.587.39c.59.395.674 1.23.172 1.732l-.2.2c-.212.212-.33.498-.33.796v.41c0 .409-.11.809-.32 1.158l-1.315 2.191a2.11 2.11 0 0 1-1.81 1.025a1.055 1.055 0 0 1-1.055-1.055v-1.172c0-.92-.56-1.747-1.414-2.089l-.655-.261a2.25 2.25 0 0 1-1.383-2.46l.007-.042a2.3 2.3 0 0 1 .29-.787l.09-.15a2.25 2.25 0 0 1 2.37-1.048l1.178.236a1.125 1.125 0 0 0 1.302-.795l.208-.73a1.125 1.125 0 0 0-.578-1.315l-.665-.332l-.091.091a2.25 2.25 0 0 1-1.591.659h-.18a.94.94 0 0 0-.662.274a.931.931 0 0 1-1.458-1.137l1.411-2.353a2.3 2.3 0 0 0 .286-.76m11.928 9.869Q20.999 12.71 21 12A9 9 0 0 0 8.965 3.525m11.928 9.868A9 9 0 1 1 8.965 3.525" />'],
        solid: null
    },
    H1: {
        outline: ['<path d="M2.243 4.493v7.5m0 0v7.502m0-7.501h10.5m0-7.5v7.5m0 0v7.501m4.501-8.627l2.25-1.5v10.126m0 0h-2.25m2.25 0h2.25" />'],
        solid: null
    },
    H2: {
        outline: ['<path d="M21.75 19.5H16.5v-1.609a2.25 2.25 0 0 1 1.244-2.012l2.89-1.445c.651-.326 1.116-.955 1.116-1.683q0-.748-.118-1.463c-.135-.825-.835-1.422-1.668-1.489a15.2 15.2 0 0 0-3.464.12M2.243 4.492v7.5m0 0v7.502m0-7.501h10.5m0-7.5v7.5m0 0v7.501" />'],
        solid: null
    },
    H3: {
        outline: ['<path d="M20.906 14.626a4.52 4.52 0 0 1 .738 3.603c-.155.695-.795 1.143-1.505 1.208a15.2 15.2 0 0 1-3.639-.104m4.406-4.707a4.52 4.52 0 0 0 .738-3.603c-.155-.696-.795-1.144-1.505-1.209a15.2 15.2 0 0 0-3.639.104m4.406 4.708H18M2.243 4.493v7.5m0 0v7.502m0-7.501h10.5m0-7.5v7.5m0 0v7.501" />'],
        solid: null
    },
    HandRaised: {
        outline: ['<path d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.67.67 0 0 1 .198-.471a1.575 1.575 0 1 0-2.228-2.228a3.82 3.82 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.5 4.5 0 0 1 16.35 15m.002 0h-.002" />'],
        solid: null
    },
    HandThumbDown: {
        outline: ['<path d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12 12 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.499 15.25c.618 0 .991.724.725 1.282A7.5 7.5 0 0 0 7.5 19.75A2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672c.304-.76.93-1.33 1.653-1.715a9 9 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75q.015.075.05.148a8.95 8.95 0 0 1 .925 3.977a8.95 8.95 0 0 1-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368c.339 1.11.521 2.287.521 3.507c0 1.553-.295 3.036-.831 4.398c-.306.774-1.086 1.227-1.918 1.227h-1.053c-.472 0-.745-.556-.5-.96a9 9 0 0 0 .303-.54" />'],
        solid: null
    },
    HandThumbUp: {
        outline: ['<path d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9 9 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.5 4.5 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75a2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218c-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715q.068.633.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48a4.5 4.5 0 0 1-1.423-.23l-3.114-1.04a4.5 4.5 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5q.125.307.27.602c.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.96 8.96 0 0 0-1.302 4.665a9 9 0 0 0 .654 3.375" />'],
        solid: null
    },
    Hashtag: {
        outline: ['<path d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />'],
        solid: null
    },
    Heart: {
        outline: ['<path d="M21 8.25c0-2.485-2.099-4.5-4.687-4.5c-1.936 0-3.598 1.126-4.313 2.733c-.715-1.607-2.377-2.733-4.312-2.733C5.098 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12" />'],
        solid: null
    },
    Home: {
        outline: ['<path d="m2.25 12l8.955-8.955a1.124 1.124 0 0 1 1.59 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />'],
        solid: null
    },
    HomeModern: {
        outline: ['<path d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />'],
        solid: null
    },
    Identification: {
        outline: ['<path d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5m6-10.125a1.875 1.875 0 1 1-3.75 0a1.875 1.875 0 0 1 3.75 0m1.294 6.336a6.7 6.7 0 0 1-3.17.789a6.7 6.7 0 0 1-3.168-.789a3.376 3.376 0 0 1 6.338 0" />'],
        solid: null
    },
    Inbox: {
        outline: ['<path d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162q0-.338-.1-.661l-2.41-7.839a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.3 2.3 0 0 0-.1.661" />'],
        solid: null
    },
    InboxArrowDown: {
        outline: ['<path d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.3 2.3 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162q0-.338-.1-.661l-2.41-7.839a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" />'],
        solid: null
    },
    InboxStack: {
        outline: ['<path d="m7.875 14.25l1.214 1.942a2.25 2.25 0 0 0 1.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 0 1 1.872 1.002l.164.246a2.25 2.25 0 0 0 1.872 1.002h2.092a2.25 2.25 0 0 0 1.872-1.002l.164-.246A2.25 2.25 0 0 1 16.954 9h4.636M2.41 9a2.3 2.3 0 0 0-.16.832V12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 12V9.832c0-.287-.055-.57-.16-.832M2.41 9a2.3 2.3 0 0 1 .382-.632l3.285-3.832a2.25 2.25 0 0 1 1.708-.786h8.43c.657 0 1.281.287 1.709.786l3.284 3.832c.163.19.291.404.382.632M4.5 20.25h15A2.25 2.25 0 0 0 21.75 18v-2.625c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V18a2.25 2.25 0 0 0 2.25 2.25" />'],
        solid: null
    },
    InformationCircle: {
        outline: ['<path d="m11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0m-9-3.75h.008v.008H12z" />'],
        solid: null
    },
    Italic: {
        outline: ['<path d="M5.248 20.246H9.05m0 0h3.696m-3.696 0l5.893-16.502m0 0h-3.697m3.697 0h3.803" />'],
        solid: null
    },
    Key: {
        outline: ['<path d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25" />'],
        solid: null
    },
    Language: {
        outline: ['<path d="m10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a49 49 0 0 1 6-.371m0 0q1.681 0 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138q1.344.092 2.666.257m-4.589 8.495a18 18 0 0 1-3.827-5.802" />'],
        solid: null
    },
    Lifebuoy: {
        outline: ['<path d="M16.712 4.33a9 9 0 0 1 1.652 1.306c.51.51.944 1.064 1.306 1.652M16.712 4.33l-3.448 4.138m3.448-4.138a9.01 9.01 0 0 0-9.424 0M19.67 7.288l-4.138 3.448m4.138-3.448a9.01 9.01 0 0 1 0 9.424m-4.138-5.976a3.7 3.7 0 0 0-.88-1.388a3.7 3.7 0 0 0-1.388-.88m2.268 2.268a3.77 3.77 0 0 1 0 2.528m-2.268-4.796a3.77 3.77 0 0 0-2.528 0m4.796 4.796a3.75 3.75 0 0 1-.88 1.388a3.7 3.7 0 0 1-1.388.88m2.268-2.268l4.138 3.448m0 0a9 9 0 0 1-1.306 1.652c-.51.51-1.064.944-1.652 1.306m0 0l-3.448-4.138m3.448 4.138a9.01 9.01 0 0 1-9.424 0m5.976-4.138a3.77 3.77 0 0 1-2.528 0m0 0a3.7 3.7 0 0 1-1.388-.88a3.7 3.7 0 0 1-.88-1.388m2.268 2.268L7.288 19.67m0 0a9 9 0 0 1-1.652-1.306a9 9 0 0 1-1.306-1.652m0 0l4.138-3.448M4.33 16.712a9.01 9.01 0 0 1 0-9.424m4.138 5.976a3.77 3.77 0 0 1 0-2.528m0 0c.181-.506.475-.982.88-1.388a3.7 3.7 0 0 1 1.388-.88m-2.268 2.268L4.33 7.288m6.406 1.18L7.288 4.33m0 0a9 9 0 0 0-1.652 1.306A9 9 0 0 0 4.33 7.288" />'],
        solid: null
    },
    LightBulb: {
        outline: ['<path d="M12 18v-5.25m0 0a6 6 0 0 0 1.5-.189m-1.5.189a6 6 0 0 1-1.5-.189m3.75 7.478a12.1 12.1 0 0 1-4.5 0m3.75 2.383a14.4 14.4 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />'],
        solid: null
    },
    Link: {
        outline: ['<path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />'],
        solid: null
    },
    LinkSlash: {
        outline: ['<path d="M13.181 8.68a4.503 4.503 0 0 1 1.903 6.405m-9.768-2.782L3.56 14.06a4.5 4.5 0 0 0 6.364 6.365l3.129-3.129m5.614-5.615l1.757-1.757a4.5 4.5 0 0 0-6.364-6.365l-4.5 4.5q-.388.39-.661.84m1.903 6.405a4.5 4.5 0 0 1-1.242-.88a4.5 4.5 0 0 1-1.062-1.683m6.587 2.345l5.907 5.907m-5.907-5.907L8.898 8.898M2.991 2.99L8.898 8.9" />'],
        solid: null
    },
    ListBullet: {
        outline: ['<path d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75zm.375 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0M3.75 12h.007v.008H3.75zm.375 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0m-.375 5.25h.007v.008H3.75zm.375 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0" />'],
        solid: null
    },
    LockClosed: {
        outline: ['<path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25" />'],
        solid: null
    },
    LockOpen: {
        outline: ['<path d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25" />'],
        solid: null
    },
    MagnifyingGlass: {
        outline: ['<path d="m21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607" />'],
        solid: null
    },
    MagnifyingGlassCircle: {
        outline: ['<path d="m15.75 15.75l-2.488-2.488m0 0a3.375 3.375 0 1 0-4.773-4.773a3.375 3.375 0 0 0 4.772 4.772M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    MagnifyingGlassMinus: {
        outline: ['<path d="m21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607M13.5 10.5h-6" />'],
        solid: null
    },
    MagnifyingGlassPlus: {
        outline: ['<path d="m21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607M10.5 7.5v6m3-3h-6" />'],
        solid: null
    },
    Map: {
        outline: ['<path d="M9 6.75V15m6-6v8.25m.503 3.499l4.875-2.438c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934a1.12 1.12 0 0 1-1.006 0L9.503 3.252a1.13 1.13 0 0 0-1.006 0L3.622 5.689A1.13 1.13 0 0 0 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934a1.12 1.12 0 0 1 1.006 0l4.994 2.497c.317.158.69.158 1.006 0" />'],
        solid: null
    },
    MapPin: {
        outline: ['<path d="M15 10.5a3 3 0 1 1-6 0a3 3 0 0 1 6 0" />', '<path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0" />'],
        solid: null
    },
    Megaphone: {
        outline: ['<path d="M10.34 15.84q-1.033-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75q1.057 0 2.09-.09m0 9.18q.381 1.445.985 2.783c.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a21 21 0 0 1-1.44-4.282m3.102.069a18 18 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.9 23.9 0 0 1 8.835 2.535M10.34 6.66a23.9 23.9 0 0 0 8.835-2.535m0 0A24 24 0 0 0 18.795 3m.38 1.125a24 24 0 0 1 1.014 5.395m-1.014 8.855q-.177.57-.38 1.125m.38-1.125a24 24 0 0 0 1.014-5.395m0-3.46a2.25 2.25 0 0 1 0 3.46m0-3.46a24 24 0 0 1 0 3.46" />'],
        solid: null
    },
    Microphone: {
        outline: ['<path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3" />'],
        solid: null
    },
    Minus: {
        outline: ['<path d="M5 12h14" />'],
        solid: null
    },
    MinusCircle: {
        outline: ['<path d="M15 12H9m12 0a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    MinusSmall: {
        outline: ['<path d="M18 12H6" />'],
        solid: null
    },
    Moon: {
        outline: ['<path d="M21.752 15.002A9.7 9.7 0 0 1 18 15.75A9.75 9.75 0 0 1 8.25 6c0-1.33.266-2.597.748-3.752A9.75 9.75 0 0 0 3 11.25A9.75 9.75 0 0 0 12.75 21a9.75 9.75 0 0 0 9.002-5.998" />'],
        solid: null
    },
    MusicalNote: {
        outline: ['<path d="m9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163m0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553" />'],
        solid: null
    },
    Newspaper: {
        outline: ['<path d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6z" />'],
        solid: null
    },
    NoSymbol: {
        outline: ['<path d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />'],
        solid: null
    },
    NumberedList: {
        outline: ['<path d="M8.242 5.992h12m-12 6.003H20.24m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H5.24m-1.92 2.577a1.125 1.125 0 1 1 1.591 1.59l-1.83 1.83h2.16M2.99 15.746h1.125a1.125 1.125 0 0 1 0 2.25H3.74m0-.002h.375a1.125 1.125 0 0 1 0 2.25H2.99" />'],
        solid: null
    },
    PaintBrush: {
        outline: ['<path d="M9.53 16.122a3 3 0 0 0-5.78 1.128a2.25 2.25 0 0 1-2.4 2.245a4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128m0 0a16 16 0 0 0 3.388-1.62m-5.043-.025a16 16 0 0 1 1.622-3.395m3.42 3.42a16 16 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a16 16 0 0 0-4.649 4.764m3.42 3.42a6.78 6.78 0 0 0-3.42-3.42" />'],
        solid: null
    },
    PaperAirplane: {
        outline: ['<path d="M6 12L3.269 3.125A59.8 59.8 0 0 1 21.486 12a59.8 59.8 0 0 1-18.217 8.875zm0 0h7.5" />'],
        solid: null
    },
    PaperClip: {
        outline: ['<path d="m18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />'],
        solid: null
    },
    Pause: {
        outline: ['<path d="M15.75 5.25v13.5m-7.5-13.5v13.5" />'],
        solid: null
    },
    PauseCircle: {
        outline: ['<path d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    Pencil: {
        outline: ['<path d="m16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8l.8-2.685a4.5 4.5 0 0 1 1.13-1.897zm0 0L19.5 7.125" />'],
        solid: null
    },
    PencilSquare: {
        outline: ['<path d="m16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />'],
        solid: null
    },
    PercentBadge: {
        outline: ['<path d="m8.99 14.993l6-6m6 3.001a3.75 3.75 0 0 1-1.593 3.069a3.75 3.75 0 0 1-1.043 3.296a3.75 3.75 0 0 1-3.296 1.043a3.75 3.75 0 0 1-3.068 1.593c-1.268 0-2.39-.63-3.068-1.593a3.75 3.75 0 0 1-3.296-1.043a3.75 3.75 0 0 1-1.043-3.297a3.75 3.75 0 0 1-1.593-3.068c0-1.268.63-2.39 1.593-3.068a3.75 3.75 0 0 1 1.043-3.297a3.75 3.75 0 0 1 3.296-1.042a3.75 3.75 0 0 1 3.068-1.594c1.268 0 2.39.63 3.068 1.593a3.75 3.75 0 0 1 3.296 1.043a3.75 3.75 0 0 1 1.043 3.297a3.75 3.75 0 0 1 1.593 3.068M9.74 9.743h.008v.007H9.74zm.375 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0m4.125 4.5h.008v.008h-.008zm.375 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0" />'],
        solid: null
    },
    Phone: {
        outline: ['<path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.04 12.04 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5z" />'],
        solid: null
    },
    PhoneArrowDownLeft: {
        outline: ['<path d="M14.25 9.75v-4.5m0 4.5h4.5m-4.5 0l6-6m-3 18c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 0 1 4.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.06 1.06 0 0 0-.38 1.21a12.04 12.04 0 0 0 7.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293a1.13 1.13 0 0 1 1.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 0 1-2.25 2.25z" />'],
        solid: null
    },
    PhoneArrowUpRight: {
        outline: ['<path d="M20.25 3.75v4.5m0-4.5h-4.5m4.5 0l-6 6m3 12c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 0 1 4.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.06 1.06 0 0 0-.38 1.21a12.04 12.04 0 0 0 7.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293a1.13 1.13 0 0 1 1.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 0 1-2.25 2.25z" />'],
        solid: null
    },
    PhoneXMark: {
        outline: ['<path d="M15.75 3.75L18 6m0 0l2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m1.5 13.5c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 0 1 4.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.06 1.06 0 0 0-.38 1.21a12.04 12.04 0 0 0 7.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293a1.13 1.13 0 0 1 1.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 0 1-2.25 2.25z" />'],
        solid: null
    },
    Photo: {
        outline: ['<path d="m2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5m10.5-11.25h.008v.008h-.008zm.375 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0" />'],
        solid: null
    },
    Play: {
        outline: ['<path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986z" />'],
        solid: null
    },
    PlayCircle: {
        outline: ['<path d="M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />', '<path d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327z" />'],
        solid: null
    },
    PlayPause: {
        outline: ['<path d="M21 7.5V18M15 7.5V18M3 16.811V8.69c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811" />'],
        solid: null
    },
    Plus: {
        outline: ['<path d="M12 4.5v15m7.5-7.5h-15" />'],
        solid: null
    },
    PlusCircle: {
        outline: ['<path d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    PlusSmall: {
        outline: ['<path d="M12 6v12m6-6H6" />'],
        solid: null
    },
    Power: {
        outline: ['<path d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />'],
        solid: null
    },
    PresentationChartBar: {
        outline: ['<path d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />'],
        solid: null
    },
    PresentationChartLine: {
        outline: ['<path d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3l2.148 2.148A12.1 12.1 0 0 1 16.5 7.605" />'],
        solid: null
    },
    Printer: {
        outline: ['<path d="M6.72 13.829q-.36.045-.72.096m.72-.096a42.4 42.4 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171q.36.045.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48 48 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48 48 0 0 1 1.913-.247m10.5 0a48.5 48.5 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18zm-3 0h.008v.008H15z" />'],
        solid: null
    },
    PuzzlePiece: {
        outline: ['<path d="M14.25 6.087c0-.355.186-.676.401-.959c.221-.29.349-.634.349-1.003c0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003c.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643a48 48 0 0 1-4.163-.3q.28 2.42.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.65 1.65 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349c.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48 48 0 0 1-.642 5.056q2.278.286 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.65 1.65 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875c1.243 0 2.25.84 2.25 1.875c0 .369-.128.713-.349 1.003c-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48 48 0 0 0 5.427-.63a48 48 0 0 0 .582-4.717a.53.53 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401c-.29.221-.634.349-1.003.349c-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349c.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663a48 48 0 0 0-.37-5.36q-2.83.515-5.766.689a.58.58 0 0 1-.61-.58" />'],
        solid: null
    },
    QrCode: {
        outline: ['<path d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375zm0 9.75c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125zm9.75-9.75c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375z" />', '<path d="M6.75 6.75h.75v.75h-.75zm0 9.75h.75v.75h-.75zm9.75-9.75h.75v.75h-.75zm-3 6.75h.75v.75h-.75zm0 6h.75v.75h-.75zm6-6h.75v.75h-.75zm0 6h.75v.75h-.75zm-3-3h.75v.75h-.75z" />'],
        solid: null
    },
    QuestionMarkCircle: {
        outline: ['<path d="M9.879 7.519c1.172-1.025 3.071-1.025 4.243 0c1.171 1.025 1.171 2.687 0 3.712q-.308.268-.67.442c-.746.361-1.452.999-1.452 1.827v.75M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0m-9 5.25h.008v.008H12z" />'],
        solid: null
    },
    QueueList: {
        outline: ['<path d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75" />'],
        solid: null
    },
    Radio: {
        outline: ['<path d="m3.75 7.5l16.5-4.125M12 6.75a48.3 48.3 0 0 0-7.948.655C2.999 7.58 2.25 8.507 2.25 9.574v9.176A2.25 2.25 0 0 0 4.5 21h15a2.25 2.25 0 0 0 2.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169A48.3 48.3 0 0 0 12 6.75m-1.683 6.443l-.005.005l-.006-.005l.006-.005zm-.005 2.127l-.005-.006l.005-.005l.005.005zm-2.116-.006l-.005.006l-.006-.006l.005-.005zm-.005-2.116l-.006-.005l.006-.005l.005.005zM9.255 10.5v.008h-.008V10.5zm3.249 1.88l-.007.004l-.003-.007l.006-.003zm-1.38 5.126l-.003-.006l.006-.004l.004.007zm.007-6.501l-.003.006l-.007-.003l.004-.007zm1.37 5.129l-.007-.004l.004-.006l.006.003zm.504-1.877h-.008v-.007h.008zM9.255 18v.008h-.008V18zm-3.246-1.87l-.007.004L6 16.127l.006-.003zm1.366-5.119l-.004-.006l.006-.004l.004.007zM7.38 17.5l-.003.006l-.007-.003l.004-.007zm-1.376-5.116L6 12.38l.003-.007l.007.004zm-.5 1.873h-.008v-.007h.008zM17.25 12.75a.75.75 0 1 1 0-1.5a.75.75 0 0 1 0 1.5m0 4.5a.75.75 0 1 1 0-1.5a.75.75 0 0 1 0 1.5" />'],
        solid: null
    },
    ReceiptPercent: {
        outline: ['<path d="m9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5l-3.75 1.5l-3.75-1.5l-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.5 48.5 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185M9.75 9h.008v.008H9.75zm.375 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0m4.125 4.5h.008v.008h-.008zm.375 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0" />'],
        solid: null
    },
    ReceiptRefund: {
        outline: ['<path d="M8.25 9.75h4.875a2.625 2.625 0 0 1 0 5.25H12M8.25 9.75L10.5 7.5M8.25 9.75L10.5 12m9-7.243V21.75l-3.75-1.5l-3.75 1.5l-3.75-1.5l-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.5 48.5 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185" />'],
        solid: null
    },
    RectangleGroup: {
        outline: ['<path d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125zm12 1.5c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125zm-10.5 7.5c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125z" />'],
        solid: null
    },
    RectangleStack: {
        outline: ['<path d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0q.354-.126.75-.128h10.5q.396.002.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.3 2.3 0 0 0-.75-.128H5.25q-.396.002-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122" />'],
        solid: null
    },
    RocketLaunch: {
        outline: ['<path d="M15.59 14.37q.159.666.16 1.38a6 6 0 0 1-6 6v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.9 14.9 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.9 14.9 0 0 0-2.58 5.84m2.699 2.7q-.155.032-.311.06a15 15 0 0 1-2.448-2.448l.06-.312m-2.24 2.39a4.49 4.49 0 0 0-1.757 4.306q.341.054.696.054a4.5 4.5 0 0 0 3.61-1.812M16.5 9a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0" />'],
        solid: null
    },
    Rss: {
        outline: ['<path d="M12.75 19.5v-.75a7.5 7.5 0 0 0-7.5-7.5H4.5m0-6.75h.75c7.87 0 14.25 6.38 14.25 14.25v.75M6 18.75a.75.75 0 1 1-1.5 0a.75.75 0 0 1 1.5 0" />'],
        solid: null
    },
    Scale: {
        outline: ['<path d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48 48 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0q1.515.215 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a6 6 0 0 1-2.031.352a6 6 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202zm-16.5.52q1.485-.305 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a6 6 0 0 1-2.031.352a6 6 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202z" />'],
        solid: null
    },
    Scissors: {
        outline: ['<path d="m7.848 8.25l1.536.887M7.848 8.25a3 3 0 1 1-5.196-3a3 3 0 0 1 5.196 3m1.536.887a2.17 2.17 0 0 1 1.083 1.839q.01.529.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 1 1-5.196 3a3 3 0 0 1 5.196-3m1.536-.887a2.17 2.17 0 0 0 1.083-1.838q.01-.529.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.3 4.3 0 0 1 2.068-1.379l5.325-1.628a4.5 4.5 0 0 1 2.48-.044l.803.215l-7.794 4.5m-2.882-1.664A4.3 4.3 0 0 0 10.607 12m3.736 0l7.794 4.5l-.802.215a4.5 4.5 0 0 1-2.48-.043l-5.326-1.629a4.3 4.3 0 0 1-2.068-1.379M14.343 12l-2.882 1.664" />'],
        solid: null
    },
    Server: {
        outline: ['<path d="M21.75 17.25v-.228a4.5 4.5 0 0 0-.12-1.03l-2.268-9.64a3.375 3.375 0 0 0-3.285-2.602H7.923a3.375 3.375 0 0 0-3.285 2.602l-2.268 9.64a4.5 4.5 0 0 0-.12 1.03v.228m19.5 0a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3m19.5 0a3 3 0 0 0-3-3H5.25a3 3 0 0 0-3 3m16.5 0h.008v.008h-.008zm-3 0h.008v.008h-.008z" />'],
        solid: null
    },
    ServerStack: {
        outline: ['<path d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.738 5.1a3.38 3.38 0 0 1 2.7-1.35h7.124c1.063 0 2.063.5 2.7 1.35l2.588 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008zm0-6h.008v.008h-.008zm-3 6h.008v.008h-.008zm0-6h.008v.008h-.008z" />'],
        solid: null
    },
    Share: {
        outline: ['<path d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186a2.25 2.25 0 0 0-3.935-2.186m0-12.814a2.25 2.25 0 1 0 3.933-2.185a2.25 2.25 0 0 0-3.933 2.185" />'],
        solid: null
    },
    ShieldCheck: {
        outline: ['<path d="M9 12.75L11.25 15L15 9.75m-3-7.036A11.96 11.96 0 0 1 3.598 6A12 12 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623c5.176-1.332 9-6.03 9-11.622c0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285" />'],
        solid: null
    },
    ShieldExclamation: {
        outline: ['<path d="M12 9v3.75m0-10.036A11.96 11.96 0 0 1 3.598 6A12 12 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622c5.176-1.332 9-6.03 9-11.622c0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286m0 13.036h.008v.008H12z" />'],
        solid: null
    },
    ShoppingBag: {
        outline: ['<path d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007M8.625 10.5a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0m7.5 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0" />'],
        solid: null
    },
    ShoppingCart: {
        outline: ['<path d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.137a60 60 0 0 0-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0a.75.75 0 0 1 1.5 0m12.75 0a.75.75 0 1 1-1.5 0a.75.75 0 0 1 1.5 0" />'],
        solid: null
    },
    Signal: {
        outline: ['<path d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12zm.375 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0" />'],
        solid: null
    },
    SignalSlash: {
        outline: ['<path d="m3 3l8.735 8.735m0 0a.374.374 0 1 1 .53.53m-.53-.53l.53.53m0 0L21 21M14.652 9.348a3.75 3.75 0 0 1 0 5.304m2.121-7.425a6.75 6.75 0 0 1 0 9.546m2.121-11.667c3.808 3.807 3.808 9.98 0 13.788m-9.546-4.242a3.73 3.73 0 0 1-1.06-2.122m-1.061 4.243a6.75 6.75 0 0 1-1.625-6.929m-.496 9.05c-3.068-3.067-3.664-7.67-1.79-11.334M12 12h.008v.008H12z" />'],
        solid: null
    },
    Slash: {
        outline: ['<path d="m9 20.248l6-16.5" />'],
        solid: null
    },
    Sparkles: {
        outline: ['<path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09m8.445-7.188L18 9.75l-.259-1.035a3.38 3.38 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.38 3.38 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.38 3.38 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.38 3.38 0 0 0-2.456 2.456m-1.365 11.852L16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183l.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394l-1.183.394a2.25 2.25 0 0 0-1.423 1.423" />'],
        solid: null
    },
    SpeakerWave: {
        outline: ['<path d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9 9 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25z" />'],
        solid: null
    },
    SpeakerXMark: {
        outline: ['<path d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9 9 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25z" />'],
        solid: null
    },
    Square2Stack: {
        outline: ['<path d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 0 0-2.25 2.25v6" />'],
        solid: null
    },
    Square3Stack3d: {
        outline: ['<path d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3l5.571-3m-11.142 0L2.25 7.5L12 2.25l9.75 5.25l-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75L2.25 16.5l4.179-2.25m11.142 0l-5.571 3l-5.571-3" />'],
        solid: null
    },
    Squares2x2: {
        outline: ['<path d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25zm0 9.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18zM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25zm0 9.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18z" />'],
        solid: null
    },
    SquaresPlus: {
        outline: ['<path d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5m0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25m9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25" />'],
        solid: null
    },
    Star: {
        outline: ['<path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.56.56 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.56.56 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.56.56 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.56.56 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.56.56 0 0 0 .475-.345z" />'],
        solid: null
    },
    Stop: {
        outline: ['<path d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25z" />'],
        solid: null
    },
    StopCircle: {
        outline: ['<path d="M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />', '<path d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874a.563.563 0 0 1-.562.563H9.561A.56.56 0 0 1 9 14.438z" />'],
        solid: null
    },
    Strikethrough: {
        outline: ['<path d="M12 12a9 9 0 0 1-.318-.079c-1.585-.424-2.904-1.247-3.76-2.236c-.873-1.009-1.265-2.19-.968-3.301c.59-2.2 3.663-3.29 6.863-2.432A8.2 8.2 0 0 1 16.5 5.21M6.42 17.812c.857.989 2.176 1.811 3.761 2.236c3.2.858 6.274-.23 6.863-2.431c.233-.868.044-1.779-.465-2.617M3.75 12h16.5" />'],
        solid: null
    },
    Sun: {
        outline: ['<path d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0a3.75 3.75 0 0 1 7.5 0" />'],
        solid: null
    },
    Swatch: {
        outline: ['<path d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88a1.124 1.124 0 0 1 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75z" />'],
        solid: null
    },
    TableCells: {
        outline: ['<path d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />'],
        solid: null
    },
    Tag: {
        outline: ['<path d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.1 18.1 0 0 0 5.224-5.223c.54-.827.368-1.908-.33-2.607l-9.583-9.58A2.25 2.25 0 0 0 9.568 3" />', '<path d="M6 6h.008v.008H6z" />'],
        solid: null
    },
    Ticket: {
        outline: ['<path d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125z" />'],
        solid: null
    },
    Trash: {
        outline: ['<path d="m14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21q.512.078 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48 48 0 0 0-3.478-.397m-12 .562q.51-.088 1.022-.165m0 0a48 48 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a52 52 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a49 49 0 0 0-7.5 0" />'],
        solid: null
    },
    Trophy: {
        outline: ['<path d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.45 7.45 0 0 1-.982-3.172M9.497 14.25a7.45 7.45 0 0 0 .981-3.172M5.25 4.236q-1.473.215-2.916.52A6 6 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25s4.545.16 6.75.47v1.516M7.73 9.728a6.7 6.7 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46 46 0 0 1 2.916.52a6 6 0 0 1-5.395 4.972m0 0a6.7 6.7 0 0 1-2.749 1.35m0 0a6.8 6.8 0 0 1-3.044 0" />'],
        solid: null
    },
    Truck: {
        outline: ['<path d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.9 17.9 0 0 0-3.213-9.193a2.06 2.06 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.6 48.6 0 0 0-10.026 0a1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />'],
        solid: null
    },
    Tv: {
        outline: ['<path d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125" />'],
        solid: null
    },
    Underline: {
        outline: ['<path d="M17.995 3.744v7.5a6 6 0 1 1-12 0v-7.5m-2.25 16.502h16.5" />'],
        solid: null
    },
    User: {
        outline: ['<path d="M15.75 6a3.75 3.75 0 1 1-7.5 0a3.75 3.75 0 0 1 7.5 0M4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.9 17.9 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632" />'],
        solid: null
    },
    UserCircle: {
        outline: ['<path d="M17.982 18.725A7.49 7.49 0 0 0 12 15.75a7.49 7.49 0 0 0-5.982 2.975m11.964 0a9 9 0 1 0-11.963 0m11.962 0A8.97 8.97 0 0 1 12 21a8.97 8.97 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0a3 3 0 0 1 6 0" />'],
        solid: null
    },
    UserGroup: {
        outline: ['<path d="M18 18.72a9.1 9.1 0 0 0 3.741-.479q.01-.12.01-.241a3 3 0 0 0-4.692-2.478m.94 3.197l.001.031q0 .337-.037.666A11.94 11.94 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6 6 0 0 1 6 18.719m12 0a5.97 5.97 0 0 0-.941-3.197m0 0A6 6 0 0 0 12 12.75a6 6 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72a9 9 0 0 0 3.74.477m.94-3.197a5.97 5.97 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0a3 3 0 0 1 6 0m6 3a2.25 2.25 0 1 1-4.5 0a2.25 2.25 0 0 1 4.5 0m-13.5 0a2.25 2.25 0 1 1-4.5 0a2.25 2.25 0 0 1 4.5 0" />'],
        solid: null
    },
    UserMinus: {
        outline: ['<path d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0a3.375 3.375 0 0 1 6.75 0M4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.3 12.3 0 0 1 10.374 21C8.043 21 5.862 20.355 4 19.234" />'],
        solid: null
    },
    UserPlus: {
        outline: ['<path d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0a3.375 3.375 0 0 1 6.75 0M3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.3 12.3 0 0 1 9.374 21C7.043 21 4.862 20.355 3 19.234" />'],
        solid: null
    },
    Users: {
        outline: ['<path d="M15 19.128a9.4 9.4 0 0 0 2.625.372a9.3 9.3 0 0 0 4.121-.952q.004-.086.004-.173a4.125 4.125 0 0 0-7.536-2.32M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.3 12.3 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0a3.375 3.375 0 0 1 6.75 0m8.25 2.25a2.625 2.625 0 1 1-5.25 0a2.625 2.625 0 0 1 5.25 0" />'],
        solid: null
    },
    Variable: {
        outline: ['<path d="M4.745 3A23.9 23.9 0 0 0 3 12c0 3.183.62 6.22 1.745 9M19.5 3c.967 2.78 1.5 5.817 1.5 9s-.533 6.22-1.5 9M8.25 8.885l1.444-.89a.75.75 0 0 1 1.105.402l2.402 7.206a.75.75 0 0 0 1.104.401l1.445-.889m-8.25.75l.213.09a1.69 1.69 0 0 0 2.062-.617l4.45-6.676a1.69 1.69 0 0 1 2.062-.618l.213.09" />'],
        solid: null
    },
    VideoCamera: {
        outline: ['<path d="m15.75 10.5l4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25" />'],
        solid: null
    },
    VideoCameraSlash: {
        outline: ['<path d="m15.75 10.5l4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />'],
        solid: null
    },
    ViewColumns: {
        outline: ['<path d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125" />'],
        solid: null
    },
    ViewfinderCircle: {
        outline: ['<path d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5M15 12a3 3 0 1 1-6 0a3 3 0 0 1 6 0" />'],
        solid: null
    },
    Wallet: {
        outline: ['<path d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />'],
        solid: null
    },
    Wifi: {
        outline: ['<path d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53l-.53-.53a.75.75 0 0 1 1.06 0" />'],
        solid: null
    },
    Window: {
        outline: ['<path d="M3 8.25V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18V8.25m-18 0V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6v2.25m-18 0h18M5.25 6h.008v.008H5.25zM7.5 6h.008v.008H7.5zm2.25 0h.008v.008H9.75z" />'],
        solid: null
    },
    Wrench: {
        outline: ['<path d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.151c.833-.687.995-1.875.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.275a3 3 0 0 0 2.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852" />', '<path d="M4.867 19.125h.008v.008h-.008z" />'],
        solid: null
    },
    WrenchScrewdriver: {
        outline: ['<path d="M11.42 15.17L17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14q.19.017.384.017a4.5 4.5 0 0 0 4.102-6.352l-3.276 3.276a3 3 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008z" />'],
        solid: null
    },
    XCircle: {
        outline: ['<path d="m9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />'],
        solid: null
    },
    XMark: {
        outline: ['<path d="M6 18L18 6M6 6l12 12" />'],
        solid: null
    },
};
function OutLineTemplate(unit, { stroke = 'currentColor', strokeOpacity = 1.0, strokeWidth = 1.5, strokeLinejoin = 'round', strokeLinecap = 'round' } = {}) {
    xnew$1.nest(`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      style="stroke-width: ${strokeWidth}; stroke: ${stroke}; stroke-opacity: ${strokeOpacity}; stroke-linejoin: ${strokeLinejoin}; stroke-linecap: ${strokeLinecap};"
    >`);
}
function icon(key, props) {
    xnew$1.nest(`<div style="position: relative; width: 100%; height: 100%;">`);
    xnew$1((unit) => {
        xnew$1.extend(OutLineTemplate, props);
        for (const path of icondata[key].outline) {
            xnew$1(path);
        }
    });
}
const icons = {
    AcademicCap(unit, props) { icon('AcademicCap', props); },
    AdjustmentsHorizontal(unit, props) { icon('AdjustmentsHorizontal', props); },
    AdjustmentsVertical(unit, props) { icon('AdjustmentsVertical', props); },
    ArchiveBox(unit, props) { icon('ArchiveBox', props); },
    ArchiveBoxArrowDown(unit, props) { icon('ArchiveBoxArrowDown', props); },
    ArchiveBoxXMark(unit, props) { icon('ArchiveBoxXMark', props); },
    ArrowDown(unit, props) { icon('ArrowDown', props); },
    ArrowDownCircle(unit, props) { icon('ArrowDownCircle', props); },
    ArrowDownLeft(unit, props) { icon('ArrowDownLeft', props); },
    ArrowDownOnSquare(unit, props) { icon('ArrowDownOnSquare', props); },
    ArrowDownOnSquareStack(unit, props) { icon('ArrowDownOnSquareStack', props); },
    ArrowDownRight(unit, props) { icon('ArrowDownRight', props); },
    ArrowDownTray(unit, props) { icon('ArrowDownTray', props); },
    ArrowLeft(unit, props) { icon('ArrowLeft', props); },
    ArrowLeftCircle(unit, props) { icon('ArrowLeftCircle', props); },
    ArrowLeftEndOnRectangle(unit, props) { icon('ArrowLeftEndOnRectangle', props); },
    ArrowLeftOnRectangle(unit, props) { icon('ArrowLeftOnRectangle', props); },
    ArrowLeftStartOnRectangle(unit, props) { icon('ArrowLeftStartOnRectangle', props); },
    ArrowLongDown(unit, props) { icon('ArrowLongDown', props); },
    ArrowLongLeft(unit, props) { icon('ArrowLongLeft', props); },
    ArrowLongRight(unit, props) { icon('ArrowLongRight', props); },
    ArrowLongUp(unit, props) { icon('ArrowLongUp', props); },
    ArrowPath(unit, props) { icon('ArrowPath', props); },
    ArrowPathRoundedSquare(unit, props) { icon('ArrowPathRoundedSquare', props); },
    ArrowRight(unit, props) { icon('ArrowRight', props); },
    ArrowRightCircle(unit, props) { icon('ArrowRightCircle', props); },
    ArrowRightEndOnRectangle(unit, props) { icon('ArrowRightEndOnRectangle', props); },
    ArrowRightOnRectangle(unit, props) { icon('ArrowRightOnRectangle', props); },
    ArrowRightStartOnRectangle(unit, props) { icon('ArrowRightStartOnRectangle', props); },
    ArrowSmallDown(unit, props) { icon('ArrowSmallDown', props); },
    ArrowSmallLeft(unit, props) { icon('ArrowSmallLeft', props); },
    ArrowSmallRight(unit, props) { icon('ArrowSmallRight', props); },
    ArrowSmallUp(unit, props) { icon('ArrowSmallUp', props); },
    ArrowTopRightOnSquare(unit, props) { icon('ArrowTopRightOnSquare', props); },
    ArrowTrendingDown(unit, props) { icon('ArrowTrendingDown', props); },
    ArrowTrendingUp(unit, props) { icon('ArrowTrendingUp', props); },
    ArrowTurnDownLeft(unit, props) { icon('ArrowTurnDownLeft', props); },
    ArrowTurnDownRight(unit, props) { icon('ArrowTurnDownRight', props); },
    ArrowTurnLeftDown(unit, props) { icon('ArrowTurnLeftDown', props); },
    ArrowTurnLeftUp(unit, props) { icon('ArrowTurnLeftUp', props); },
    ArrowTurnRightDown(unit, props) { icon('ArrowTurnRightDown', props); },
    ArrowTurnRightUp(unit, props) { icon('ArrowTurnRightUp', props); },
    ArrowTurnUpLeft(unit, props) { icon('ArrowTurnUpLeft', props); },
    ArrowTurnUpRight(unit, props) { icon('ArrowTurnUpRight', props); },
    ArrowUp(unit, props) { icon('ArrowUp', props); },
    ArrowUpCircle(unit, props) { icon('ArrowUpCircle', props); },
    ArrowUpLeft(unit, props) { icon('ArrowUpLeft', props); },
    ArrowUpOnSquare(unit, props) { icon('ArrowUpOnSquare', props); },
    ArrowUpOnSquareStack(unit, props) { icon('ArrowUpOnSquareStack', props); },
    ArrowUpRight(unit, props) { icon('ArrowUpRight', props); },
    ArrowUpTray(unit, props) { icon('ArrowUpTray', props); },
    ArrowUturnDown(unit, props) { icon('ArrowUturnDown', props); },
    ArrowUturnLeft(unit, props) { icon('ArrowUturnLeft', props); },
    ArrowUturnRight(unit, props) { icon('ArrowUturnRight', props); },
    ArrowUturnUp(unit, props) { icon('ArrowUturnUp', props); },
    ArrowsPointingIn(unit, props) { icon('ArrowsPointingIn', props); },
    ArrowsPointingOut(unit, props) { icon('ArrowsPointingOut', props); },
    ArrowsRightLeft(unit, props) { icon('ArrowsRightLeft', props); },
    ArrowsUpDown(unit, props) { icon('ArrowsUpDown', props); },
    AtSymbol(unit, props) { icon('AtSymbol', props); },
    Backspace(unit, props) { icon('Backspace', props); },
    Backward(unit, props) { icon('Backward', props); },
    Banknotes(unit, props) { icon('Banknotes', props); },
    Bars2(unit, props) { icon('Bars2', props); },
    Bars3(unit, props) { icon('Bars3', props); },
    Bars3BottomLeft(unit, props) { icon('Bars3BottomLeft', props); },
    Bars3BottomRight(unit, props) { icon('Bars3BottomRight', props); },
    Bars3CenterLeft(unit, props) { icon('Bars3CenterLeft', props); },
    Bars4(unit, props) { icon('Bars4', props); },
    BarsArrowDown(unit, props) { icon('BarsArrowDown', props); },
    BarsArrowUp(unit, props) { icon('BarsArrowUp', props); },
    Battery0(unit, props) { icon('Battery0', props); },
    Battery100(unit, props) { icon('Battery100', props); },
    Battery50(unit, props) { icon('Battery50', props); },
    Beaker(unit, props) { icon('Beaker', props); },
    Bell(unit, props) { icon('Bell', props); },
    BellAlert(unit, props) { icon('BellAlert', props); },
    BellSlash(unit, props) { icon('BellSlash', props); },
    BellSnooze(unit, props) { icon('BellSnooze', props); },
    Bold(unit, props) { icon('Bold', props); },
    Bolt(unit, props) { icon('Bolt', props); },
    BoltSlash(unit, props) { icon('BoltSlash', props); },
    BookOpen(unit, props) { icon('BookOpen', props); },
    Bookmark(unit, props) { icon('Bookmark', props); },
    BookmarkSlash(unit, props) { icon('BookmarkSlash', props); },
    BookmarkSquare(unit, props) { icon('BookmarkSquare', props); },
    Briefcase(unit, props) { icon('Briefcase', props); },
    BugAnt(unit, props) { icon('BugAnt', props); },
    BuildingLibrary(unit, props) { icon('BuildingLibrary', props); },
    BuildingOffice(unit, props) { icon('BuildingOffice', props); },
    BuildingOffice2(unit, props) { icon('BuildingOffice2', props); },
    BuildingStorefront(unit, props) { icon('BuildingStorefront', props); },
    Cake(unit, props) { icon('Cake', props); },
    Calculator(unit, props) { icon('Calculator', props); },
    Calendar(unit, props) { icon('Calendar', props); },
    CalendarDateRange(unit, props) { icon('CalendarDateRange', props); },
    CalendarDays(unit, props) { icon('CalendarDays', props); },
    Camera(unit, props) { icon('Camera', props); },
    ChartBar(unit, props) { icon('ChartBar', props); },
    ChartBarSquare(unit, props) { icon('ChartBarSquare', props); },
    ChartPie(unit, props) { icon('ChartPie', props); },
    ChatBubbleBottomCenter(unit, props) { icon('ChatBubbleBottomCenter', props); },
    ChatBubbleBottomCenterText(unit, props) { icon('ChatBubbleBottomCenterText', props); },
    ChatBubbleLeft(unit, props) { icon('ChatBubbleLeft', props); },
    ChatBubbleLeftEllipsis(unit, props) { icon('ChatBubbleLeftEllipsis', props); },
    ChatBubbleLeftRight(unit, props) { icon('ChatBubbleLeftRight', props); },
    ChatBubbleOvalLeft(unit, props) { icon('ChatBubbleOvalLeft', props); },
    ChatBubbleOvalLeftEllipsis(unit, props) { icon('ChatBubbleOvalLeftEllipsis', props); },
    Check(unit, props) { icon('Check', props); },
    CheckBadge(unit, props) { icon('CheckBadge', props); },
    CheckCircle(unit, props) { icon('CheckCircle', props); },
    ChevronDoubleDown(unit, props) { icon('ChevronDoubleDown', props); },
    ChevronDoubleLeft(unit, props) { icon('ChevronDoubleLeft', props); },
    ChevronDoubleRight(unit, props) { icon('ChevronDoubleRight', props); },
    ChevronDoubleUp(unit, props) { icon('ChevronDoubleUp', props); },
    ChevronDown(unit, props) { icon('ChevronDown', props); },
    ChevronLeft(unit, props) { icon('ChevronLeft', props); },
    ChevronRight(unit, props) { icon('ChevronRight', props); },
    ChevronUp(unit, props) { icon('ChevronUp', props); },
    ChevronUpDown(unit, props) { icon('ChevronUpDown', props); },
    CircleStack(unit, props) { icon('CircleStack', props); },
    Clipboard(unit, props) { icon('Clipboard', props); },
    ClipboardDocument(unit, props) { icon('ClipboardDocument', props); },
    ClipboardDocumentCheck(unit, props) { icon('ClipboardDocumentCheck', props); },
    ClipboardDocumentList(unit, props) { icon('ClipboardDocumentList', props); },
    Clock(unit, props) { icon('Clock', props); },
    Cloud(unit, props) { icon('Cloud', props); },
    CloudArrowDown(unit, props) { icon('CloudArrowDown', props); },
    CloudArrowUp(unit, props) { icon('CloudArrowUp', props); },
    CodeBracket(unit, props) { icon('CodeBracket', props); },
    CodeBracketSquare(unit, props) { icon('CodeBracketSquare', props); },
    Cog(unit, props) { icon('Cog', props); },
    Cog6Tooth(unit, props) { icon('Cog6Tooth', props); },
    Cog8Tooth(unit, props) { icon('Cog8Tooth', props); },
    CommandLine(unit, props) { icon('CommandLine', props); },
    ComputerDesktop(unit, props) { icon('ComputerDesktop', props); },
    CpuChip(unit, props) { icon('CpuChip', props); },
    CreditCard(unit, props) { icon('CreditCard', props); },
    Cube(unit, props) { icon('Cube', props); },
    CubeTransparent(unit, props) { icon('CubeTransparent', props); },
    CurrencyBangladeshi(unit, props) { icon('CurrencyBangladeshi', props); },
    CurrencyDollar(unit, props) { icon('CurrencyDollar', props); },
    CurrencyEuro(unit, props) { icon('CurrencyEuro', props); },
    CurrencyPound(unit, props) { icon('CurrencyPound', props); },
    CurrencyRupee(unit, props) { icon('CurrencyRupee', props); },
    CurrencyYen(unit, props) { icon('CurrencyYen', props); },
    CursorArrowRays(unit, props) { icon('CursorArrowRays', props); },
    CursorArrowRipple(unit, props) { icon('CursorArrowRipple', props); },
    DevicePhoneMobile(unit, props) { icon('DevicePhoneMobile', props); },
    DeviceTablet(unit, props) { icon('DeviceTablet', props); },
    Divide(unit, props) { icon('Divide', props); },
    Document(unit, props) { icon('Document', props); },
    DocumentArrowDown(unit, props) { icon('DocumentArrowDown', props); },
    DocumentArrowUp(unit, props) { icon('DocumentArrowUp', props); },
    DocumentChartBar(unit, props) { icon('DocumentChartBar', props); },
    DocumentCheck(unit, props) { icon('DocumentCheck', props); },
    DocumentCurrencyBangladeshi(unit, props) { icon('DocumentCurrencyBangladeshi', props); },
    DocumentCurrencyDollar(unit, props) { icon('DocumentCurrencyDollar', props); },
    DocumentCurrencyEuro(unit, props) { icon('DocumentCurrencyEuro', props); },
    DocumentCurrencyPound(unit, props) { icon('DocumentCurrencyPound', props); },
    DocumentCurrencyRupee(unit, props) { icon('DocumentCurrencyRupee', props); },
    DocumentCurrencyYen(unit, props) { icon('DocumentCurrencyYen', props); },
    DocumentDuplicate(unit, props) { icon('DocumentDuplicate', props); },
    DocumentMagnifyingGlass(unit, props) { icon('DocumentMagnifyingGlass', props); },
    DocumentMinus(unit, props) { icon('DocumentMinus', props); },
    DocumentPlus(unit, props) { icon('DocumentPlus', props); },
    DocumentText(unit, props) { icon('DocumentText', props); },
    EllipsisHorizontal(unit, props) { icon('EllipsisHorizontal', props); },
    EllipsisHorizontalCircle(unit, props) { icon('EllipsisHorizontalCircle', props); },
    EllipsisVertical(unit, props) { icon('EllipsisVertical', props); },
    Envelope(unit, props) { icon('Envelope', props); },
    EnvelopeOpen(unit, props) { icon('EnvelopeOpen', props); },
    Equals(unit, props) { icon('Equals', props); },
    ExclamationCircle(unit, props) { icon('ExclamationCircle', props); },
    ExclamationTriangle(unit, props) { icon('ExclamationTriangle', props); },
    Eye(unit, props) { icon('Eye', props); },
    EyeDropper(unit, props) { icon('EyeDropper', props); },
    EyeSlash(unit, props) { icon('EyeSlash', props); },
    FaceFrown(unit, props) { icon('FaceFrown', props); },
    FaceSmile(unit, props) { icon('FaceSmile', props); },
    Film(unit, props) { icon('Film', props); },
    FingerPrint(unit, props) { icon('FingerPrint', props); },
    Fire(unit, props) { icon('Fire', props); },
    Flag(unit, props) { icon('Flag', props); },
    Folder(unit, props) { icon('Folder', props); },
    FolderArrowDown(unit, props) { icon('FolderArrowDown', props); },
    FolderMinus(unit, props) { icon('FolderMinus', props); },
    FolderOpen(unit, props) { icon('FolderOpen', props); },
    FolderPlus(unit, props) { icon('FolderPlus', props); },
    Forward(unit, props) { icon('Forward', props); },
    Funnel(unit, props) { icon('Funnel', props); },
    Gif(unit, props) { icon('Gif', props); },
    Gift(unit, props) { icon('Gift', props); },
    GiftTop(unit, props) { icon('GiftTop', props); },
    GlobeAlt(unit, props) { icon('GlobeAlt', props); },
    GlobeAmericas(unit, props) { icon('GlobeAmericas', props); },
    GlobeAsiaAustralia(unit, props) { icon('GlobeAsiaAustralia', props); },
    GlobeEuropeAfrica(unit, props) { icon('GlobeEuropeAfrica', props); },
    H1(unit, props) { icon('H1', props); },
    H2(unit, props) { icon('H2', props); },
    H3(unit, props) { icon('H3', props); },
    HandRaised(unit, props) { icon('HandRaised', props); },
    HandThumbDown(unit, props) { icon('HandThumbDown', props); },
    HandThumbUp(unit, props) { icon('HandThumbUp', props); },
    Hashtag(unit, props) { icon('Hashtag', props); },
    Heart(unit, props) { icon('Heart', props); },
    Home(unit, props) { icon('Home', props); },
    HomeModern(unit, props) { icon('HomeModern', props); },
    Identification(unit, props) { icon('Identification', props); },
    Inbox(unit, props) { icon('Inbox', props); },
    InboxArrowDown(unit, props) { icon('InboxArrowDown', props); },
    InboxStack(unit, props) { icon('InboxStack', props); },
    InformationCircle(unit, props) { icon('InformationCircle', props); },
    Italic(unit, props) { icon('Italic', props); },
    Key(unit, props) { icon('Key', props); },
    Language(unit, props) { icon('Language', props); },
    Lifebuoy(unit, props) { icon('Lifebuoy', props); },
    LightBulb(unit, props) { icon('LightBulb', props); },
    Link(unit, props) { icon('Link', props); },
    LinkSlash(unit, props) { icon('LinkSlash', props); },
    ListBullet(unit, props) { icon('ListBullet', props); },
    LockClosed(unit, props) { icon('LockClosed', props); },
    LockOpen(unit, props) { icon('LockOpen', props); },
    MagnifyingGlass(unit, props) { icon('MagnifyingGlass', props); },
    MagnifyingGlassCircle(unit, props) { icon('MagnifyingGlassCircle', props); },
    MagnifyingGlassMinus(unit, props) { icon('MagnifyingGlassMinus', props); },
    MagnifyingGlassPlus(unit, props) { icon('MagnifyingGlassPlus', props); },
    Map(unit, props) { icon('Map', props); },
    MapPin(unit, props) { icon('MapPin', props); },
    Megaphone(unit, props) { icon('Megaphone', props); },
    Microphone(unit, props) { icon('Microphone', props); },
    Minus(unit, props) { icon('Minus', props); },
    MinusCircle(unit, props) { icon('MinusCircle', props); },
    MinusSmall(unit, props) { icon('MinusSmall', props); },
    Moon(unit, props) { icon('Moon', props); },
    MusicalNote(unit, props) { icon('MusicalNote', props); },
    Newspaper(unit, props) { icon('Newspaper', props); },
    NoSymbol(unit, props) { icon('NoSymbol', props); },
    NumberedList(unit, props) { icon('NumberedList', props); },
    PaintBrush(unit, props) { icon('PaintBrush', props); },
    PaperAirplane(unit, props) { icon('PaperAirplane', props); },
    PaperClip(unit, props) { icon('PaperClip', props); },
    Pause(unit, props) { icon('Pause', props); },
    PauseCircle(unit, props) { icon('PauseCircle', props); },
    Pencil(unit, props) { icon('Pencil', props); },
    PencilSquare(unit, props) { icon('PencilSquare', props); },
    PercentBadge(unit, props) { icon('PercentBadge', props); },
    Phone(unit, props) { icon('Phone', props); },
    PhoneArrowDownLeft(unit, props) { icon('PhoneArrowDownLeft', props); },
    PhoneArrowUpRight(unit, props) { icon('PhoneArrowUpRight', props); },
    PhoneXMark(unit, props) { icon('PhoneXMark', props); },
    Photo(unit, props) { icon('Photo', props); },
    Play(unit, props) { icon('Play', props); },
    PlayCircle(unit, props) { icon('PlayCircle', props); },
    PlayPause(unit, props) { icon('PlayPause', props); },
    Plus(unit, props) { icon('Plus', props); },
    PlusCircle(unit, props) { icon('PlusCircle', props); },
    PlusSmall(unit, props) { icon('PlusSmall', props); },
    Power(unit, props) { icon('Power', props); },
    PresentationChartBar(unit, props) { icon('PresentationChartBar', props); },
    PresentationChartLine(unit, props) { icon('PresentationChartLine', props); },
    Printer(unit, props) { icon('Printer', props); },
    PuzzlePiece(unit, props) { icon('PuzzlePiece', props); },
    QrCode(unit, props) { icon('QrCode', props); },
    QuestionMarkCircle(unit, props) { icon('QuestionMarkCircle', props); },
    QueueList(unit, props) { icon('QueueList', props); },
    Radio(unit, props) { icon('Radio', props); },
    ReceiptPercent(unit, props) { icon('ReceiptPercent', props); },
    ReceiptRefund(unit, props) { icon('ReceiptRefund', props); },
    RectangleGroup(unit, props) { icon('RectangleGroup', props); },
    RectangleStack(unit, props) { icon('RectangleStack', props); },
    RocketLaunch(unit, props) { icon('RocketLaunch', props); },
    Rss(unit, props) { icon('Rss', props); },
    Scale(unit, props) { icon('Scale', props); },
    Scissors(unit, props) { icon('Scissors', props); },
    Server(unit, props) { icon('Server', props); },
    ServerStack(unit, props) { icon('ServerStack', props); },
    Share(unit, props) { icon('Share', props); },
    ShieldCheck(unit, props) { icon('ShieldCheck', props); },
    ShieldExclamation(unit, props) { icon('ShieldExclamation', props); },
    ShoppingBag(unit, props) { icon('ShoppingBag', props); },
    ShoppingCart(unit, props) { icon('ShoppingCart', props); },
    Signal(unit, props) { icon('Signal', props); },
    SignalSlash(unit, props) { icon('SignalSlash', props); },
    Slash(unit, props) { icon('Slash', props); },
    Sparkles(unit, props) { icon('Sparkles', props); },
    SpeakerWave(unit, props) { icon('SpeakerWave', props); },
    SpeakerXMark(unit, props) { icon('SpeakerXMark', props); },
    Square2Stack(unit, props) { icon('Square2Stack', props); },
    Square3Stack3d(unit, props) { icon('Square3Stack3d', props); },
    Squares2x2(unit, props) { icon('Squares2x2', props); },
    SquaresPlus(unit, props) { icon('SquaresPlus', props); },
    Star(unit, props) { icon('Star', props); },
    Stop(unit, props) { icon('Stop', props); },
    StopCircle(unit, props) { icon('StopCircle', props); },
    Strikethrough(unit, props) { icon('Strikethrough', props); },
    Sun(unit, props) { icon('Sun', props); },
    Swatch(unit, props) { icon('Swatch', props); },
    TableCells(unit, props) { icon('TableCells', props); },
    Tag(unit, props) { icon('Tag', props); },
    Ticket(unit, props) { icon('Ticket', props); },
    Trash(unit, props) { icon('Trash', props); },
    Trophy(unit, props) { icon('Trophy', props); },
    Truck(unit, props) { icon('Truck', props); },
    Tv(unit, props) { icon('Tv', props); },
    Underline(unit, props) { icon('Underline', props); },
    User(unit, props) { icon('User', props); },
    UserCircle(unit, props) { icon('UserCircle', props); },
    UserGroup(unit, props) { icon('UserGroup', props); },
    UserMinus(unit, props) { icon('UserMinus', props); },
    UserPlus(unit, props) { icon('UserPlus', props); },
    Users(unit, props) { icon('Users', props); },
    Variable(unit, props) { icon('Variable', props); },
    VideoCamera(unit, props) { icon('VideoCamera', props); },
    VideoCameraSlash(unit, props) { icon('VideoCameraSlash', props); },
    ViewColumns(unit, props) { icon('ViewColumns', props); },
    ViewfinderCircle(unit, props) { icon('ViewfinderCircle', props); },
    Wallet(unit, props) { icon('Wallet', props); },
    Wifi(unit, props) { icon('Wifi', props); },
    Window(unit, props) { icon('Window', props); },
    Wrench(unit, props) { icon('Wrench', props); },
    WrenchScrewdriver(unit, props) { icon('WrenchScrewdriver', props); },
    XCircle(unit, props) { icon('XCircle', props); },
    XMark(unit, props) { icon('XMark', props); },
};

const context = window.AudioContext ? new window.AudioContext() : (null);
const master = context ? context.createGain() : (null);
if (context) {
    master.gain.value = 0.1;
    master.connect(context.destination);
}
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
        this.played = null;
    }
    set volume(value) {
        this.amp.gain.value = value;
    }
    get volume() {
        return this.amp.gain.value;
    }
    play({ offset = 0, fade = 0, loop = false } = {}) {
        if (this.buffer !== undefined && this.played === null) {
            this.source = context.createBufferSource();
            this.source.buffer = this.buffer;
            this.source.loop = loop;
            this.source.connect(this.fade);
            this.played = context.currentTime;
            this.source.playbackRate.value = 1;
            this.source.start(context.currentTime, offset / 1000);
            // Apply fade-in effect if fade duration is specified
            if (fade > 0) {
                this.fade.gain.setValueAtTime(0, context.currentTime);
                this.fade.gain.linearRampToValueAtTime(1.0, context.currentTime + fade / 1000);
            }
            this.source.onended = () => {
                var _a;
                this.played = null;
                (_a = this.source) === null || _a === void 0 ? void 0 : _a.disconnect();
                this.source = null;
            };
        }
    }
    pause({ fade = 0 } = {}) {
        var _a, _b;
        if (this.buffer !== undefined && this.played !== null) {
            const elapsed = (context.currentTime - this.played) % this.buffer.duration * 1000;
            // Apply fade-out effect if fade duration is specified
            if (fade > 0) {
                this.fade.gain.setValueAtTime(1.0, context.currentTime);
                this.fade.gain.linearRampToValueAtTime(0, context.currentTime + fade / 1000);
                (_a = this.source) === null || _a === void 0 ? void 0 : _a.stop(context.currentTime + fade / 1000);
            }
            else {
                (_b = this.source) === null || _b === void 0 ? void 0 : _b.stop(context.currentTime);
            }
            this.played = null;
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
    ModalFrame,
    ModalContent,
    AccordionFrame,
    AccordionHeader,
    AccordionBullet,
    AccordionContent,
    TabFrame,
    TabButton,
    TabContent,
    TextStream,
    DragFrame,
    DragTarget,
    AnalogStick,
    DirectionalPad,
};
const audio = {
    load(path) {
        const music = new AudioFile(path);
        const object = {
            play(options) {
                const unit = xnew();
                if (music.played === null) {
                    music.play(options);
                    unit.on('finalize', () => music.pause({ fade: options.fade }));
                }
            },
            pause(options) {
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
const xnew = Object.assign(xnew$1, { basics, audio, icons });

export { xnew as default };
