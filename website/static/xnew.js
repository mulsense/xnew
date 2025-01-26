(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xnew = factory());
})(this, (function () { 'use strict';

    //----------------------------------------------------------------------------------------------------
    // error 
    //----------------------------------------------------------------------------------------------------

    function error(name, text, target = undefined)
    {
        console.error(name + (target !== undefined ? ` [${target}]` : '') + ': ' + text);
    }

    //----------------------------------------------------------------------------------------------------
    // type check
    //----------------------------------------------------------------------------------------------------

    function isString(value)
    {
        return typeof value === 'string';
    }

    function isFunction(value)
    {
        return typeof value === 'function';
    }

    function isObject(value)
    {
        return value !== null && typeof value === 'object' && value.constructor === Object;
    }

    //----------------------------------------------------------------------------------------------------
    // create element from attributes
    //----------------------------------------------------------------------------------------------------

    function createElement(attributes, parentElement = null)
    {
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
                } else if (isObject(value) === true){
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

    //----------------------------------------------------------------------------------------------------
    // map set / map map
    //----------------------------------------------------------------------------------------------------

    class MapSet extends Map
    {
        has(key, value)
        {
            if (value === undefined) {
                return super.has(key);
            } else {
                return super.has(key) && super.get(key).has(value);
            }
        }

        add(key, value)
        {
            if (this.has(key) === false) {
                this.set(key, new Set());
            }
            this.get(key).add(value);
        }

        delete(key, value)
        {
            if (this.has(key, value) === false) {
                return;
            }
            this.get(key).delete(value);
            if (this.get(key).size === 0) {
                super.delete(key);
            }
        }
    }

    class MapMap extends Map
    {
        has(key, subkey)
        {
            if (subkey === undefined) {
                return super.has(key);
            } else {
                return super.has(key) && super.get(key).has(subkey);
            }
        }

        set(key, subkey, value)
        {
            if (super.has(key) === false) {
                super.set(key, new Map());
            }
            super.get(key).set(subkey, value);
        }

        get(key, subkey)
        {
            if (subkey === undefined) {
                return super.get(key);
            } else {
                return super.get(key)?.get(subkey);
            }
        }

        delete(key, subkey)
        {
            if (this.has(key) === false) {
                return;
            }
            this.get(key).delete(subkey);
            if (this.get(key).size === 0) {
                super.delete(key);
            }
        }
    }

    //----------------------------------------------------------------------------------------------------
    // timer
    //----------------------------------------------------------------------------------------------------

    class Timer
    {
        constructor({ timeout, finalize = null, delay = 0, loop = false })
        {
            this.timeout = timeout;
            this.finalize = finalize;
            this.delay = delay;
            this.loop = loop;

            this.id = null;
            this.time = null;
            this.offset = 0.0;
        }

        clear()
        {
            if (this.id === null) {
                clearTimeout(this.id);
                this.id = null;
                this.finalize?.();
            }
        }

        static elapsed()
        {
            return this.offset + (this.id !== null ? (Date.now() - this.time) : 0);
        }

        static id()
        {
            return this.id;
        }

        static start()
        {
            if (this.id === null) {
                this.id = setTimeout(() => {
                    this.timeout();

                    this.id = null;
                    this.time = null;
                    this.offset = 0.0;
        
                    if (this.loop) {
                        Timer.start.call(this);
                    } else {
                        this.finalize?.();
                    }
                }, this.delay - this.offset);
                this.time = Date.now();
            }
        }

        static stop()
        {
            if (this.id !== null) {
                this.offset = this.offset + Date.now() - this.time;
                clearTimeout(this.id);

                this.id = null;
                this.time = null;
            }
        }
    }

    const gthis = window ?? global;

    class Unit
    {
        constructor(parent, target, component, ...args)
        {
            let baseElement = null;
            if (target instanceof Element || target instanceof Window || target instanceof Document) {
                baseElement = target;
            } else if (parent !== null) {
                baseElement = parent.element;
            } else if (document instanceof Document) {
                baseElement = document.body;
            }
        
            this._ = {
                parent,                         // parent unit
                baseElement,                    // base element
                nestElements: [],               // nest elements
                contexts: new Map(),            // context value
                keys: new Set(),                // keys
                listeners: new MapMap(),        // event listners
            };
        
            (parent?._.children ?? Unit.roots).add(this);
            Unit.initialize.call(this, parent, target, component, ...args);
        }

        get parent()
        {
            return this._.parent;
        }

        get element()
        {
            return this._.nestElements.slice(-1)[0] ?? this._.baseElement;
        }

        get promise()
        {
            return this._.promises.length > 0 ? Promise.all(this._.promises) : Promise.resolve();
        }

        get state()
        {
            return this._.state
        }

        start()
        {
            this._.tostart = true;
        }

        stop()
        {
            this._.tostart = false;
            Unit.stop.call(this);
        }

        finalize()
        {
            Unit.stop.call(this);
            Unit.finalize.call(this);
            (this._.parent?._.children ?? Unit.roots).delete(this);
        }

        reboot(...args)
        {
            Unit.stop.call(this);
            Unit.finalize.call(this);
            (this._.parent?._.children ?? Unit.roots).add(this);
            Unit.initialize.call(this, ...this._.backup, ...args);
        }

        on(type, listener, options)
        {
            if (isString(type) === false) {
                error('unit on', 'The argument is invalid.', 'type');
            } else if (isFunction(listener) === false) {
                error('unit on', 'The argument is invalid.', 'listener');
            } else {
                type.trim().split(/\s+/).forEach((type) => internal.call(this, type, listener));
            }

            function internal(type, listener) {
                if (this._.listeners.has(type, listener) === false) {
                    const element = this.element;
                    const execute = (...args) => {
                        Unit.scope.call(this, listener, ...args);
                    };
                    this._.listeners.set(type, listener, [element, execute]);
                    element.addEventListener(type, execute, options);
                }
                if (this._.listeners.has(type) === true) {
                    Unit.etypes.add(type, this);
                }
            }
        }

        off(type, listener)
        {
            if (type !== undefined && isString(type) === false) {
                error('unit off', 'The argument is invalid.', 'type');
            } else if (listener !== undefined && isFunction(listener) === false) {
                error('unit off', 'The argument is invalid.', 'listener');
            } else if (isString(type) === true && listener !== undefined) {
                type.trim().split(/\s+/).forEach((type) => internal.call(this, type, listener));
            } else if (isString(type) === true && listener === undefined) {
                type.trim().split(/\s+/).forEach((type) => {
                    this._.listeners.get(type)?.forEach((_, listener) => internal.call(this, type, listener));
                });
            } else if (type === undefined) {
                this._.listeners.forEach((map, type) => {
                    map.forEach((_, listener) => internal.call(this, type, listener));
                });
            }

            function internal(type, listener) {
                if (this._.listeners.has(type, listener) === true) {
                    const [element, execute] = this._.listeners.get(type, listener);
                    this._.listeners.delete(type, listener);
                    element.removeEventListener(type, execute);
                }
                if (this._.listeners.has(type) === false) {
                    Unit.etypes.delete(type, this);
                }
            }
        }

        emit(type, ...args)
        {
            if (isString(type) === false) {
                error('unit emit', 'The argument is invalid.', 'type');
            } else if (this._.state === 'finalized') {
                error('unit emit', 'This function can not be called after finalized.');
            } else {
                type.trim().split(/\s+/).forEach((type) => internal.call(this, type));
            }
            function internal(type) {
                if (type[0] === '~') {
                    Unit.etypes.get(type)?.forEach((unit) => {
                        unit._.listeners.get(type)?.forEach(([element, execute]) => execute(...args));
                    });
                } else {
                    this._.listeners.get(type)?.forEach(([element, execute]) => execute(...args));
                }
            }
        }

        // current unit scope
        static current = null;

        static scope(func, ...args)
        {
            const backup = Unit.current;
            try {
                Unit.current = this;
                gthis.xthis = this;
                return func(...args);
            } catch (error) {
                throw error;
            } finally {
                Unit.current = backup;
                gthis.xthis = backup;
            }
        }

        static nest(attributes)
        {
            const element = createElement(attributes, this.element);
            this.element.append(element);
            this._.nestElements.push(element);
            return element;
        }

        static etypes = new MapSet();

        static context(key, value = undefined)
        {
            if (value !== undefined) {
                this._.contexts.set(key, value);
            } else {
                let ret = undefined;
                for (let target = this; target !== null; target = target.parent) {
                    if (target._.contexts.has(key)) {
                        ret = target._.contexts.get(key);
                        break;
                    }
                }
                return ret;
            }
        }

        static find(component) {
            const set = new Set();
            Unit.components.get(component)?.forEach((Unit) => set.add(Unit));
            return [...set];
        }

        static initialize(parent, target, component, ...args)
        {
            this._ = Object.assign(this._, {
                backup: [parent, target, component],
                children: new Set(),            // children units
                state: 'pending',               // [pending -> running <-> stopped -> finalized]
                tostart: false,                 // flag for start
                promises: [],                   // promises
                resolved: false,                // promise check
                components: new Set(),          // components functions
                props: {},                      // properties in the component function
            });

            if (parent !== null && ['finalized'].includes(parent._.state)) {
                this._.state = 'finalized';
            } else {
                this._.tostart = true;

                // nest html element
                if (isObject(target) === true && this.element instanceof Element) {
                    Unit.nest.call(this, target);
                }

                // setup component
                if (isFunction(component) === true) {
                    Unit.extend.call(this, component, ...args);
                } else if (isObject(target) === true && isString(component) === true) {
                    this.element.innerHTML = component;
                }

                // whether the unit promise was resolved
                this.promise.then((response) => { this._.resolved = true; return response; });
            }
        }

        static components = new MapSet();

        static extend(component, ...args)
        {
            this._.components.add(component);
            Unit.components.add(component, this);

            const props = Unit.scope.call(this, component, ...args) ?? {};
            
            Object.keys(props).forEach((key) => {
                const descripter = Object.getOwnPropertyDescriptor(props, key);

                if (key === 'promise') {
                    if (descripter.value instanceof Promise) {
                        this._.promises.push(descripter.value);
                    } else {
                        error('unit extend', 'The property is invalid.', key);
                    }
                } else if (['start', 'update', 'stop', 'finalize'].includes(key)) {
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
                } else if (this._.props[key] !== undefined || this[key] === undefined) {
                    const dest = { configurable: true, enumerable: true };

                    if (isFunction(descripter.value) === true) {
                        dest.value = (...args) => Unit.scope.call(this, descripter.value, ...args);
                    } else if (descripter.value !== undefined) {
                        dest.value = descripter.value;
                    }
                    if (isFunction(descripter.get) === true) {
                        dest.get = (...args) => Unit.scope.call(this, descripter.get, ...args);
                    }
                    if (isFunction(descripter.set) === true) {
                        dest.set = (...args) => Unit.scope.call(this, descripter.set, ...args);
                    }
                    Object.defineProperty(this._.props, key, dest);
                    Object.defineProperty(this, key, dest);
                } else {
                    error('unit extend', 'The property already exists.', key);
                }
            });
            const { promise, start, update, stop, finalize, ...original } = props;
            return original;
        }

        static start(time)
        {
            if (this._.resolved === false || this._.tostart === false) ; else if (['pending', 'stopped'].includes(this._.state) === true) {
                this._.state = 'running';
                this._.children.forEach((unit) => Unit.start.call(unit, time));

                if (isFunction(this._.props.start) === true) {
                    Unit.scope.call(this, this._.props.start);
                }
            } else if (['running'].includes(this._.state) === true) {
                this._.children.forEach((unit) => Unit.start.call(unit, time));
            }
        }

        static stop()
        {
            if (['running'].includes(this._.state) === true) {
                this._.state = 'stopped';
                this._.children.forEach((unit) => Unit.stop.call(unit));

                if (isFunction(this._.props.stop)) {
                    Unit.scope.call(this, this._.props.stop);
                }
            }
        }

        static update(time)
        {
            if (['running'].includes(this._.state) === true) {
                this._.children.forEach((unit) => Unit.update.call(unit, time));

                if (['running'].includes(this._.state) && isFunction(this._.props.update) === true) {
                    Unit.scope.call(this, this._.props.update);
                }
            }
        }

        static finalize()
        {
            if (['finalized'].includes(this._.state) === false) {
                this._.state = 'finalized';
                
                [...this._.children].forEach((unit) => unit.finalize());
                
                if (isFunction(this._.props.finalize)) {
                    Unit.scope.call(this, this._.props.finalize);
                }

                this._.components.forEach((component) => {
                    Unit.components.delete(component, this);
                });
                this._.components.clear();
                
                // reset props
                Object.keys(this._.props).forEach((key) => {
                    if (['promise', 'start', 'update', 'stop', 'finalize'].includes(key) === false) {
                        delete this[key];
                    }
                });
                this._.props = {};

                this.off();
                this._.contexts.clear();

                if (this._.nestElements.length > 0) {
                    this._.baseElement.removeChild(this._.nestElements[0]);
                    this._.nestElements = [];
                }
            }
        }

        static roots = new Set();   // root units
        static animation = null;    // animation callback id

        static reset()
        {
            Unit.roots.forEach((unit) => unit.finalize());
            Unit.roots.clear();

            if (Unit.animation !== null) {
                cancelAnimationFrame(Unit.animation);
                Unit.animation = null;
            }

            const interval = 1000 / 60;
            let prev = Date.now();
            Unit.animation = requestAnimationFrame(function ticker() {
                const time = Date.now();
                if (time - prev > interval * 0.8) {
                    prev = time;
                    Unit.roots.forEach((unit) => Unit.ticker.call(unit, time));
                }
                Unit.animation = requestAnimationFrame(ticker);
            });
        }
        
        static ticker(time)
        {
            Unit.start.call(this, time);
            Unit.update.call(this, time);
        }
    }
    Unit.reset();

    function xnew(...args)
    {
        // parent Unit
        let parent = undefined;
        if (isFunction(args[0]) === false && args[0] instanceof Unit) {
            parent = args.shift();
        } else if (args[0] === null) {
            parent = args.shift();
        } else if (args[0] === undefined) {
            parent = args.shift();
            parent = Unit.current;
        } else {
            parent = Unit.current;
        }

        // input target
        let target = undefined;
        if (args[0] instanceof Element || args[0] instanceof Window || args[0] instanceof Document) {
            // an existing html element
            target = args.shift();
        } else if (isString(args[0]) === true) {
            // a string for an existing html element
            target = document.querySelector(args.shift());
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
    Object.defineProperty(xnew, 'context', { enumerable: true, value: context });
    Object.defineProperty(xnew, 'find', { enumerable: true, value: find });
    Object.defineProperty(xnew, 'timer', { enumerable: true, value: timer });
    Object.defineProperty(xnew, 'transition', { enumerable: true, value: transition });

    function nest(attributes)
    {
        if (Unit.current.element instanceof Window || Unit.current.element instanceof Document) {
            error('xnew.nest', 'No elements are added to window or document.');
        } else if (isObject(attributes) === false) {
            error('xnew.nest', 'The argument is invalid.', 'attributes');
        } else if (Unit.current._.state !== 'pending') {
            error('xnew.nest', 'This function can not be called after initialized.');
        } else {
            return Unit.nest.call(Unit.current, attributes);
        }
    }

    function extend(component, ...args)
    {
        if (isFunction(component) === false) {
            error('xnew.extend', 'The argument is invalid.', 'component');
        } else if (Unit.current._.state !== 'pending') {
            error('xnew.extend', 'This function can not be called after initialized.');
        } else if (Unit.current._.components.has(component) === true) {
            error('xnew.extend', 'This function has already been added.');
        } else {
            return Unit.extend.call(Unit.current, component, ...args);
        }
    }

    function context(key, value)
    {
        if (isString(key) === false) {
            error('xnew.context', 'The argument is invalid.', 'key');
        } else {
            return Unit.context.call(Unit.current, key, value);
        }
    }

    function find(component)
    {
        if (isFunction(component) === false) {
            error('xnew.find', 'The argument is invalid.', 'component');
        } else if (isFunction(component) === true) {
            return Unit.find.call(Unit.current, component);
        }
    }

    function timer(callback, delay, loop = false)
    {
        let finalizer = null;

        const current = Unit.current;
        const timer = new Timer({
            timeout: () => {
                Unit.scope.call(current, callback);
            }, 
            finalize: () => {
                finalizer.finalize();
            },
            delay,
            loop,
        });
        
        if (document !== undefined) {
            if (document.hidden === false) {
                Timer.start.call(timer);
            }
            const doc = xnew(document);
            doc.on('visibilitychange', (event) => {
                document.hidden === false ? Timer.start.call(timer) : Timer.stop.call(timer);
            });
        } else {
            Timer.start.call(timer);
        }

        finalizer = xnew(() => {
            return {
                finalize() {
                    timer.clear();
                }
            }
        });

        return timer;
    }

    function transition(callback, interval)
    {
        let finalizer = null;

        const current = Unit.current;
        const timer = new Timer({ 
            timeout: () => {
                Unit.scope.call(current, callback, 1.0);
            },
            finalize: () => {
                finalizer.finalize();
            },
            delay: interval,
        });

        if (document !== undefined) {
            if (document.hidden === false) {
                Timer.start.call(timer);
            }
            const doc = xnew(document);
            doc.on('visibilitychange', (event) => {
                document.hidden === false ? Timer.start.call(timer) : Timer.stop.call(timer);
            });
        } else {
            Timer.start.call(timer);
        }

        Unit.scope.call(current, callback, 0.0);

        const updater = xnew(null, () => {
            return {
                update() {
                    const progress = Timer.elapsed.call(timer) / interval;
                    if (progress < 1.0) {
                        Unit.scope.call(current, callback, progress);
                    }
                },
            }
        });
        
        finalizer = xnew(() => {
            return {
                finalize() {
                    timer.clear();
                    updater.finalize();
                }
            }
        });

        return timer;
    }

    function DragEvent() {
      
        const self = xthis;
        const base = xnew();

        const wmap = new Map();
        let current = null;

        base.on('pointerdown', (event) => {
            const id = event.pointerId;
            const rect = self.element.getBoundingClientRect();
            const position = getPosition(event, rect);
            let previous = position;
           
            const xwin = xnew(window);
            wmap.set(id, xwin);

            xwin.on('pointermove', (event) => {
                if (event.pointerId === id) {
                    const position = getPosition(event, rect);
                    const delta = { x: position.x - previous.x, y: position.y - previous.y };
                    
                    self.emit('move', event, { type: 'move', position, delta });
                    previous = position;
                }
            });

            xwin.on('pointerup', (event) => {
                if (event.pointerId === id) {
                    const position = getPosition(event, rect);
                    self.emit('up', event, { type: 'up', position, });
                    xwin.finalize();
                    xmap.delete(id);
                }
            });

            xwin.on('pointercancel', (event) => {
                if (event.pointerId === id) {
                    const position = getPosition(event, rect);
                    self.emit('cancel', event, { type: 'cancel', position, });
                    xwin.finalize();
                    xmap.delete(id);
                }
            });

            current = { id, position };
            self.emit('down', event, { type: 'down', position });
        });

        function getPosition(event, rect) {
            return { x: event.clientX - rect.left, y: event.clientY - rect.top };
        }

        return {
            cancel() {
                if (current !== null) {
                    xmap.get(current).finalize();
                    xmap.delete(current);
                }
            }
        }
    }

    function GestureEvent() {
        const self = xthis;
        const drag = xnew(DragEvent);

        let isActive = false;
        const map = new Map();

        drag.on('down', (event, { position }) => {
            const id = event.pointerId;
            map.set(id, { ...position });
          
            isActive = map.size === 2 ? true : false;
            if (isActive === true) {
                self.emit('down', event, { type: 'down', });
            }
        });

        drag.on('move', (event, { position, delta }) => {
            const id = event.pointerId;
            if (isActive === true) {
                const a = map.get(id);
                map.delete(id);
                const b = [...map.values()][0]; 

                const v = { x: a.x - b.x, y: a.y - b.y };
                const s =  v.x * v.x + v.y * v.y;
                const scale = 1 + (s > 0.0 ? (v.x * delta.x + v.y * delta.y) / s : 0);
                self.emit('move', event, { type: 'move', scale, });
            }
            map.set(id, { ...position });
        });

        drag.on('up cancel', (event, { type }) => {
            const id = event.pointerId;
            if (isActive === true) {
                self.emit(type, event, { type, });
            }
            isActive = false;
            map.delete(id);
        });

        return {
           
        }
    }

    function ResizeEvent() {
        const self = xthis;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                self.emit('resize');
                break;
            }
        });

        if (xthis.element) {
            observer.observe(xthis.element);
        }
        return {
            finalize() {
                if (xthis.element) {
                    observer.unobserve(xthis.element);
                }
            }
        }
    }

    function Screen({ width = 640, height = 480, objectFit = 'contain', pixelated = false } = {}) {
        const wrapper = xnew.nest({ style: 'position: relative; width: 100%; height: 100%; user-select: none; overflow: hidden;' });
        const absolute = xnew.nest({ style: 'position: absolute; inset: 0; margin: auto; user-select: none;' });
        xnew.nest({ style: 'position: relative; width: 100%; height: 100%; user-select: none;' });

        const size = { width, height };
        const canvas = xnew({ tagName: 'canvas', width, height, style: 'position: absolute; width: 100%; height: 100%; vertical-align: bottom; user-select: none;' });
        
        if (pixelated === true) {
            canvas.element.style.imageRendering = 'pixelated';
        }
        
        objectFit = ['fill', 'contain', 'cover'].includes(objectFit) ? objectFit : 'contain';
        const observer = xnew(wrapper, ResizeEvent);
        observer.on('resize', resize);
        resize();

        function resize() {
            const aspect = size.width / size.height;
           
            let style = { width: '100%', height: '100%', top: '0', left: '0', bottom: '0', right: '0' };
            if (objectFit === 'fill') ; else if (objectFit === 'contain') {
                if (wrapper.clientWidth < wrapper.clientHeight * aspect) {
                    style.height = Math.floor(wrapper.clientWidth / aspect) + 'px';
                } else {
                    style.width = Math.floor(wrapper.clientHeight * aspect) + 'px';
                }
            } else if (objectFit === 'cover') {
                if (wrapper.clientWidth < wrapper.clientHeight * aspect) {
                    style.width = Math.floor(wrapper.clientHeight * aspect) + 'px';
                    style.left = Math.floor((wrapper.clientWidth - wrapper.clientHeight * aspect) / 2) + 'px';
                    style.right = 'auto';
                } else {
                    style.height = Math.floor(wrapper.clientWidth / aspect) + 'px';
                    style.top = Math.floor((wrapper.clientHeight - wrapper.clientWidth / aspect) / 2) + 'px';
                    style.bottom = 'auto';
                }
            }
            Object.assign(absolute.style, style);
        }

        return {
            get width() {
                return size.width;
            },
            get height() {
                return size.height;
            },
            get canvas() {
                return canvas.element;
            },
            resize(width, height) {
                size.width = width;
                size.height = height;
                canvas.element.width = width;
                canvas.element.height = height;
                resize();
            },
            clear(color = null) {
                const ctx = canvas.element.getContext('2d');
                ctx.clearRect(0, 0, size.width, size.height);
                if (typeof color === 'string') {
                    ctx.fillStyle = color;
                    ctx.fillRect(0, 0, size.width, size.height);  
                }
            },
        }
    }

    Object.defineProperty(xnew, 'Screen', { enumerable: true, value: Screen });
    Object.defineProperty(xnew, 'DragEvent', { enumerable: true, value: DragEvent });
    Object.defineProperty(xnew, 'GestureEvent', { enumerable: true, value: GestureEvent });
    Object.defineProperty(xnew, 'ResizeEvent', { enumerable: true, value: ResizeEvent });

    return xnew;

}));
