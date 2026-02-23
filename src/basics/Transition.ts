import { xnew } from '../core/xnew';
import { Unit, UnitTimer } from '../core/unit';

interface TransitionOptions { duration?: number; easing?: string; }

export function OpenAndClose(unit: Unit,
    { open = true, transition = { duration: 200, easing: 'ease' } }:
    { open?: boolean, transition?: TransitionOptions }
) {
    let state = open ? 1.0 : 0.0;
    let sign: number = open ? +1 : -1;
    let timer = xnew.timeout(() => xnew.emit('-transition', { state }));

    return {
        toggle() {
            sign < 0 ? unit.open() : unit.close();
        },
        open() {
            sign = +1;
            const d = 1 - state;
            const duration = (transition?.duration ?? 200) * d;
            const easing = transition?.easing ?? 'ease';
            timer?.clear();
            timer = xnew.transition((x: number) => {
                state = 1.0 - (x < 1.0 ? (1 - x) * d : 0.0);
                xnew.emit('-transition', { state });
            }, duration, easing)
            .timeout(() => xnew.emit('-opened', { state }));
        },
        close() {
            sign = -1;
            const d = state;
            const duration = (transition?.duration ?? 200) * d;
            const easing = transition?.easing ?? 'ease';
            timer?.clear();
            timer = xnew.transition((x: number) => {
                state = x < 1.0 ? (1 - x) * d : 0.0;
                xnew.emit('-transition', { state });
            }, duration, easing)
            .timeout(() => xnew.emit('-closed', { state }));
        },
    }
}

export function Accordion(unit: Unit) {
    const system = xnew.context(OpenAndClose);

    const outer = xnew.nest('<div style="overflow: hidden;">') as HTMLElement;
    const inner = xnew.nest('<div style="display: flex; flex-direction: column; box-sizing: border-box;">') as HTMLElement;
    
    system.on('-transition', ({ state }: { state: number }) => {
        outer.style.height = state < 1.0 ? inner.offsetHeight * state + 'px' : 'auto';
        outer.style.opacity = state.toString();
    });
}

export function Popup(unit: Unit) {
    const system = xnew.context(OpenAndClose);

    system.on('-closed', () => unit.finalize());
    system.open();
    
    xnew.nest('<div style="position: fixed; inset: 0; z-index: 1000; opacity: 0;">');
    unit.on('click', ({ event }: { event: PointerEvent }) => event.target === unit.element && system.close());

    system.on('-transition', ({ state }: { state: number }) => {
        unit.element.style.opacity = state.toString();
    });
}