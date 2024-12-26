import { isObject, isNumber, isString, isFunction, createElement, MapSet, MapMap, error } from './util';

export class XNode
{
    constructor(parent, target, Component, ...args)
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
            parent,                         // parent xnode
            baseElement,                    // base element
            nestElements: [],               // nest elements
            contexts: new Map(),            // context value
            keys: new Set(),                // keys
            listeners: new MapMap(),        // event listners
        };
    
        (parent?._.children ?? XNode.roots).add(this);
        
        const self = this;
        
        Object.defineProperty(this, 'parent', { enumerable: true, get: getParent.bind(this) });
        Object.defineProperty(this, 'element', { enumerable: true, get: getElement.bind(this) });
        Object.defineProperty(this, 'promise', { enumerable: true, get: getPromise.bind(this) });
        Object.defineProperty(this, 'state', { enumerable: true, get: getState.bind(this) });
    
        Object.defineProperty(this, 'start', { enumerable: true, value: start.bind(this) });
        Object.defineProperty(this, 'stop', { enumerable: true, value: stop.bind(this) });
        Object.defineProperty(this, 'finalize', { enumerable: true, value: finalize.bind(this) });
        Object.defineProperty(this, 'reboot', { enumerable: true, value: reboot.bind(this) });
        Object.defineProperty(this, 'on', { enumerable: true, value: on.bind(this) });
        Object.defineProperty(this, 'off', { enumerable: true, value: off.bind(this) });
        Object.defineProperty(this, 'emit', { enumerable: true, value: emit.bind(this) });
    
        XNode.initialize.call(this, parent, target, Component, ...args); 

        function getParent()
        {
            return this._.parent;
        }

        function getElement()
        {
            return this._.nestElements.slice(-1)[0] ?? this._.baseElement;
        }

        function getPromise()
        {
            return this._.promises.length > 0 ? Promise.all(this._.promises) : Promise.resolve();
        }

        function getState()
        {
            return this._.state
        }

        function start()
        {
            this._.tostart = true;
        }

        function stop()
        {
            this._.tostart = false;
            XNode.stop.call(this);
        }

        function finalize()
        {
            XNode.stop.call(this);
            XNode.finalize.call(this);

            (this._.parent?._.children ?? XNode.roots).delete(this);
        }

        function reboot(...args)
        {
            XNode.stop.call(this);
            XNode.finalize.call(this);
            
            (this._.parent?._.children ?? XNode.roots).add(this);
            XNode.initialize.call(this, ...this._.backup, ...args);
        }

        function on(type, listener, options)
        {
            if (isString(type) === false) {
                error('xnode on', 'The argument is invalid.', 'type');
            } else if (isFunction(listener) === false) {
                error('xnode on', 'The argument is invalid.', 'listener');
            } else {
                type.trim().split(/\s+/).forEach((type) => internal.call(this, type, listener));
            }

            function internal(type, listener) {
                if (this._.listeners.has(type, listener) === false) {
                    const element = this.element;
                    const execute = (...args) => {
                        XNode.scope.call(this, listener, ...args);
                    };
                    this._.listeners.set(type, listener, [element, execute]);
                    element.addEventListener(type, execute, options);
                }
                if (this._.listeners.has(type) === true) {
                    XNode.etypes.add(type, this);
                }
            }
        }

        function off(type, listener)
        {
            if (type !== undefined && isString(type) === false) {
                error('xnode off', 'The argument is invalid.', 'type');
            } else if (listener !== undefined && isFunction(listener) === false) {
                error('xnode off', 'The argument is invalid.', 'listener');
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
                    XNode.etypes.delete(type, this);
                }
            }
        }

        function emit(type, ...args)
        {
            if (isString(type) === false) {
                error('xnode emit', 'The argument is invalid.', 'type');
            } else if (this._.state === 'finalized') {
                error('xnode emit', 'This function can not be called after finalized.');
            } else {
                type.trim().split(/\s+/).forEach((type) => internal.call(this, type));
            }
            function internal(type) {
                if (type[0] === '~') {
                    XNode.etypes.get(type)?.forEach((xnode) => {
                        xnode._.listeners.get(type)?.forEach(([element, execute]) => execute(...args));
                    });
                } else {
                    this._.listeners.get(type)?.forEach(([element, execute]) => execute(...args));
                }
            }
        }
    }

    // current xnode scope
    static current = null;

    static scope(func, ...args)
    {
        const proto = XNode.xnew.__proto__;

        const backup = XNode.current;
        try {
            XNode.current = this;
            XNode.xnew.__proto__ = this;
            return func(...args);
        } catch (error) {
            throw error;
        } finally {
            XNode.current = backup;
            XNode.xnew.__proto__ = proto;
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

    static initialize(parent, target, Component, ...args)
    {
        this._ = Object.assign(this._, {
            backup: [parent, target, Component],
            children: new Set(),            // children xnodes
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
                XNode.nest.call(this, target);
            }

            // setup Component
            if (isFunction(Component) === true) {
                XNode.extend.call(this, Component, ...args);
            } else if (isObject(target) === true && isString(Component) === true) {
                this.element.innerHTML = Component;
            }

            // whether the xnode promise was resolved
            this.promise.then((response) => { this._.resolved = true; return response; });
        }
    }

    static components = new MapSet();

    static extend(Component, ...args)
    {
        this._.components.add(Component);
        XNode.components.add(Component, this);

        const props = XNode.scope.call(this, Component, ...args) ?? {};
        
        Object.keys(props).forEach((key) => {
            const descripter = Object.getOwnPropertyDescriptor(props, key);

            if (key === 'promise') {
                if (descripter.value instanceof Promise) {
                    this._.promises.push(descripter.value);
                } else {
                    error('xnode extend', 'The property is invalid.', key);
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
                    error('xnode extend', 'The property is invalid.', key);
                }
            } else if (this._.props[key] !== undefined || this[key] === undefined) {
                const dest = { configurable: true, enumerable: true };

                if (isFunction(descripter.value) === true) {
                    dest.value = (...args) => XNode.scope.call(this, descripter.value, ...args);
                } else if (descripter.value !== undefined) {
                    dest.value = descripter.value;
                }
                if (isFunction(descripter.get) === true) {
                    dest.get = (...args) => XNode.scope.call(this, descripter.get, ...args);
                }
                if (isFunction(descripter.set) === true) {
                    dest.set = (...args) => XNode.scope.call(this, descripter.set, ...args);
                }
                Object.defineProperty(this._.props, key, dest);
                Object.defineProperty(this, key, dest);
            } else {
                error('xnode extend', 'The property already exists.', key);
            }
        });
        const { promise, start, update, stop, finalize, ...original } = props;
        return original;
    }

    static ticker(time)
    {
        XNode.start.call(this, time);
        XNode.update.call(this, time);
    }

    static start(time)
    {
        if (this._.resolved === false || this._.tostart === false) {
        } else if (['pending', 'stopped'].includes(this._.state) === true) {
            this._.state = 'running';
            this._.children.forEach((xnode) => XNode.start.call(xnode, time));

            if (isFunction(this._.props.start) === true) {
                XNode.scope.call(this, this._.props.start);
            }
        } else if (['running'].includes(this._.state) === true) {
            this._.children.forEach((xnode) => XNode.start.call(xnode, time));
        }
    }

    static stop()
    {
        if (['running'].includes(this._.state) === true) {
            this._.state = 'stopped';
            this._.children.forEach((xnode) => XNode.stop.call(xnode));

            if (isFunction(this._.props.stop)) {
                XNode.scope.call(this, this._.props.stop);
            }
        }
    }

    static update(time)
    {
        if (['running'].includes(this._.state) === true) {
            this._.children.forEach((xnode) => XNode.update.call(xnode, time));

            if (['running'].includes(this._.state) && isFunction(this._.props.update) === true) {
                XNode.scope.call(this, this._.props.update);
            }
        }
    }

    static finalize()
    {
        if (['finalized'].includes(this._.state) === false) {
            this._.state = 'finalized';
            
            [...this._.children].forEach((xnode) => xnode.finalize());
            
            if (isFunction(this._.props.finalize)) {
                XNode.scope.call(this, this._.props.finalize);
            }

            this._.components.forEach((Component) => {
                XNode.components.delete(Component, this);
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

    static roots = new Set();   // root xnodes
    static animation = null;    // animation callback id

    static reset()
    {
        XNode.roots.forEach((xnode) => xnode.finalize());
        XNode.roots.clear();

        if (XNode.animation !== null) {
            cancelAnimationFrame(XNode.animation);
            XNode.animation = null;
        }
        XNode.animation = requestAnimationFrame(function ticker() {
            const time = Date.now();
            XNode.roots.forEach((xnode) => XNode.ticker.call(xnode, time));
            XNode.animation = requestAnimationFrame(ticker);
        });
    }
}

XNode.reset();

