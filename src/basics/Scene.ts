//----------------------------------------------------------------------------------------------------
// Scene — sibling-swap navigation primitive
//
// A trivial component that exposes helpers for swapping itself with another component under the
// same parent. `change` mounts the new component as a sibling and finalizes self; `add` mounts as
// a child without unmounting.
//
// - Scene : component returning { change, add }
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function Scene(unit: Unit) {

    return {
        change(Component: Function, props?: any) {
            xnew(unit.parent, Component, props);
            unit.finalize();
        },
        add(Component: Function, props?: any) {
            xnew(unit, Component, props);
        }
    }
}
