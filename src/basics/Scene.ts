
import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function Scene(unit: Unit) {
    
    return {
        moveTo(Component: Function, props?: any) {
            xnew.next(unit, Component, props);
            unit.finalize();
        },
    }
}
