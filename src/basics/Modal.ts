import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function Modal(unit: Unit, 
    { duration = 200, easing = 'ease' }: { duration?: number, easing?: string } = {}
) {
    xnew.context('xnew.modalframe', unit);
    xnew.nest('<div style="position: fixed; inset: 0; z-index: 1000;">');

    unit.on('click', ({ event }: { event: Event }) => unit.close());
    unit.on('-transition', ({ state }: { state: number }) => unit.state = state);

    xnew.transition((x: number) => xnew.emit('-transition', { state: x }), duration, easing);

    return {
        state: 0.0,
        close() {
            xnew.transition((x: number) => xnew.emit('-transition', { state: 1.0 - x }), duration, easing)
            .timeout(() => unit.finalize());
        }
    }
}
