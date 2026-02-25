import { xnew } from '../core/xnew';
import { Unit, UnitTimer } from '../core/unit';

interface TransitionOptions { duration?: number; easing?: string; }

export function OpenAndClose(unit: Unit,
    { open = true, transition = { duration: 200, easing: 'ease' } }:
    { open?: boolean, transition?: TransitionOptions }
) {
    let value = open ? 1.0 : 0.0;
    let sign: number = open ? +1 : -1;
    let timer = xnew.timeout(() => xnew.emit('-transition', { value }));

    return {
        toggle() {
            sign < 0 ? unit.open() : unit.close();
        },
        open() {
            sign = +1;
            const d = 1 - value;
            const duration = (transition?.duration ?? 200) * d;
            const easing = transition?.easing ?? 'ease';
            timer?.clear();
            timer = xnew.transition(({ value: x }: { value: number }) => {
                value = 1.0 - (x < 1.0 ? (1 - x) * d : 0.0);
                xnew.emit('-transition', { value });
            }, duration, easing)
            .timeout(() => xnew.emit('-opened'));
        },
        close() {
            sign = -1;
            const d = value;
            const duration = (transition?.duration ?? 200) * d;
            const easing = transition?.easing ?? 'ease';
            timer?.clear();
            timer = xnew.transition(({ value: x }: { value: number }) => {
                value = x < 1.0 ? (1 - x) * d : 0.0;
                xnew.emit('-transition', { value });
            }, duration, easing)
            .timeout(() => xnew.emit('-closed'));
        },
    }
}

export function Accordion(unit: Unit) {
    const system = xnew.context(OpenAndClose);

    const outer = xnew.nest('<div style="overflow: hidden;">') as HTMLElement;
    const inner = xnew.nest('<div style="display: flex; flex-direction: column; box-sizing: border-box;">') as HTMLElement;
    
    system.on('-transition', ({ value }: { value: number }) => {
        outer.style.height = value < 1.0 ? inner.offsetHeight * value + 'px' : 'auto';
        outer.style.opacity = value.toString();
    });
}

export function Popup(unit: Unit) {
    const system = xnew.context(OpenAndClose);

    system.on('-closed', () => unit.finalize());
    system.open();
    
    xnew.nest('<div style="position: fixed; inset: 0; z-index: 1000; opacity: 0;">');
    unit.on('click', ({ event }: { event: PointerEvent }) => event.target === unit.element && system.close());

    system.on('-transition', ({ value }: { value: number }) => {
        unit.element.style.opacity = value.toString();
    });
}