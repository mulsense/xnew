import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function InputFrame(frame: Unit,
    {}: {} = {}
) {
    xnew.nest('<div>');

    xnew.capture((unit: Unit) => {
        if (unit.element.tagName.toLowerCase() === 'input') {
            const element = unit.element as HTMLInputElement;
            xnew.listener(element).on('input', (event: Event) => {
                frame.emit('-input', { event });
            });
            xnew.listener(element).on('change', (event: Event) => {
                frame.emit('-change', { event });
            });
            xnew.listener(element).on('click', (event: Event) => {
                frame.emit('-click', { event });
            });
            return true;
        }
    });
}
