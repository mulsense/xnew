import { isObject, isNumber, isString, isFunction, error } from '../common';
import { Unit } from './unit';
import { MapSet, MapMap } from './map';
import { scope } from './scope';

export function event() {
    return EventController.event;
}

export class EventController {
    static event = null;

    static etypes = new MapSet();

    static on(unit, type, listener, options) {
        if (isString(type) === false) {
            error('unit on', 'The argument is invalid.', 'type');
        } else if (isFunction(listener) === false) {
            error('unit on', 'The argument is invalid.', 'listener');
        } else {
            type.trim().split(/\s+/).forEach((type) => internal.call(unit, type, listener));
        }

        function internal(type, listener) {
            if (unit._.listeners.has(type, listener) === false) {
                const element = unit.element;
                const context = unit._.context;
                if (type[0] === '-' || type[0] === '+') {
                    const execute = (...args) => {
                        const eventbackup = EventController.event;
                        EventController.event = { type };
                        scope(unit, context, listener, ...args);
                        EventController.event = eventbackup;
                    };
                    unit._.listeners.set(type, listener, [element, execute]);
                } else {
                    const execute = (...args) => {
                        const eventbackup = EventController.event;
                        EventController.event = { type: args[0]?.type ?? null };
                        scope(unit, context, listener, ...args);
                        EventController.event = eventbackup;
                    };
                    unit._.listeners.set(type, listener, [element, execute]);
                    element.addEventListener(type, execute, options);
                }
            }
            if (unit._.listeners.has(type) === true) {
                EventController.etypes.add(type, unit);
            }
        }
    }

    static off(unit, type, listener) {
        if (type !== undefined && isString(type) === false) {
            error('unit off', 'The argument is invalid.', 'type');
        } else if (listener !== undefined && isFunction(listener) === false) {
            error('unit off', 'The argument is invalid.', 'listener');
        } else if (isString(type) === true && listener !== undefined) {
            type.trim().split(/\s+/).forEach((type) => internal.call(unit, type, listener));
        } else if (isString(type) === true && listener === undefined) {
            type.trim().split(/\s+/).forEach((type) => {
                unit._.listeners.get(type)?.forEach((_, listener) => internal.call(unit, type, listener));
            });
        } else if (type === undefined) {
            unit._.listeners.forEach((map, type) => {
                map.forEach((_, listener) => internal.call(unit, type, listener));
            });
        }

        function internal(type, listener) {
            if (unit._.listeners.has(type, listener) === true) {
                const [element, execute] = unit._.listeners.get(type, listener);
                unit._.listeners.delete(type, listener);
                element.removeEventListener(type, execute);
            }
            if (unit._.listeners.has(type) === false) {
                EventController.etypes.delete(type, unit);
            }
        }
    }

    static emit(unit, type, ...args) {
        if (isString(type) === false) {
            error('unit emit', 'The argument is invalid.', 'type');
        } else if (unit._.state === 'finalized') {
            error('unit emit', 'This function can not be called after finalized.');
        } else if (type[0] === '+') {
            EventController.etypes.get(type)?.forEach((unit) => {
                unit._.listeners.get(type)?.forEach(([element, execute]) => execute(...args));
            });
        } else if (type[0] === '-') {
            unit._.listeners.get(type)?.forEach(([element, execute]) => execute(...args));
        }
    }
}