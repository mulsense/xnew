import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function Modal(unit: Unit, 
    { duration = 200, easing = 'ease' }: { duration?: number, easing?: string } = {}
) {
    xnew.context('xnew.modal', unit);

    let state = 0.0;
    let timer = xnew.transition((x: number) => {
        state = x;
        xnew.emit('-transition', { state });
    }, duration, easing);

    return {
        close() {
            const [a, b] = [state, 1 - state];
            timer.clear();
            timer = xnew.transition((x: number) => {
                state = x < 1.0 ? 1.0 - (a * x + b) : 0.0;
                xnew.emit('-transition', { state });
            }, duration * a, easing)
            .timeout(() => unit.finalize());
        },
    }
}
