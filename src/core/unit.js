import { isObject, isNumber, isString, isFunction, createElement, error } from './util';
import { MapSet, MapMap } from './exmap';
import { ticker } from './ticker';

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
            baseElement = document.currentScript?.parentElement ?? document.body;
        }
    
        this._ = {
            root: parent?._.root ?? this,   // root unit 
            parent,                         // parent unit
            baseElement,                    // base element
            nestElements: [],               // nest elements
            context: parent?._.context,     // context stack
            keys: new Set(),                // keys
            listeners: new MapMap(),        // event listners
        };
    
        (parent?._.children ?? Unit.roots).add(this);
        Unit.initialize.call(this, parent, target, component, ...args);
    }

    //----------------------------------------------------------------------------------------------------
    // base system 
    //----------------------------------------------------------------------------------------------------

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

    get isRunning()
    {
        return this._.state === 'running';
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

    reboot()
    {
        Unit.stop.call(this);
        Unit.finalize.call(this);
        (this._.parent?._.children ?? Unit.roots).add(this);
        Unit.initialize.call(this, ...this._.backup);
    }


    // current unit scope
    static current = null;

    static scope(context, func, ...args)
    {
        const backup = { unit: Unit.current, context: this?._.context };
        try {
            Unit.current = this;
            if (this && context !== undefined) {
                this._.context = context;
            }
            return func(...args);
        } catch (error) {
            throw error;
        } finally {
            Unit.current = backup.unit;
            if (this && context !== undefined) {
                this._.context = backup.context;
            }
        }
    }

    static nest(attributes)
    {
        const element = createElement(attributes, this.element);
        this.element.append(element);
        this._.nestElements.push(element);
        return element;
    }

    static initialize(parent, target, component, ...args)
    {
        this._ = Object.assign(this._, {
            backup: [parent, target, component, ...args],
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
                Unit.scope.call(this, undefined, () => {
                    Unit.extend.call(this, component, ...args);
                });
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

        const props = component(this, ...args) ?? {};
        
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
                        this._.props[key] = key !== 'finalize' ?
                            () => { previous(); descripter.value(); } :
                            () => { descripter.value(); previous(); };
                    } else {
                        this._.props[key] = () => { descripter.value(); };
                    }
                } else {
                    error('unit extend', 'The property is invalid.', key);
                }
            } else if (this[key] === undefined) {
                const dest = { configurable: true, enumerable: true };
                const context = this._.context;
                if (isFunction(descripter.value) === true) {
                    dest.value = (...args) => Unit.scope.call(this, context, descripter.value, ...args);
                } else if (descripter.value !== undefined) {
                    dest.value = descripter.value;
                }
                if (isFunction(descripter.get) === true) {
                    dest.get = (...args) => Unit.scope.call(this, context, descripter.get, ...args);
                }
                if (isFunction(descripter.set) === true) {
                    dest.set = (...args) => Unit.scope.call(this, context, descripter.set, ...args);
                }
                Object.defineProperty(this._.props, key, dest);
                Object.defineProperty(this, key, dest);
            } else {
                error('unit extend', 'The property already exists.', key);
            }
        });
    }

    static start(time)
    {
        if (this._.resolved === false || this._.tostart === false) {
        } else if (['pending', 'stopped'].includes(this._.state) === true) {
            this._.state = 'running';
            this._.children.forEach((unit) => Unit.start.call(unit, time));
            if (isFunction(this._.props.start) === true) {
                Unit.scope.call(this, this._.context, this._.props.start);
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
                Unit.scope.call(this, this._.context, this._.props.stop);
            }
        }
    }

    static update(time)
    {
        if (['running'].includes(this._.state) === true) {
            this._.children.forEach((unit) => Unit.update.call(unit, time));

            if (['running'].includes(this._.state) && isFunction(this._.props.update) === true) {
                Unit.scope.call(this, this._.context, this._.props.update);
            }
        }
    }

    static finalize()
    {
        if (['finalized'].includes(this._.state) === false) {
            this._.state = 'finalized';
            
            [...this._.children].forEach((unit) => unit.finalize());
            
            if (isFunction(this._.props.finalize)) {
                Unit.scope.call(this, this._.context, this._.props.finalize);
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
            this._.context = null;

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
        
        ticker.reset();
        ticker.start();
        ticker.append((time) => {
            Unit.roots.forEach((unit) => {
                Unit.start.call(unit, time);
                Unit.update.call(unit, time);
            });
        });
    }

    //----------------------------------------------------------------------------------------------------
    // event 
    //----------------------------------------------------------------------------------------------------

    static event = null;

    static etypes = new MapSet();
  
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
                const context = this._.context;
                const execute = (...args) => {
                    const eventbackup = Unit.event;
                    
                    if (type[0] === '-' || type[0] === '+') {
                        Unit.event = { type };
                        Unit.scope.call(this, context, listener, ...args);
                    } else {
                        Unit.event = { type: args[0]?.etype ?? null };
                        Unit.scope.call(this, context, listener, ...args);
                    }
                    Unit.event = eventbackup;
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
        } else if (type[0] === '+') {
            Unit.etypes.get(type)?.forEach((unit) => {
                unit._.listeners.get(type)?.forEach(([element, execute]) => execute(...args));
            });
        } else if (type[0] === '-') {
            this._.listeners.get(type)?.forEach(([element, execute]) => execute(...args));
        }
    }

    //----------------------------------------------------------------------------------------------------
    // context 
    //----------------------------------------------------------------------------------------------------

    static context(key, value = undefined)
    {
        if (value !== undefined) {
            this._.context = [this._.context, key, value];
        } else {
            let ret = undefined;
            for (let context = this._.context; context !== undefined; context = context[0]) {
                if (context[1] === key) {
                    ret = context[2];
                    break;
                }
            }
            return ret;
        }
    }

    //----------------------------------------------------------------------------------------------------
    // find 
    //----------------------------------------------------------------------------------------------------

    static find(component) {
        const set = new Set();
        Unit.components.get(component)?.forEach((unit) => {
            set.add(unit);
        });
        return [...set];
    }
}
Unit.reset();
