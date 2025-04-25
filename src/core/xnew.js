import { isObject, isNumber, isString, isFunction, error } from '../common';
import { Unit } from './unit';
import { Timer } from './timer';
import { UnitComponent } from './component';
import { UnitEvent } from './event';
import { UnitScope, ScopedPromise } from './scope';

export function xnew(...args) {
    let parent = undefined;
    if (isFunction(args[0]) === false && args[0] instanceof Unit) {
        parent = args.shift();
    } else if (args[0] === null) {
        parent = args.shift();
    } else if (args[0] === undefined) {
        parent = args.shift();
        parent = UnitScope.current
    } else {
        parent = UnitScope.current
    }

    // input target
    let target = undefined;
    if (args[0] instanceof Element || args[0] instanceof Window || args[0] instanceof Document) {
        // an existing html element
        target = args.shift();
    } else if (isString(args[0]) === true) {
        // a string for an existing html element
        const name = args.shift();
        target = document.querySelector(name);
        if (target == null) {
            error('xnew', `'${name}' can not be found.`, 'target');
        }
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
Object.defineProperty(xnew, 'promise', { enumerable: true, value: promise });
Object.defineProperty(xnew, 'find', { enumerable: true, value: find });
Object.defineProperty(xnew, 'event', { enumerable: true, get: () => UnitEvent.event });
Object.defineProperty(xnew, 'root', { enumerable: true, get: () => UnitScope.current?._.root });
Object.defineProperty(xnew, 'emit', { enumerable: true, value: emit });
Object.defineProperty(xnew, 'scope', { enumerable: true, value: scope });
Object.defineProperty(xnew, 'current', { enumerable: true, get: () => UnitScope.current });

Object.defineProperty(xnew, 'timer', { enumerable: true, value: timer });
Object.defineProperty(xnew, 'interval', { enumerable: true, value: interval });
Object.defineProperty(xnew, 'transition', { enumerable: true, value: transition });

function nest(attributes) {
    if (UnitScope.current.element instanceof Window || UnitScope.current.element instanceof Document) {
        error('xnew.nest', 'No elements are added to window or document.');
    } else if (isObject(attributes) === false) {
        error('xnew.nest', 'The argument is invalid.', 'attributes');
    } else if (UnitScope.current._.state !== 'pending') {
        error('xnew.nest', 'This function can not be called after initialized.');
    } else {
        return Unit.nest.call(UnitScope.current, attributes);
    }
}

function extend(component, ...args) {
    if (isFunction(component) === false) {
        error('xnew.extend', 'The argument is invalid.', 'component');
    } else if (UnitScope.current._.state !== 'pending') {
        error('xnew.extend', 'This function can not be called after initialized.');
    }  else {
        return Unit.extend.call(UnitScope.current, component, ...args);
    }
}

function context(key, value = undefined) {
    if (isString(key) === false) {
        error('context', 'The argument is invalid.', 'key');
    } else {
        if (value !== undefined) {
            UnitScope.next(key, value);
        } else {
            return UnitScope.trace(key);
        }
    }
}

function promise(data) {
    let promise = null;
    if (data instanceof Promise) {
        promise = data;
    } else if (data instanceof Unit) {
        promise = data._.promises.length > 0 ? Promise.all(data._.promises) : Promise.resolve();
    } else {
        error('unit promise', 'The property is invalid.', data);
    }
    if (promise) {
        const scopedpromise = new ScopedPromise((resolve, reject) => {
            promise.then((...args) => resolve(...args)).catch((...args) => reject(...args));
        });
        const unit = UnitScope.current;
        unit._.promises.push(promise);
        return scopedpromise;
    }
}

function find(...args) {
    let base = null;
    if (args[0] === null || args[0] instanceof Unit) {
        base = args.shift();
    }
    const component = args[0];

    if (isFunction(component) === false) {
        error('xnew.find', 'The argument is invalid.', 'component');
    } else if (isFunction(component) === true) {
        return UnitComponent.find(base, component);
    }
}

function emit(type, ...args) {
    const unit = UnitScope.current;
    if (isString(type) === false) {
        error('xnew.emit', 'The argument is invalid.', 'type');
    } else if (unit?._.state === 'finalized') {
        error('xnew.emit', 'This function can not be called after finalized.');
    } else {
        UnitEvent.emit(unit, type, ...args);
    }
}

function scope(callback) {
    const snapshot = UnitScope.snapshot;
    return (...args) => {
        UnitScope.execute(snapshot.unit, snapshot.context, callback, ...args);
    };
}

function timer(callback, delay) {
    let finalizer = null;

    const snapshot = UnitScope.snapshot;
    const timer = new Timer({
        timeout: () => UnitScope.execute(snapshot.unit, snapshot.context, callback),
        finalize: () => finalizer.finalize(),
        delay,
    });

    timer.start();

    finalizer = xnew(snapshot.unit, (self) => {
        return {
            finalize() {
                timer.clear();
            }
        }
    });

    return { clear: () => timer.clear() };
}

function interval(callback, delay) {
    let finalizer = null;

    const snapshot = UnitScope.snapshot;
    const timer = new Timer({
        timeout: () => UnitScope.execute(snapshot.unit, snapshot.context, callback),
        finalize: () => finalizer.finalize(),
        delay,
        loop: true,
    });

    timer.start();

    finalizer = xnew(snapshot.unit, (self) => {
        return {
            finalize() {
                timer.clear();
            }
        }
    });

    return { clear: () => timer.clear() };
}

function transition(callback, interval) {
    let finalizer = null;
    let updater = null;

    const snapshot = UnitScope.snapshot;
    const timer = new Timer({
        timeout: () => UnitScope.execute(snapshot.unit, snapshot.context, callback, { progress: 1.0 }),
        finalize: () => finalizer.finalize(),
        delay: interval,
    });
    const clear = function () {
        timer.clear();
    }

    timer.start();

    UnitScope.execute(snapshot.unit, snapshot.context, callback, { progress: 0.0 });

    updater = xnew(null, (self) => {
        return {
            update() {
                const progress = timer.elapsed() / interval;
                if (progress < 1.0) {
                    UnitScope.execute(snapshot.unit, snapshot.context, callback, { progress });
                }
            },
        }
    });

    finalizer = xnew(snapshot.unit, (self) => {
        return {
            finalize() {
                timer.clear();
                updater.finalize();
            }
        }
    });

    return { clear };
}

