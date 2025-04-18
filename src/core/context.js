import { isObject, isNumber, isString, isFunction, error } from '../common';
import { Unit } from './unit';
import { scope } from './scope';

export function context(key, value = undefined) {
    if (isString(key) === false) {
        error('context', 'The argument is invalid.', 'key');
    } else {
        const unit = scope.current;
        if (value !== undefined) {
            unit._.context = [unit._.context, key, value];
        } else {
            let ret = undefined;
            for (let context = unit._.context; context !== null; context = context[0]) {
                if (context[1] === key) {
                    ret = context[2];
                    break;
                }
            }
            return ret;
        }
    }
}