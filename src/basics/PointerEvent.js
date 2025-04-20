import { xnew } from '../core/xnew';
import { DragEvent } from './DragEvent';
import { GestureEvent } from './GestureEvent';

export function PointerEvent(self) {

    const unit = xnew();
    unit.on('pointermove', (event) => {
        const id = event.pointerId;
        const rect = self.element.getBoundingClientRect();
        const position = getPosition(event, rect);
        self.emit('-pointermove', { id, position });
    });
    unit.on('wheel', (event) => {
        self.emit('-wheel', { deltaY: event.wheelDeltaY });
    });
    unit.on('pointerdown', (event) => {
        const id = event.pointerId;
        const rect = self.element.getBoundingClientRect();
        const position = getPosition(event, rect);
        self.emit('-pointerdown', { id, position });
    });
    unit.on('pointerup', (event) => {
        const id = event.pointerId;
        const rect = self.element.getBoundingClientRect();
        const position = getPosition(event, rect);
        self.emit('-pointerup', { id, position });
    });

    let isActive = false;
    const gesture = xnew(GestureEvent);
    gesture.on('-down', (...args) => {
        isActive = true;
        self.emit('-gesturestart', ...args);
    });
    gesture.on('-move', (...args) => {
        self.emit('-gesturemove', ...args);
    });
    gesture.on('-up', (...args) => {
        isActive = false;
        self.emit('-gestureend', ...args);
    });
    gesture.on('-cancel', (...args) => {
        isActive = false;
        self.emit('-gesturecancel', ...args);
    });  

    const drag = xnew(DragEvent);
    drag.on('-down', (...args) => self.emit('-dragstart', ...args));
    drag.on('-move', (...args) => self.emit('-dragmove', ...args));
    drag.on('-up', (...args) => self.emit('-dragend', ...args));
    drag.on('-cancel', (...args) => self.emit('-dragcancel', ...args));

    function getPosition(event, rect) {
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
}