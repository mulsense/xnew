import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function Accordion(unit: Unit, 
    { open = false, duration = 200, easing = 'ease'}: { open?: boolean, duration?: number, easing?: string } = {}
) {
    xnew.context('xnew.accordion', unit);
    
    let state = open ? 1.0 : 0.0;
    let sign = open ? +1 : -1;
    let timer = xnew.timeout(() => xnew.emit('-transition', { state: open ? 1.0 : 0.0 }));

    return {
        toggle() {
            if (sign > 0) {
                unit.close();
            } else {
                unit.open();
            }
        },
        open() {
            if (sign < 0) {
                sign = +1;
                const [a, b] = [1 - state, state];
                timer.clear();
                timer = xnew.transition((x: number) => {
                    state = x < 1.0 ? (a * x + b) : 1.0;
                    xnew.emit('-transition', { state });
                }, duration * a, easing);
            }
        },
        close () {
            if (sign > 0) {
                sign = -1;
                const [a, b] = [state, 1 - state];
                timer.clear();
                timer = xnew.transition((x: number) => {
                    state = x < 1.0 ? 1.0 - (a * x + b) : 0.0;
                    xnew.emit('-transition', { state });
                }, duration * a, easing);
            }
        },
    }
}
