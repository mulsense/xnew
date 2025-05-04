import { isObject, isNumber, isString, isFunction } from '../common';

export class UnitScope {
    static current = null;

    static execute(snapshot, func, ...args) {
        const backup = { unit: null, context: null };

        try {
            backup.unit = UnitScope.current;
            UnitScope.current = snapshot.unit;
            if (snapshot.unit && snapshot.context !== undefined) {
                backup.context = UnitScope.context(snapshot.unit);
                UnitScope.context(snapshot.unit, snapshot.context);
            }
            return func(...args);
        } catch (error) {
            throw error;
        } finally {
            UnitScope.current = backup.unit;
            if (snapshot.unit && snapshot.context !== undefined) {
                UnitScope.context(snapshot.unit, backup.context);
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

    static snapshot(unit = UnitScope.current) {
        return { unit, context: UnitScope.context(unit) };
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

export class ScopedPromise {
    constructor(excutor) {
        this.promise = new Promise(excutor);
    }

    then(callback) {
        const snapshot = UnitScope.snapshot();
        this.promise.then((...args) => UnitScope.execute(snapshot, callback, ...args));
        return this;
    }

    catch(callback) {
        const snapshot = UnitScope.snapshot();
        this.promise.catch((...args) => UnitScope.execute(snapshot, callback, ...args));
        return this;
    }

    finally(callback) {
        const snapshot = UnitScope.snapshot();
        this.promise.finally((...args) => UnitScope.execute(snapshot, callback, ...args));
        return this;
    }
}