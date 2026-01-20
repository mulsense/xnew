import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function ModalFrame(unit: Unit, 
    { duration = 200, easing = 'ease' }: { duration?: number, easing?: string } = {}
) {
    xnew.context('xnew.modalframe', unit);
    xnew.nest('<div style="position: fixed; inset: 0; z-index: 1000;">');

    unit.on('click', ({ event }: { event: Event }) => unit.close());
    
    xnew.transition((x: number) => {
        xnew.emit('-transition', { state: x });
    }, duration, easing);

    return {
        state: 0.0,
        close() {
            xnew.transition((x: number) => xnew.emit('-transition', { state: 1.0 - x }), duration, easing)
            .timeout(() => unit.finalize());
        }
    }
}

export function ModalContent(unit: Unit,
    { background = 'rgba(0, 0, 0, 0.1)' }: { background?: string } = {}
) {
    const frame = xnew.context('xnew.modalframe');
    const outer = xnew.nest(`<div style="width: 100%; height: 100%; opacity: 0; background: ${background}">`);
    const inner = xnew.nest('<div style="position: absolute; inset: 0; margin: auto; width: max-content; height: max-content;">');

    unit.on('click', ({ event }: { event: Event }) => event.stopPropagation());
    
    frame.on('-transition', ({ state }: { state: number }) => {
        outer.style.opacity = state.toString();
    });
}
