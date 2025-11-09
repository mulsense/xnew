import { xnew } from '../core/xnew';
import { UserEvent } from './UserEvent';

export function DragFrame(frame: xnew.Unit, 
    { x = 0, y = 0 }: { x?: number, y?: number } = {}
) {
    const absolute = xnew.nest(`<div style="position: absolute; top: ${y}px; left: ${x}px;">`);
    xnew.context('xnew.dragframe', { frame, absolute });
}

export function DragTarget(target: xnew.Unit, 
    {}: {} = {}
) {
    const { frame, absolute } = xnew.context('xnew.dragframe');

    xnew.nest('<div>');
    const user = xnew(absolute.parentElement, UserEvent);
    const current = { x: 0, y: 0 };
    const offset = { x: 0, y: 0 };
    let dragged = false;
    user.on('-dragstart', ({ event, position }: { event: MouseEvent, position: { x: number, y: number } } ) => {
        if (target.element.contains(event.target as Node) === false) return;
        dragged = true;
        offset.x = position.x - parseFloat(absolute.style.left || '0');
        offset.y = position.y - parseFloat(absolute.style.top || '0');
        current.x = position.x - offset.x;
        current.y = position.y - offset.y;
    });
    user.on('-dragmove', ({ event, delta }: { event: MouseEvent, delta: { x: number, y: number } } ) => {
        if (dragged !== true) return;
        current.x += delta.x;
        current.y += delta.y;
        absolute.style.left = `${current.x}px`;
        absolute.style.top = `${current.y}px`;
    });
    user.on('-dragcancel -dragend', ({ event }: { event: MouseEvent } ) => {
        dragged = false;
    });
}
