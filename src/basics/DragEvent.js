import { xnew } from '../core/xnew';

export function DragEvent(self) {
    xnew().on('pointerdown', (event) => {
        const id = event.pointerId;
        const rect = self.element.getBoundingClientRect();
        const position = getPosition(event, rect);
        let previous = position;

        const win = xnew(window);

        win.on('pointermove', (event) => {
            if (event.pointerId === id) {
                const position = getPosition(event, rect);
                const movement = { x: position.x - previous.x, y: position.y - previous.y };
                xnew.emit('-move', { event, position, movement });
                previous = position;
            }
        });

        win.on('pointerup pointercancel', (event) => {
            if (event.pointerId === id) {
                const position = getPosition(event, rect);

                if (event.type === 'pointerup') {
                    xnew.emit('-up', { event, position, });
                } else if (event.type === 'pointercancel') {
                    xnew.emit('-cancel', { event, position, });
                }
                win.finalize();
            }
        });

        xnew.emit('-down', { event, position });
    });

    function getPosition(event, rect) {
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
}
