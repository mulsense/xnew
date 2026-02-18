import { xnew } from '../core/xnew';
import { Unit, UnitTimer } from '../core/unit';
import { v8_0_0 } from 'pixi.js';

export function OpenAndClose(unit: Unit,
    { open = false }:
    { open?: boolean } = {}
) {
    let state = open ? 1.0 : 0.0;
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

export function Accordion(unit: Unit) {
    const system = xnew.context(OpenAndClose);

    const outer = xnew.nest('<div style="overflow: hidden;">') as HTMLElement;
    const inner = xnew.nest('<div style="display: flex; flex-direction: column; box-sizing: border-box;">') as HTMLElement;
    system.on('-transition', ({ state }: { state: number }) => {
        outer.style.height = state < 1.0 ? inner.offsetHeight * state + 'px' : 'auto';
        outer.style.opacity = state.toString();
    });
}

export function Modal(unit: Unit, { background = 'rgba(0, 0, 0, 0.1)' }: { background?: string } = {}) {
    const system = xnew.context(OpenAndClose);

    system.on('-closed', () => unit.finalize());

    xnew.nest('<div style="position: fixed; inset: 0; z-index: 1000;">');
    unit.on('click', ({ event }: { event: PointerEvent }) => system.close());

    const outer = xnew.nest(`<div style="width: 100%; height: 100%; opacity: 0;"">`) as HTMLElement;
    const inner = xnew.nest('<div style="position: absolute; inset: 0; margin: auto; width: max-content; height: max-content;">') as HTMLElement;
    unit.on('click', ({ event }: { event: PointerEvent }) => event.stopPropagation());

    outer.style.background = background;
    system.on('-transition', ({ state }: { state: number }) => {
        outer.style.opacity = state.toString();
    });
}