import { xnew } from '../core/xnew';
import { DragEvent } from './DragEvent';

export function GestureEvent(self) {
    const drag = xnew(DragEvent);

    let isActive = false;
    const map = new Map();

    drag.on('-down', ({ id, position }) => {
        map.set(id, { ...position });

        isActive = map.size === 2 ? true : false;
        if (isActive === true) {
            self.emit('-down', {});
        }
    });

    drag.on('-move', ({ id, position, delta }) => {
        if (isActive === true) {
            const a = map.get(id);
            const b = getOthers(id)[0];

            let scale = 0.0;
            {
                const v = { x: a.x - b.x, y: a.y - b.y };
                const s = v.x * v.x + v.y * v.y;
                scale = 1 + (s > 0.0 ? (v.x * delta.x + v.y * delta.y) / s : 0);
            }
            let rotate = 0.0;
            {
                const c = { x: a.x + delta.x, y: a.y + delta.y };
                const v1 = { x: a.x - b.x, y: a.y - b.y };
                const v2 = { x: c.x - b.x, y: c.y - b.y };
                const l1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
                const l2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

                if (l1 > 0.0 && l2 > 0.0) {
                    const angle = Math.acos((v1.x * v2.x + v1.y * v2.y) / (l1 * l2));
                    const sign = v1.x * v2.y - v1.y * v2.x;
                    rotate = sign > 0.0 ? +angle : -angle;
                }
            }

            self.emit('-move', { scale });
        }
        map.set(id, position);
    });

    drag.on('-up -cancel', ({ id }) => {
        if (isActive === true) {
            self.emit('-up', {});
        }
        isActive = false;
        map.delete(id);
    });

    function getOthers(id) {
        const backup = map.get(id);
        map.delete(id);
        const others = [...map.values()];
        map.set(id, backup);
        return others;
    }
}