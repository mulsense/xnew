import { isObject, isNumber, isString, isFunction } from '../common';
import { MapSet, MapMap, MapMapMap } from './map';
import { UnitScope } from './scope';

export class UnitEvent {
    static event = null;

    static typeToUnits = new MapSet();

    static unitToListeners = new MapMapMap();

    static on(unit, type, listener, options) {
        const listeners = UnitEvent.unitToListeners.get(unit);
        const snapshot = UnitScope.snapshot();

        type.trim().split(/\s+/).forEach((type) => internal(type, listener));
        function internal(type, listener) {
            if (listeners.has(type, listener) === false) {
                const element = unit.element;
                if (type[0] === '-' || type[0] === '+') {
                    const execute = (...args) => {
                        const eventbackup = UnitEvent.event;
                        UnitEvent.event = { type };
                        UnitScope.execute(snapshot, listener, ...args);
                        UnitEvent.event = eventbackup;
                    };
                    listeners.set(type, listener, [element, execute]);
                } else {
                    const execute = (...args) => {
                        const eventbackup = UnitEvent.event;
                        UnitEvent.event = { type: args[0]?.type ?? null };
                        UnitScope.execute(snapshot, listener, ...args);
                        UnitEvent.event = eventbackup;
                    };
                    listeners.set(type, listener, [element, execute]);
                    element.addEventListener(type, execute, options);
                }
            }
            if (listeners.has(type) === true) {
                UnitEvent.typeToUnits.add(type, unit);
            }
        }
    }
    
    static off(unit, type, listener) {
        const listeners = UnitEvent.unitToListeners.get(unit);
       
        if (isString(type) === true && listener !== undefined) {
            type.trim().split(/\s+/).forEach((type) => internal.call(unit, type, listener));
        } else if (isString(type) === true && listener === undefined) {
            type.trim().split(/\s+/).forEach((type) => {
                listeners.get(type)?.forEach((_, listener) => internal.call(unit, type, listener));
            });
        } else if (type === undefined) {
            listeners.forEach((map, type) => {
                map.forEach((_, listener) => internal.call(unit, type, listener));
            });
        }

        function internal(type, listener) {

            if (listeners.has(type, listener) === true) {
                const [element, execute] = listeners.get(type, listener);
                listeners.delete(type, listener);
                element.removeEventListener(type, execute);
            }
            if (listeners.has(type) === false) {
                UnitEvent.typeToUnits.delete(type, unit);
            }
        }
    }
    
    static emit(unit, type, ...args) {
        if (type[0] === '+') {
            UnitEvent.typeToUnits.get(type)?.forEach((unit) => {
                const listeners = UnitEvent.unitToListeners.get(unit);
                listeners.get(type)?.forEach(([element, execute]) => execute(...args));
            });
        } else if (type[0] === '-') {
            const listeners = UnitEvent.unitToListeners.get(unit);
            listeners.get(type)?.forEach(([element, execute]) => execute(...args));
        }
    }
}

