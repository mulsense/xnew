import { isObject, isString, isFunction, Timer, error } from './util';
import { Unit } from './unit';

export function xnew(...args)
{
    // parent Unit
    let parent = undefined;
    if (isFunction(args[0]) === false && args[0] instanceof Unit) {
        parent = args.shift();
    } else if (args[0] === null) {
        parent = args.shift();
    } else if (args[0] === undefined) {
        parent = args.shift();
        parent = Unit.current
    } else {
        parent = Unit.current
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
Object.defineProperty(xnew, 'find', { enumerable: true, value: find });
Object.defineProperty(xnew, 'timer', { enumerable: true, value: timer });
Object.defineProperty(xnew, 'transition', { enumerable: true, value: transition });
Object.defineProperty(xnew, 'event', { enumerable: true, get: event });

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
        return Unit.extend.call(Unit.current, component, ...args);
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
        timeout: () => Unit.scope.call(current, callback), 
        finalize: () => finalizer.finalize(),
        delay,
        loop,
    });
    
    timer.start();

    finalizer = xnew((self) => {
        return {
            finalize() {
                timer.clear();
            }
        }
    });

    return { clear: () => timer.clear() };
}

function transition(callback, interval)
{
    let finalizer = null;
    let updater = null;

    const current = Unit.current;
    const timer = new Timer({ 
        timeout: () => Unit.scope.call(current, callback, 1.0),
        finalize: () => finalizer.finalize(),
        delay: interval,
    });

    timer.start();

    Unit.scope.call(current, callback, 0.0);

    updater = xnew(null, (self) => {
        return {
            update() {
                const progress = timer.elapsed() / interval;
                if (progress < 1.0) {
                    Unit.scope.call(current, callback, progress);
                }
            },
        }
    });
    
    finalizer = xnew((self) => {
        return {
            finalize() {
                timer.clear();
                updater.finalize();
            }
        }
    });

    return { clear: () => timer.clear() };
}

function event() {
    return Unit.event;
}