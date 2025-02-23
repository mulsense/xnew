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
            map.delete(id);
            const b = [...map.values()][0]; 

            const v = { x: a.x - b.x, y: a.y - b.y };
            const s =  v.x * v.x + v.y * v.y;
            const scale = 1 + (s > 0.0 ? (v.x * delta.x + v.y * delta.y) / s : 0);
            self.emit('-move', { scale, });
        }
        map.set(id, { ...position });
    });

    drag.on('-up -cancel', ({ id }) => {
        if (isActive === true) {
            self.emit('-up', {});
        }
        isActive = false;
        map.delete(id);
    });
 
}