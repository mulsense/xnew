
import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function Scene(unit: Unit) {
    return {
        append(Component: Function, props?: any) {
            xnew(Component, props);
        }
    }
}

export function Flow(unit: Unit) {
    let scene: Unit | null = null;
    return {
        set scene(value: Unit) {
            scene = value;
        },
        get scene(): Unit | null {
            return scene;
        },
        next(Component: Function, props?: any) {
            // scene change
            unit.scene?.finalize();
            unit.scene = xnew((unit: Unit) => {
                xnew.extend(Scene);
                xnew.extend(Component, props);
            });
        }
    }
}
