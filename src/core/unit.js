import { isObject, isNumber, isString, isFunction, createElement, MapSet, MapMap, error } from './util';

export class Unit
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
            return func(...args);
        } catch (error) {
            throw error;
        } finally {
            Unit.current = backup;
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
        if (this._.resolved === false || this._.tostart === false) {
        } else if (['pending', 'stopped'].includes(this._.state) === true) {
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
