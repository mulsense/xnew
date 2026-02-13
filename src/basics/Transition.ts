import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

function State(unit: Unit, { state: initial = 0.0 } = {}) {
    return {
        state: initial,
    }
}

export function Accordion(unit: Unit, 
    { open = false, duration = 200, easing = 'ease'}: { open?: boolean, duration?: number, easing?: string } = {}
) {
    xnew.context('xnew.accordion', unit);
    
    let state = open ? 1.0 : 0.0;
    let sign = open ? +1 : -1;

    let timer = xnew.timeout(() => xnew.emit('-transition', { state }));

    return {
        toggle() {
            sign > 0 ? unit.close() : unit.open();
        },
        open() {
            if (sign < 0) transition();
        },
        close () {
            if (sign > 0) transition();
        },
    }
    function transition() {
        sign *= -1;
        const d = sign > 0 ? 1 - state : state;
        timer.clear();
        timer = xnew.transition((x: number) => {
            const y = x < 1.0 ? (1 - x) * d : 0.0;
            state = sign > 0 ? 1.0 - y : y;
            xnew.emit('-transition', { state });
        }, duration * d, easing);
    }
}

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
            const d = state;
            timer.clear();
            timer = xnew.transition((x: number) => {
                state = x < 1.0 ? (1 - x) * d : 0.0;
                xnew.emit('-transition', { state });
            }, duration * d, easing)
            .timeout(() => unit.finalize());
        },
    }
}