import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { DirectEvent } from './Event';

export function DragFrame(frame: Unit, 
    { x = 0, y = 0 }: { x?: number, y?: number } = {}
) {
    const absolute = xnew.nest(`<div style="position: absolute; top: ${y}px; left: ${x}px;">`);
    xnew.context('xnew.dragframe', { frame, absolute });
}

export function DragTarget(target: Unit, 
    {}: {} = {}
) {
    const { frame, absolute } = xnew.context('xnew.dragframe');

    xnew.nest('<div>');
    const direct = xnew(absolute.parentElement, DirectEvent);
    const current = { x: 0, y: 0 };
    const offset = { x: 0, y: 0 };
    let dragged = false;
    direct.on('-dragstart', ({ event, position }: { event: MouseEvent, position: { x: number, y: number } } ) => {
        if (target.element.contains(event.target as Node) === false) return;
        dragged = true;
        offset.x = position.x - parseFloat(absolute.style.left || '0');
        offset.y = position.y - parseFloat(absolute.style.top || '0');
        current.x = position.x - offset.x;
        current.y = position.y - offset.y;
    });
    direct.on('-dragmove', ({ event, delta }: { event: MouseEvent, delta: { x: number, y: number } } ) => {
        if (dragged !== true) return;
        current.x += delta.x;
        current.y += delta.y;
        absolute.style.left = `${current.x}px`;
        absolute.style.top = `${current.y}px`;
    });
    direct.on('-dragcancel -dragend', ({ event }: { event: MouseEvent } ) => {
        dragged = false;
    });
}
