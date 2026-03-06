
import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

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
        unit.scene = xnew(Component, props);
    }
  }
}