import { isObject, isNumber, isString, isFunction, error } from '../common';
import { Unit } from './unit';
import { scope } from './scope';

export function promise(executor) {
    return Unit.promise.call(scope.current, executor);
}

export class ScopedPromise extends Promise {
    then(callback) {
        const [unit, context] = [scope.current, scope.current?._.context];
        super.then((...args) => scope(unit, context, callback, ...args));
        return this;
    }

    catch(callback) {
        const [unit, context] = [scope.current, scope.current?._.context];
        super.then((...args) => scope(unit, context, callback, ...args));
        return this;
    }

    finally(callback) {
        const [unit, context] = [scope.current, scope.current?._.context];
        super.then((...args) => scope(unit, context, callback, ...args));
        return this;
    }
}