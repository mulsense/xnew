import { xnew } from '../core/xnew';

export function DragEvent(self) {
  
    const base = xnew();

    const wmap = new Map();
    let current = null;

    base.on('pointerdown', (event) => {
        const id = event.pointerId;
        const rect = self.element.getBoundingClientRect();
        const position = getPosition(event, rect);
        let previous = position;
       
        const win = xnew(window);
        wmap.set(id, win);

        win.on('pointermove', (event) => {
            if (event.pointerId === id) {
                const position = getPosition(event, rect);
                const delta = { x: position.x - previous.x, y: position.y - previous.y };
                
                current = { id, position };
                self.emit('-move', { id, position, delta });
                previous = position;
            }
        });

        win.on('pointerup', (event) => {
            if (event.pointerId === id) {
                const position = getPosition(event, rect);

                current = { id, position };
                self.emit('-up', { id, position, });
                win.finalize();
                wmap.delete(id);
            }
        });

        win.on('pointercancel', (event) => {
            if (event.pointerId === id) {
                const position = getPosition(event, rect);
               
                current = null;
                self.emit('-cancel', { id, position, });
                win.finalize();
                wmap.delete(id);
            }
        });

        current = { id, position };
        self.emit('-down', { id, position });
    });

    function getPosition(event, rect) {
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    return {
        cancel() {
            if (current !== null) {
                wmap.get(current.id).finalize();
                wmap.delete(current.id);
                current = null;
            }
        }
    }
}
