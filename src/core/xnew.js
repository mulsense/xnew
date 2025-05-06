import { isObject, isNumber, isString, isFunction, error } from '../common';
import { Unit } from './unit';
import { Timer } from './timer';
import { UnitComponent } from './component';
import { UnitEvent } from './event';
import { UnitScope, ScopedPromise } from './scope';

//----------------------------------------------------------------------------------------------------
// xnew main
//----------------------------------------------------------------------------------------------------

export function xnew(...args) {
    let parent = UnitScope.current;
    if (isFunction(args[0]) === false && args[0] instanceof Unit) {
        parent = args.shift();
    } else if (args[0] === null) {
        parent = args.shift();
    } else if (args[0] === undefined) {
        args.shift();
    }

    let target = null;
    if (args[0] instanceof Element || args[0] instanceof Window || args[0] instanceof Document) {
        // an existing html element
        target = args.shift();
    } else if (isString(args[0]) === true) {
        // a string for an existing html element
        const key = args.shift();
        target = document.querySelector(key);
        if (target == null) {
            console.error(`xnew: '${key}' can not be found.`);
        }
    } else if (isObject(args[0]) === true) {
        // an attributes for a new html element
        target = args.shift();
    } else if (args[0] === null || args[0] === undefined) {
        args.shift();
    }

    return new Unit(parent, target, ...args);
}

//----------------------------------------------------------------------------------------------------
// members
//----------------------------------------------------------------------------------------------------

Object.defineProperty(xnew, 'root', { get: () => UnitScope.current?._.root });
Object.defineProperty(xnew, 'parent', { get: () => UnitScope.current?._.parent });
Object.defineProperty(xnew, 'current', { get: () => UnitScope.current });

Object.defineProperty(xnew, 'nest', { value: nest });
Object.defineProperty(xnew, 'extend', { value: extend });

Object.defineProperty(xnew, 'context', { value: context });
Object.defineProperty(xnew, 'promise', { value: promise });
Object.defineProperty(xnew, 'find', { value: find });
Object.defineProperty(xnew, 'event', { get: () => UnitEvent.event });
Object.defineProperty(xnew, 'emit', { value: emit });
Object.defineProperty(xnew, 'scope', { value: scope });

Object.defineProperty(xnew, 'timer', { value: timer });
Object.defineProperty(xnew, 'interval', { value: interval });
Object.defineProperty(xnew, 'transition', { value: transition });


function nest(attributes) {
    const current = UnitScope.current;
    if (current.element instanceof Window || current.element instanceof Document) {
        error(`xnew.nest(attributes): No elements are added to window or document.`);
    } else if (isObject(attributes) === false) {
        error(`xnew.nest(attributes): The argument [attributes] is invalid.`);
    } else if (current._.state !== 'pending') {
        error(`xnew.nest(attributes): This function can not be called after initialized.`);
    } else {
        return Unit.nest.call(current, attributes);
    }
}

function extend(component, ...args) {
    const current = UnitScope.current;
    if (isFunction(component) === false) {
        error(`xnew.extend(component, ...args): The argument [component] is invalid.`);
    } else if (current._.state !== 'pending') {
        error(`xnew.extend(component, ...args): This function can not be called after initialized.`);
    }  else {
        return Unit.extend.call(current, component, ...args);
    }
}

function context(key, value = undefined) {
    if (isString(key) === false) {
        error(`xnew.context(key, value?): The argument [key] is invalid.`);
    } else {
        if (value !== undefined) {
            UnitScope.next(key, value);
        } else {
            return UnitScope.trace(key);
        }
    }
}

function promise(mix) {
    let promise = null;
    if (mix instanceof Promise) {
        promise = mix;
    } else if (isFunction(mix) === true) {
        promise = new Promise(mix);
    } else if (mix instanceof Unit) {
        promise = mix._.promises.length > 0 ? Promise.all(mix._.promises) : Promise.resolve();
    } else {
        error(`xnew.promise(mix): The argument [mix] is invalid.`);
    }
    if (promise) {
        const scopedpromise = new ScopedPromise((resolve, reject) => {
            promise.then((...args) => resolve(...args));
            promise.catch((...args) => reject(...args));
        });
        UnitScope.current._.promises.push(promise);
        return scopedpromise;
    }
}

function find(component) {
    if (isFunction(component) === false) {
        error(`xnew.find: The argument [component] is invalid.`);
    } else if (isFunction(component) === true) {
        return UnitComponent.find(component);
    }
}

function emit(type, ...args) {
    const unit = UnitScope.current;
    if (isString(type) === false) {
        error(`xnew.emit: The argument [type] is invalid.`);
    } else if (unit?._.state === 'finalized') {
        error(`xnew.emit: This function can not be called after finalized.`);
    } else {
        UnitEvent.emit(unit, type, ...args);
    }
}

function scope(callback) {
    const snapshot = UnitScope.snapshot();
    return (...args) => {
        UnitScope.execute(snapshot, callback, ...args);
    };
}

function timer(callback, delay) {
    const snapshot = UnitScope.snapshot();
    const unit = xnew((self) => {
        const timer = new Timer({
            timeout: () => UnitScope.execute(snapshot, callback),
            finalize: () => self.finalize(),
            delay,
        });
        return {
            finalize() {
                timer.clear();
            }
        };
    });
    return { clear: () => unit.finalize() };
}

function interval(callback, delay) {
    const snapshot = UnitScope.snapshot();
    const unit = xnew((self) => {
        const timer = new Timer({
            timeout: () => UnitScope.execute(snapshot, callback),
            finalize: () => self.finalize(),
            delay,
            loop: true,
        });
        return {
            finalize() {
                timer.clear();
            }
        };
    });
    return { clear: () => unit.finalize() };
}

function transition(callback, interval) {
    const snapshot = UnitScope.snapshot();
    const unit = xnew((self) => {
        const timer = new Timer({
            timeout: () => UnitScope.execute(snapshot, callback, 1.0),
            finalize: () => self.finalize(),
            delay: interval,
        });

        UnitScope.execute(snapshot, callback, 0.0);

        const updater = xnew(null, (self) => {
            return {
                update() {
                    const progress = timer.elapsed() / interval;
                    if (progress < 1.0) {
                        UnitScope.execute(snapshot, callback, progress);
                    }
                },
            }
        });
        return {
            finalize() {
                timer.clear();
                updater.finalize();
            }
        };
    });

    return { clear: () => unit.finalize() };
}
