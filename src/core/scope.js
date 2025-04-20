import { isObject, isNumber, isString, isFunction, error } from '../common';

export class Scope {
    static current = null;

    static set(unit, context, func, ...args) {
        const stack = [Scope.current, Context.get(unit)];

        try {
            Scope.current = unit;
            if (unit && context !== undefined) {
                Context.set(unit, context);
            }
            return func(...args);
        } catch (error) {
            throw error;
        } finally {
            Scope.current = stack[0];
            if (unit && context !== undefined) {
                Context.set(unit, stack[1]);
            }
        }
    }
}

export class Context {
    static map = new Map();

    static set(unit, context) {
        Context.map.set(unit, context);
    }

    static get(unit) {
        return Context.map.get(unit) ?? null;
    }

    static clear(unit) {
        Context.map.delete(unit);
    }


    static next(key, value) {
        const unit = Scope.current;
        Context.map.set(unit, [Context.map.get(unit), key, value]);
    }

    static trace(key) {
        const unit = Scope.current;
        let ret = undefined;
        for (let context = Context.map.get(unit); context !== null; context = context[0]) {
            if (context[1] === key) {
                ret = context[2];
                break;
            }
        }
        return ret;
    }
}

export class ScopedPromise extends Promise {
    then(callback) {
        const [unit, context] = [Scope.current, Context.get(Scope.current)];
        super.then((...args) => Scope.set(unit, context, callback, ...args));
        return this;
    }

    catch(callback) {
        const [unit, context] = [Scope.current, Context.get(Scope.current)];
        super.then((...args) => Scope.set(unit, context, callback, ...args));
        return this;
    }

    finally(callback) {
        const [unit, context] = [Scope.current, Context.get(Scope.current)];
        super.then((...args) => Scope.set(unit, context, callback, ...args));
        return this;
    }
}