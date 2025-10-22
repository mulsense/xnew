import { xnew } from '../core/xnew';
import { UserEvent } from './UserEvent';

export function DragFrame(frame: xnew.Unit, 
    { x = 0, y = 0 }: { x?: number, y?: number } = {}
) {
    xnew.context('xnew.dragframe', frame);
    xnew.nest(`<div style="position: absolute; top: ${y}px; left: ${x}px;">`);

}

export function DragTarget(target: xnew.Unit, 
    {}: {} = {}
) {
    const frame = xnew.context('xnew.dragframe');

    xnew.nest('<div>');
    const user = xnew(UserEvent);
    user.on('-dragmove', ({ event, delta }: { event: MouseEvent, delta: { x: number, y: number } } ) => {
        console.log('dragmove', delta);
        const style = frame.element.style;
        frame.element.style.left = `${parseFloat(style.left || '0') + delta.x}px`;
        frame.element.style.top = `${parseFloat(style.top || '0') + delta.y}px`;
        console.log('dragmove', { x: frame.element.style.left, y: frame.element.style.top });
    });
}
