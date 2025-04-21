
import { isObject, isNumber, isString, isFunction, error } from '../common';
import { MapSet, MapMap } from './map';

export class Component {
    static componentToUnits = new MapSet();
    static unitToComponents = new MapSet();

    static add(unit, component) {
        Component.unitToComponents.add(unit, component);
        Component.componentToUnits.add(component, unit);
    }
    
    static clear(unit) {
        Component.unitToComponents.get(unit).forEach((component) => {
            Component.componentToUnits.delete(component, unit);
        });
        Component.unitToComponents.delete(unit);
    }

    static find(base, component) {
        if (base !== null) {
            return [...Component.componentToUnits.get(component)].filter((unit) => {
                for (let temp = unit; temp !== null; temp = temp.parent) {
                    if (temp === base) {
                        return true;
                    }
                }
                return false;
            });
        } else {
            return [...Component.componentToUnits.get(component)];
        }
    }
}