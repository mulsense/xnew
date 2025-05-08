import { isObject, isNumber, isString, isFunction } from '../common';
import { Unit } from './unit';
import { UnitScope, UnitComponent, UnitElement, UnitPromise, UnitEvent } from './unitex';
import { Timer } from './timer';

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

    try {
        return new Unit(parent, target, ...args);
    } catch (error) {
        console.error(`xnew: ${error.message}`);
    }
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
    try {
        const current = UnitScope.current;
        if (current._.state === 'pending') {
            return UnitElement.nest(current, attributes);
        } else {
            throw new Error(`This function can not be called after initialized.`);
        }
    } catch (error) {
        console.error(`xnew.nest(attributes): ${error.message}`);
    }
}

function extend(component, ...args) {
    try {
        const current = UnitScope.current;
        if (current._.state === 'pending') {
            return Unit.extend(current, component, ...args);
        } else {
            throw new Error(`This function can not be called after initialized.`);
        }
    } catch (error) {
        console.error(`xnew.extend(component, ...args): ${error.message}`);
    }
}

function context(key, value = undefined) {
    if (isString(key) === false) {
        console.error(`xnew.context(key, value?): The argument [key] is invalid.`);
    } else {
        if (value !== undefined) {
            UnitScope.push(key, value);
        } else {
            return UnitScope.trace(key);
        }
    }
}

function promise(mix) {
    try {
        return UnitPromise.execute(mix);
    } catch (error) {
        console.error(`xnew.promise(mix): ${error.message}`);
    }
}

function find(component) {
    if (isFunction(component) === false) {
        console.error(`xnew.find: The argument [component] is invalid.`);
    } else if (isFunction(component) === true) {
        return UnitComponent.find(component);
    }
}

function emit(type, ...args) {
    const unit = UnitScope.current;
    if (isString(type) === false) {
        console.error(`xnew.emit: The argument [type] is invalid.`);
    } else if (unit?._.state === 'finalized') {
        console.error(`xnew.emit: This function can not be called after finalized.`);
    } else {
        UnitEvent.emit(unit, type, ...args);
    }
}

function scope(callback) {
    const snapshot = UnitScope.snapshot();
    return (...args) => UnitScope.execute(snapshot, callback, ...args);
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
