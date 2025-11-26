import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function ModalFrame(frame: Unit, 
    { duration = 200, easing = 'ease' }: { duration?: number, easing?: string } = {}
) {
    const internal = xnew((internal: Unit) => {
        return {};
    });
    xnew.context('xnew.modalframe', internal);
    xnew.nest('<div style="position: fixed; inset: 0; z-index: 1000;">');

    xnew().on('click', (event: Event) => frame.close());
    xnew.transition((x: number) => internal.emit('-transition', { rate: x }), duration, easing);

    return {
        close() {
            xnew.transition((x: number) => internal.emit('-transition', { rate: 1.0 - x }), duration, easing)
            .timeout(() => frame.finalize());
        }
    }
}

export function ModalContent(content: Unit,
    { background = 'rgba(0, 0, 0, 0.1)' }: { background?: string } = {}
) {
    const internal = xnew.context('xnew.modalframe');
    xnew.nest(`<div style="width: 100%; height: 100%; opacity: 0; background: ${background}">`);
    xnew.nest('<div style="position: absolute; inset: 0; margin: auto; width: max-content; height: max-content;">');

    xnew().on('click', (event: Event) => event.stopPropagation());

    internal.on('-transition', ({ rate }: { rate: number }) => {
        content.transition({ element: content.element, rate });
    });

    return {
        transition({ element, rate }: { element: HTMLElement, rate: number }) {
            const wrapper = element.parentElement as HTMLElement;
            wrapper.style.opacity = rate.toString();
        }
    }
}
