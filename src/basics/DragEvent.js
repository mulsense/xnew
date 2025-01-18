import { xnew } from '../core/xnew';

export function DragEvent() {
    let isActive = false;
  
    const self = xthis;
    const base = xnew();

    base.on('pointerdown', (event) => {
        const id = event.pointerId;
        const rect = self.element.getBoundingClientRect();
        const position = getPosition(event, rect);
       
        self.emit('down', event, { type: 'down', position });
        let previous = position;
        isActive = true;

        const xwin = xnew(window);

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
                isActive = false;
            }
        });

        xwin.on('pointercancel', (event) => {
            if (event.pointerId === id) {
                const position = getPosition(event, rect);
                self.emit('cancel', event, { type: 'cancel', position, });
                xwin.finalize();
                isActive = false;
            }
        });
    });

    function getPosition(event, rect) {
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    return {
        get isActive() {
            return isActive;
        },
    }
}
