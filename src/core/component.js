
import { isObject, isString, isFunction, error } from '../common';
import { MapSet, MapMap } from './map';
import { Unit } from './unit';

export class Component {
    static componentToUnits = new MapSet();
    static unitToComponents = new MapSet();

    static add(unit, component) {
        Component.unitToComponents.add(unit, component);
        Component.componentToUnits.add(component, unit);
    }
    
    static remove(unit) {
        Component.unitToComponents.get(unit).forEach((component) => {
            Component.componentToUnits.delete(component, unit);
        });
        Component.unitToComponents.delete(unit);
    }

    static find(...args) {
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
                return [...Component.componentToUnits.get(component)].filter((unit) => {
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
                return [...Component.componentToUnits.get(component)];
            }
        }
    }
}