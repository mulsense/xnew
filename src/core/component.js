
import { isObject, isNumber, isString, isFunction } from '../common';
import { MapSet, MapMap } from './map';

export class UnitComponent {
    static unitToComponents = new MapSet();
    static componentToUnits = new MapSet();

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

    static find(component) {
        return [...UnitComponent.componentToUnits.get(component)];
    }
}