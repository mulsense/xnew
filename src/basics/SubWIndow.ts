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
    user.on('-dragstart', ({ event, position }: { event: MouseEvent, position: { x: number, y: number } } ) => {
        current.x = parseFloat(absolute.style.left || '0') + position.x;
        current.y = parseFloat(absolute.style.top || '0') + position.y;
    });
    user.on('-dragmove', ({ event, delta }: { event: MouseEvent, delta: { x: number, y: number } } ) => {
        current.x += delta.x;
        current.y += delta.y;
        absolute.style.left = `${current.x}px`;
        absolute.style.top = `${current.y}px`;
    });
}
