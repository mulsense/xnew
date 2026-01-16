import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function DragFrame(frame: Unit, 
    { x = 0, y = 0 }: { x?: number, y?: number } = {}
) {
    const absolute = xnew.nest(`<div style="position: absolute; top: ${y}px; left: ${x}px;">`);
    xnew.context('xnew.dragframe', { frame, absolute });
}

export function DragTarget(unit: Unit, 
    {}: {} = {}
) {
    const { frame, absolute } = xnew.context('xnew.dragframe');
    const target = xnew(absolute.parentElement);

    const current = { x: 0, y: 0 };
    const offset = { x: 0, y: 0 };
    let dragged = false;
    target.on('dragstart', ({ event, position }: { event: MouseEvent, position: { x: number, y: number } } ) => {
        if (unit.element.contains(event.target as Node) === false) return;
        dragged = true;
        offset.x = position.x - parseFloat(absolute.style.left || '0');
        offset.y = position.y - parseFloat(absolute.style.top || '0');
        current.x = position.x - offset.x;
        current.y = position.y - offset.y;
    });
    target.on('dragmove', ({ event, delta }: { event: MouseEvent, delta: { x: number, y: number } } ) => {
        if (dragged !== true) return;
        current.x += delta.x;
        current.y += delta.y;
        absolute.style.left = `${current.x}px`;
        absolute.style.top = `${current.y}px`;
    });
    target.on('dragend', ({ event }: { event: MouseEvent } ) => {
        dragged = false;
    });

    xnew.nest('<div>');
}
