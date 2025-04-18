import { isObject, isNumber, isString, isFunction, error } from '../common';
import { Unit } from './unit';

export class ScopedPromise extends Promise {
    then(callback) {
        const [unit, context] = [Unit.current, Unit.current?._.context];
        super.then((...args) => Unit.scope.call(unit, context, callback, ...args));
        return this;
    }

    catch(callback) {
        const [unit, context] = [Unit.current, Unit.current?._.context];
        super.then((...args) => Unit.scope.call(unit, context, callback, ...args));
        return this;
    }

    finally(callback) {
        const [unit, context] = [Unit.current, Unit.current?._.context];
        super.then((...args) => Unit.scope.call(unit, context, callback, ...args));
        return this;
    }
}