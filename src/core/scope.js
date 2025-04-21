import { isObject, isNumber, isString, isFunction, error } from '../common';

export class Scope {
    static current = null;

    static execute(unit, context, func, ...args) {
        const stack = [Scope.current, Scope.context(unit)];

        try {
            Scope.current = unit;
            if (unit && context !== undefined) {
                Scope.context(unit, context);
            }
            return func(...args);
        } catch (error) {
            throw error;
        } finally {
            Scope.current = stack[0];
            if (unit && context !== undefined) {
                Scope.context(unit, stack[1]);
            }
        }
    }

    static map = new Map();

    static context(unit, context = undefined) {
        if (context !== undefined) {
            Scope.map.set(unit, context);
        } else {
            return Scope.map.get(unit) ?? null;
        }
    }

    static get snapshot() {
        return { unit: Scope.current, context: Scope.context(Scope.current) };
    }

    static clear(unit) {
        Scope.map.delete(unit);
    }

    static next(key, value) {
        const unit = Scope.current;
        Scope.map.set(unit, [Scope.map.get(unit), key, value]);
    }

    static trace(key) {
        const unit = Scope.current;
        let ret = undefined;
        for (let context = Scope.map.get(unit); context !== null; context = context[0]) {
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
        const snapshot = Scope.snapshot;
        super.then((...args) => Scope.execute(snapshot.unit, snapshot.context, callback, ...args));
        return this;
    }

    catch(callback) {
        const snapshot = Scope.snapshot;
        super.then((...args) => Scope.execute(snapshot.unit, snapshot.context, callback, ...args));
        return this;
    }

    finally(callback) {
        const snapshot = Scope.snapshot;
        super.then((...args) => Scope.execute(snapshot.unit, snapshot.context, callback, ...args));
        return this;
    }
}