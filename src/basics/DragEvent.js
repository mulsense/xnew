import { xnew } from '../core/xnew';

export function DragEvent() {
  
    const self = xthis;
    const base = xnew();

    const wmap = new Map();
    let current = null;

    base.on('pointerdown', (event) => {
        const id = event.pointerId;
        const rect = self.element.getBoundingClientRect();
        const position = getPosition(event, rect);
        let previous = position;
       
        const xwin = xnew(window);
        wmap.set(id, xwin);

        xwin.on('pointermove', (event) => {
            if (event.pointerId === id) {
                const position = getPosition(event, rect);
                const delta = { x: position.x - previous.x, y: position.y - previous.y };
                
                self.emit('move', event, { type: 'move', position, delta });
                previous = position;
            }
        });

        xwin.on('pointerup', (event) => {
            if (event.pointerId === id) {
                const position = getPosition(event, rect);
                self.emit('up', event, { type: 'up', position, });
                xwin.finalize();
                xmap.delete(id);
            }
        });

        xwin.on('pointercancel', (event) => {
            if (event.pointerId === id) {
                const position = getPosition(event, rect);
                self.emit('cancel', event, { type: 'cancel', position, });
                xwin.finalize();
                xmap.delete(id);
            }
        });

        current = { id, position };
        self.emit('down', event, { type: 'down', position });
    });

    function getPosition(event, rect) {
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    return {
        cancel() {
            if (current !== null) {
                xmap.get(current).finalize();
                xmap.delete(current);
            }
        }
    }
}
