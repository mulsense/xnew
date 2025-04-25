import { xnew } from '../core/xnew';
import { DragEvent } from './DragEvent';
import { GestureEvent } from './GestureEvent';

export function PointerEvent(self) {

    const unit = xnew();
    unit.on('pointermove', (event) => {
        const id = event.pointerId;
        const rect = self.element.getBoundingClientRect();
        const position = getPosition(event, rect);
        xnew.emit('-pointermove', { id, position });
    });
    unit.on('wheel', (event) => {
        xnew.emit('-wheel', { deltaY: event.wheelDeltaY });
    });
    unit.on('pointerdown', (event) => {
        const id = event.pointerId;
        const rect = self.element.getBoundingClientRect();
        const position = getPosition(event, rect);
        xnew.emit('-pointerdown', { id, position });
    });
    unit.on('pointerup', (event) => {
        const id = event.pointerId;
        const rect = self.element.getBoundingClientRect();
        const position = getPosition(event, rect);
        xnew.emit('-pointerup', { id, position });
    });

    let isActive = false;
    const gesture = xnew(GestureEvent);
    gesture.on('-down', (...args) => {
        isActive = true;
        xnew.emit('-gesturestart', ...args);
    });
    gesture.on('-move', (...args) => {
        xnew.emit('-gesturemove', ...args);
    });
    gesture.on('-up', (...args) => {
        isActive = false;
        xnew.emit('-gestureend', ...args);
    });
    gesture.on('-cancel', (...args) => {
        isActive = false;
        xnew.emit('-gesturecancel', ...args);
    });  

    const drag = xnew(DragEvent);
    drag.on('-down', (...args) => xnew.emit('-dragstart', ...args));
    drag.on('-move', (...args) => xnew.emit('-dragmove', ...args));
    drag.on('-up', (...args) => xnew.emit('-dragend', ...args));
    drag.on('-cancel', (...args) => xnew.emit('-dragcancel', ...args));

    function getPosition(event, rect) {
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
}