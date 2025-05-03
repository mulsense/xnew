
import { isObject, isNumber, isString, isFunction, error } from '../common';
import { MapSet, MapMap } from './map';

export class UnitComponent {
    static componentToUnits = new MapSet();
    static unitToComponents = new MapSet();

    static add(unit, component) {
        UnitComponent.unitToComponents.add(unit, component);
        UnitComponent.componentToUnits.add(component, unit);
    }
    
    static clear(unit) {
        UnitComponent.unitToComponents.get(unit).forEach((component) => {
            UnitComponent.componentToUnits.delete(component, unit);
        });
        UnitComponent.unitToComponents.delete(unit);
    }

    static find(base, component) {
        if (base !== null) {
            return [...UnitComponent.componentToUnits.get(component)].filter((unit) => {
                for (let temp = unit; temp !== null; temp = temp._.parent) {
                    if (temp === base) {
                        return true;
                    }
                }
                return false;
            });
        } else {
            return [...UnitComponent.componentToUnits.get(component)];
        }
    }
}