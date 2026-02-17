import { xnew } from '../core/xnew';
import { Unit, UnitTimer } from '../core/unit';

export function OpenAndClose(unit: Unit,
    { state: initialState = 0.0 }:
    { state?: number } = {}
) {
    let state = Math.max(0.0, Math.min(1.0, initialState));
    let direction: number | null = state === 1.0 ? +1 : (state === 0.0 ? -1 : null);
    let timer = xnew.timeout(() => xnew.emit('-transition', { state }));

    return {
        toggle(duration = 200, easing = 'ease') {
            if (direction === null || direction < 0) {
                unit.open(duration, easing);
            } else {
                unit.close(duration, easing);
            }
        },
        open(duration = 200, easing = 'ease') {
            if (direction === null || direction < 0) {
                direction = +1;
                const d = 1 - state;
                timer?.clear();
                timer = xnew.transition((x: number) => {
                    const y = x < 1.0 ? (1 - x) * d : 0.0;
                    state = 1.0 - y;
                    xnew.emit('-transition', { state });
                }, duration * d, easing)
                .timeout(() => {
                    xnew.emit('-opened', { state });
                });
            }
        },
        close(duration = 200, easing = 'ease') {
            if (direction === null || direction > 0) {
                direction = -1;
                const d = state;
                timer?.clear();
                timer = xnew.transition((x: number) => {
                    const y = x < 1.0 ? (1 - x) * d : 0.0;
                    state = y;
                    xnew.emit('-transition', { state });
                }, duration * d, easing)
                .timeout(() => {
                    xnew.emit('-closed', { state });
                });
            }
        },
    }
}
