import { isObject, isNumber, isString, isFunction, error } from '../common';

export class UnitScope {
    static current = null;

    static execute(unit, context, func, ...args) {
        const stack = [UnitScope.current, UnitScope.context(unit)];

        try {
            UnitScope.current = unit;
            if (unit && context !== undefined) {
                UnitScope.context(unit, context);
            }
            return func(...args);
        } catch (error) {
            throw error;
        } finally {
            UnitScope.current = stack[0];
            if (unit && context !== undefined) {
                UnitScope.context(unit, stack[1]);
            }
        }
    }

    static map = new Map();

    static context(unit, context = undefined) {
        if (context !== undefined) {
            UnitScope.map.set(unit, context);
        } else {
            return UnitScope.map.get(unit) ?? null;
        }
    }

    static get snapshot() {
        return { unit: UnitScope.current, context: UnitScope.context(UnitScope.current) };
    }

    static clear(unit) {
        UnitScope.map.delete(unit);
    }

    static next(key, value) {
        const unit = UnitScope.current;
        UnitScope.map.set(unit, [UnitScope.map.get(unit), key, value]);
    }

    static trace(key) {
        const unit = UnitScope.current;
        let ret = undefined;
        for (let context = UnitScope.map.get(unit); context !== null; context = context[0]) {
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
        const snapshot = UnitScope.snapshot;
        super.then((...args) => UnitScope.execute(snapshot.unit, snapshot.context, callback, ...args));
        return this;
    }

    catch(callback) {
        const snapshot = UnitScope.snapshot;
        super.then((...args) => UnitScope.execute(snapshot.unit, snapshot.context, callback, ...args));
        return this;
    }

    finally(callback) {
        const snapshot = UnitScope.snapshot;
        super.then((...args) => UnitScope.execute(snapshot.unit, snapshot.context, callback, ...args));
        return this;
    }
}