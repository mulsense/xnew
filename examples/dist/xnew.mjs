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
    add(element, type, listener, options) {
        const props = { element, type, listener, options };
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
    remove(type, listener) {
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
        this.add(element, 'dragstart', dragstart, options);
        this.add(element, 'dragmove', dragmove, options);
        this.add(element, 'dragend', dragend, options);
        function getOthers(id) {
            const backup = map.get(id);
            map.delete(id);
            const others = [...map.values()];
            map.set(id, backup);
            return others;
        }
        return () => {
            this.remove('dragstart', dragstart);
            this.remove('dragmove', dragmove);
            this.remove('dragend', dragend);
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
    constructor(parent, target, component, props, config) {
        var _a, _b;
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
        const protect = (_b = config === null || config === void 0 ? void 0 : config.protect) !== null && _b !== void 0 ? _b : false;
        this._ = { parent, target, baseElement, baseContext, baseComponent, props, config: { protect } };
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
                unit._.eventManager.add(unit.element, type, execute, options);
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
                unit._.eventManager.remove(type, item.execute);
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
                const find = [unit, ...unit._.ancestors].find(u => u._.config.protect === true);
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
        this.unit = new Unit(Unit.currentUnit, null, UnitTimer.Component, Object.assign({ snapshot: Unit.snapshot(Unit.currentUnit) }, options));
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
            timer.unit = new Unit(Unit.currentUnit, null, UnitTimer.Component, Object.assign({ snapshot: Unit.snapshot(Unit.currentUnit) }, options));
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
            timer.unit = new Unit(Unit.currentUnit, null, UnitTimer.Component, timer.stack.shift());
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

function parseArguments(...args) {
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
    return { target, component, props };
}
const xnew$1 = Object.assign(function (...args) {
    if (Unit.rootUnit === undefined)
        Unit.reset();
    const { target, component, props } = parseArguments(...args);
    return new Unit(Unit.currentUnit, target, component, props, { protect: false });
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
    protect(...args) {
        if (Unit.rootUnit === undefined)
            Unit.reset();
        const { target, component, props } = parseArguments(...args);
        return new Unit(Unit.currentUnit, target, component, props, { protect: true });
    },
});

function Accordion(unit, { open = false, duration = 200, easing = 'ease' } = {}) {
    xnew$1.context('xnew.accordion', unit);
    unit.on('-transition', ({ state }) => unit.state = state);
    xnew$1.timeout(() => xnew$1.emit('-transition', { state: open ? 1.0 : 0.0 }));
    return {
        state: open ? 1.0 : 0.0,
        toggle() {
            if (unit.state === 1.0) {
                unit.close();
            }
            else if (unit.state === 0.0) {
                unit.open();
            }
        },
        open() {
            if (unit.state === 0.0) {
                xnew$1.transition((x) => xnew$1.emit('-transition', { state: x }), duration, easing);
            }
        },
        close() {
            if (unit.state === 1.0) {
                xnew$1.transition((x) => xnew$1.emit('-transition', { state: 1.0 - x }), duration, easing);
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

function Modal(unit, { duration = 200, easing = 'ease' } = {}) {
    xnew$1.context('xnew.modalframe', unit);
    xnew$1.nest('<div style="position: fixed; inset: 0; z-index: 1000;">');
    unit.on('click', ({ event }) => unit.close());
    unit.on('-transition', ({ state }) => unit.state = state);
    xnew$1.transition((x) => xnew$1.emit('-transition', { state: x }), duration, easing);
    return {
        state: 0.0,
        close() {
            xnew$1.transition((x) => xnew$1.emit('-transition', { state: 1.0 - x }), duration, easing)
                .timeout(() => unit.finalize());
        }
    };
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
    unit.on('dragstart dragmove', ({ type, position }) => {
        const x = position.x - newsize / 2;
        const y = position.y - newsize / 2;
        const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (newsize / 4));
        const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
        const vector = { x: Math.cos(a) * d, y: Math.sin(a) * d };
        target.element.style.filter = 'brightness(80%)';
        target.element.style.left = `${vector.x * newsize / 4}px`;
        target.element.style.top = `${vector.y * newsize / 4}px`;
        const nexttype = { dragstart: '-down', dragmove: '-move' }[type];
        xnew$1.emit(nexttype, { type: nexttype, vector });
    });
    unit.on('dragend', () => {
        const vector = { x: 0, y: 0 };
        target.element.style.filter = '';
        target.element.style.left = `${vector.x * newsize / 4}px`;
        target.element.style.top = `${vector.y * newsize / 4}px`;
        xnew$1.emit('-up', { type: '-up', vector });
    });
}
function DirectionalPad(unit, { diagonal = true, stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round', fill = '#FFF', fillOpacity = 0.8 } = {}) {
    const outer = xnew$1.nest(`<div style="position: relative; width: 100%; height: 100%;">`);
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
    unit.on('dragstart dragmove', ({ type, position }) => {
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
        targets[0].element.style.filter = (vector.y < 0) ? 'brightness(80%)' : '';
        targets[1].element.style.filter = (vector.y > 0) ? 'brightness(80%)' : '';
        targets[2].element.style.filter = (vector.x < 0) ? 'brightness(80%)' : '';
        targets[3].element.style.filter = (vector.x > 0) ? 'brightness(80%)' : '';
        const nexttype = { dragstart: '-down', dragmove: '-move' }[type];
        xnew$1.emit(nexttype, { type: nexttype, vector });
    });
    unit.on('dragend', () => {
        const vector = { x: 0, y: 0 };
        targets[0].element.style.filter = '';
        targets[1].element.style.filter = '';
        targets[2].element.style.filter = '';
        targets[3].element.style.filter = '';
        xnew$1.emit('-up', { type: '-up', vector });
    });
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
    Modal,
    Accordion,
    TextStream,
    AnalogStick,
    DirectionalPad,
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
