
import { isObject, isString, isFunction, error } from '../common';
import { MapSet, MapMap } from './map';
import { Unit } from './unit';

let componentToUnits = new MapSet();
let unitToComponents = new MapSet();

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
            return [...componentToUnits.get(component)].filter((unit) => {
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
            return [...componentToUnits.get(component)];
        }
    }
}

Object.defineProperty(find, 'add', { enumerable: true, value: add });
Object.defineProperty(find, 'remove', { enumerable: true, value: remove });

function add(unit, component) {
    unitToComponents.add(unit, component);
    componentToUnits.add(component, unit);
}

function remove(unit) {
    unitToComponents.get(unit).forEach((component) => {
        componentToUnits.delete(component, unit);
    });
    unitToComponents.delete(unit);
}