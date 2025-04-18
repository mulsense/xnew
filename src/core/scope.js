import { isObject, isNumber, isString, isFunction, error } from '../common';
import { Unit } from './unit';

// current scope
let current = null;

export function scope(unit, context, func, ...args) {
    const stack = [current, unit?._.context];

    try {
        current = unit;
        if (unit && context !== undefined) {
            unit._.context = context;
        }
        return func(...args);
    } catch (error) {
        throw error;
    } finally {
        current = stack[0];
        if (unit && context !== undefined) {
            unit._.context = stack[1];
        }
    }
}

Object.defineProperty(scope, 'current', { enumerable: true, get: () => current });
