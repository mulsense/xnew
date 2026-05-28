//----------------------------------------------------------------------------------------------------
// Scene — sibling-swap navigation primitive
//
// A trivial component that exposes helpers for swapping itself with another component under the
// same parent. `moveTo` / `nextScene` mount the new component as a sibling and finalize self;
// `append` mounts as a child without unmounting.
//
// - Scene : component returning { moveTo, nextScene, append }
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function Scene(unit: Unit) {
    
    return {
        moveTo(Component: Function, props?: any) {
            xnew.append(unit.parent, Component, props);
            unit.finalize();
        },
        nextScene(Component: Function, props?: any) {
            xnew.append(unit.parent, Component, props);
            unit.finalize();
        },
        append(Component: Function, props?: any) {
            xnew.append(unit, Component, props);
        }
    }
}
