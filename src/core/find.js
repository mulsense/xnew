
import { isObject, isString, isFunction, error } from '../common';
import { Unit } from './unit';

export function find(...args) {
    // current Unit
    let current = null;
    if (args[0] === null || args[0] instanceof Unit) {
        current = args.shift();
    }
    const component = args[0];

    if (isFunction(component) === false) {
        error('xnew.find', 'The argument is invalid.', 'component');
    } else if (isFunction(component) === true) {
        if (current !== null) {
            return [...Unit.components.get(component)].filter((unit) => {
                let temp = unit;
                while (temp !== null) {
                    if (temp === current) {
                        return true;
                    } else {
                        temp = temp.parent;
                    }
                }
                return false;
            });
        } else {
            return [...Unit.components.get(component)];
        }
    }
}
