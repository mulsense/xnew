import { xnew } from '../core/xnew';

export function ModalFrame(frame: xnew.Unit, 
    {}: {} = {}
) {
    xnew.context('xnew.modalframe', frame);
    const div = xnew.nest('<div style="position: fixed; inset: 0;">');

    let content: xnew.Unit | null = null;
    xnew.capture((unit: xnew.Unit) => unit.components.includes(ModalContent), (unit: xnew.Unit) => {
        content = unit;
    });

    xnew().on('click', (event: Event) => {
        frame?.close();
    });

    return {
        close() {
            frame.emit('-close');
            content?.deselect();
        }
    }
}

export function ModalContent(content: xnew.Unit,
    { duration = 200, easing = 'ease', background = 'rgba(0, 0, 0, 0.1)' }: { duration?: number, easing?: string, background?: string } = {}
) {
    const frame = xnew.context('xnew.modalframe');

    const div = xnew.nest('<div style="width: 100%; height: 100%; opacity: 0;">');
    div.style.background = background;

    xnew.nest('<div style="position: absolute; inset: 0;  margin: auto; width: max-content; height: max-content;">');

    xnew().on('click', (event: Event) => {
        event.stopPropagation();
    });

    xnew.timeout(() => content.select());
    return {
        select() {
            xnew.transition((x: number) => div.style.opacity = x.toString(), duration, easing);
        },
        deselect() {
            xnew.transition((x: number) => div.style.opacity = (1.0 - x).toString(), duration, easing).next(() => frame.finalize());
        }
    }
}
