import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function AccordionFrame(unit: Unit, 
    { open = false, duration = 200, easing = 'ease'}: { open?: boolean, duration?: number, easing?: string } = {}
) {
    xnew.context('xnew.accordionframe', unit);
    
    unit.on('-transition', ({ state }: { state: number }) => {
        unit.state = state;
    });
    xnew.timeout(() => {
        xnew.emit('-transition', { state: open ? 1.0 : 0.0 });
    });

    return {
        state: open ? 1.0 : 0.0,
        toggle() {
            if (unit.state === 1.0) {
                unit.close();
            } else if (unit.state === 0.0) {
                unit.open();
            }
        },
        open() {
            if (unit.state === 0.0) {
                xnew.transition((x: number) => xnew.emit('-transition', { state: x }), duration, easing);
            }
        },
        close () {
            if (unit.state === 1.0) {
                xnew.transition((x: number) => xnew.emit('-transition', { state: 1.0 - x }), duration, easing);
            }
        }
    }
}

export function AccordionContent(unit: Unit, {}: {} = {}) {
    const frame = xnew.context('xnew.accordionframe');
    const outer = xnew.nest(`<div style="display: ${frame.state === 1.0 ? 'block' : 'none'};">`) as HTMLElement;
    const inner = xnew.nest('<div style="padding: 0; display: flex; flex-direction: column; box-sizing: border-box;">') as HTMLElement;

    frame.on('-transition', ({ state }: { state: number }) => {
        outer.style.display = 'block';
        if (state === 0.0) {
            outer.style.display = 'none';
        } else if (state < 1.0) {
            Object.assign(outer.style, { height: inner.offsetHeight * state + 'px', overflow: 'hidden', opacity: state });
        } else {
            Object.assign(outer.style, { height: 'auto', overflow: 'visible', opacity: 1.0 });
        }
    });
}
