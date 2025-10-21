import { xnew } from '../core/xnew';

export function InputFrame(self: xnew.Unit,
    {}: {} = {}
) {
    xnew.nest('<div>');

    xnew.capture((unit: xnew.Unit) => {
        return unit.element.tagName.toLowerCase() === 'input';
    }, (unit: xnew.Unit) => {   
        const element = unit.element as HTMLInputElement;
        xnew.listener(element).on('input', (event: Event) => {
            xnew.emit('-input', { event });
        });
        xnew.listener(element).on('change', (event: Event) => {
            xnew.emit('-change', { event });
        });
    });
}
