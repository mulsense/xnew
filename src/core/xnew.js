import { isObject, isNumber, isString, isFunction, error } from '../common';
import { Unit } from './unit';
import { timer, interval, transition } from './timer';
import { Component } from './component';
import { event } from './event';
import { Scope } from './scope';

export function xnew(...args) {
    // parent Unit
    let parent = undefined;
    if (isFunction(args[0]) === false && args[0] instanceof Unit) {
        parent = args.shift();
    } else if (args[0] === null) {
        parent = args.shift();
    } else if (args[0] === undefined) {
        parent = args.shift();
        parent = Scope.current
    } else {
        parent = Scope.current
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
Object.defineProperty(xnew, 'event', { enumerable: true, get: event });
Object.defineProperty(xnew, 'current', { enumerable: true, get: () => Scope.current });

Object.defineProperty(xnew, 'timer', { enumerable: true, value: timer });
Object.defineProperty(xnew, 'interval', { enumerable: true, value: interval });
Object.defineProperty(xnew, 'transition', { enumerable: true, value: transition });


function nest(attributes) {
    if (Scope.current.element instanceof Window || Scope.current.element instanceof Document) {
        error('xnew.nest', 'No elements are added to window or document.');
    } else if (isObject(attributes) === false) {
        error('xnew.nest', 'The argument is invalid.', 'attributes');
    } else if (Scope.current._.state !== 'pending') {
        error('xnew.nest', 'This function can not be called after initialized.');
    } else {
        return Unit.nest.call(Scope.current, attributes);
    }
}

function extend(component, ...args) {
    if (isFunction(component) === false) {
        error('xnew.extend', 'The argument is invalid.', 'component');
    } else if (Scope.current._.state !== 'pending') {
        error('xnew.extend', 'This function can not be called after initialized.');
    }  else {
        return Unit.extend.call(Scope.current, component, ...args);
    }
}

function context(key, value = undefined) {
    if (isString(key) === false) {
        error('context', 'The argument is invalid.', 'key');
    } else {
        if (value !== undefined) {
            Scope.next(key, value);
        } else {
            return Scope.trace(key);
        }
    }
}

function promise(executor) {
    return Unit.promise.call(Scope.current, executor);
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
        return Component.find(base, component);
    }
}