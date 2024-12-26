import { isObject, isString, isFunction, Timer, error } from './util';
import { XNode } from './xnode';

export function xnew(...args)
{
    // parent xnode
    let parent = undefined;
    if (isFunction(args[0]) === false && args[0] instanceof XNode) {
        parent = args.shift();
    } else if (args[0] === null) {
        parent = args.shift();
    } else if (args[0] === undefined) {
        parent = args.shift();
        parent = XNode.current
    } else {
        parent = XNode.current
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
        error('xnew', 'The argument is invalid.', 'Component');
    } else {
        return new XNode(parent, target, ...args);
    }
}

XNode.xnew = xnew;

Object.defineProperty(xnew, 'current', { enumerable: true, get: getCurrent });

Object.defineProperty(xnew, 'nest', { enumerable: true, value: nest });
Object.defineProperty(xnew, 'extend', { enumerable: true, value: extend });
Object.defineProperty(xnew, 'context', { enumerable: true, value: context });
Object.defineProperty(xnew, 'find', { enumerable: true, value: find });
Object.defineProperty(xnew, 'timer', { enumerable: true, value: timer });

function getCurrent()
{
    return XNode.current;
}

function nest(attributes)
{
    const current = XNode.current;

    if (current.element instanceof Window || current.element instanceof Document) {
        error('xnew.nest', 'No elements are added to window or document.');
    } else if (isObject(attributes) === false) {
        error('xnew.nest', 'The argument is invalid.', 'attributes');
    } else if (current._.state !== 'pending') {
        error('xnew.nest', 'This function can not be called after initialized.');
    } else {
        return XNode.nest.call(current, attributes);
    }
}

function extend(component, ...args)
{
    const current = XNode.current;

    if (isFunction(component) === false) {
        error('xnew.extend', 'The argument is invalid.', 'component');
    } else if (current._.state !== 'pending') {
        error('xnew.extend', 'This function can not be called after initialized.');
    } else if (current._.components.has(component) === true) {
        error('xnew.extend', 'This function has already been added.');
    } else {
        return XNode.extend.call(current, component, ...args);
    }
}

function context(key, value)
{
    const current = XNode.current;

    if (isString(key) === false) {
        error('xnew.context', 'The argument is invalid.', 'key');
    } else {
        return XNode.context.call(current, key, value);
    }
}

function find(Component)
{
    if (isFunction(Component) === false) {
        error('xnew.find', 'The argument is invalid.', 'Component');
    } else if (isFunction(Component) === true) {
        const set = new Set();
        XNode.components.get(Component)?.forEach((xnode) => set.add(xnode));
        return [...set];
    }
}

function timer(callback, delay = 0, loop = false)
{
    const current = XNode.current;

    const timer = new Timer(() => {
        XNode.scope.call(current, callback);
    }, delay, loop);

    if (document !== undefined) {
        if (document.hidden === false) {
            Timer.start.call(timer);
        }
        const xdoc = xnew(document);
        xdoc.on('visibilitychange', (event) => {
            document.hidden === false ? Timer.start.call(timer) : Timer.stop.call(timer);
        });
    } else {
        Timer.start.call(timer);
    }

    xnew(() => {
        return {
            finalize() {
                timer.clear();
            }
        }
    });
    return timer;
}

function transition(callback, delay = 0, loop = false)
{
    const current = XNode.current;

    const timer = new Timer(() => {
        XNode.scope.call(current, callback);
    }, delay, loop);

    if (document !== undefined) {
        if (document.hidden === false) {
            Timer.start.call(timer);
        }
        const xdoc = xnew(document);
        xdoc.on('visibilitychange', (event) => {
            document.hidden === false ? Timer.start.call(timer) : Timer.stop.call(timer);
        });
    } else {
        Timer.start.call(timer);
    }

    xnew(() => {
        return {
            start() {
            },
            finalize() {
                timer.clear();
            }
        }
    });
    return timer;
}
