import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function AccordionFrame(unit: Unit, 
    { open = false, duration = 200, easing = 'ease'}: { open?: boolean, duration?: number, easing?: string } = {}
) {
    const internal = xnew((internal: Unit) => {
        return {
            frame: unit, open, rate: 0.0,
            transition(rate: number) {
                xnew.emit('-transition', { rate });
            }
        };
    });
    xnew.context('xnew.accordionframe', internal);
    
    internal.on('-transition', ({ rate }: { rate: number}) => {
        internal.rate = rate;
        xnew.emit('-transition', { rate });
    });
    xnew.timeout(() => {
        internal.transition(open ? 1.0 : 0.0);
    });

    return {
        toggle() {
            if (internal.rate === 1.0) {
                unit.close();
            } else if (internal.rate === 0.0) {
                unit.open();
            }
        },
        open() {
            if (internal.rate === 0.0) {
                xnew.transition((x: number) => internal.transition(x), duration, easing);
            }
        },
        close () {
            if (internal.rate === 1.0) {
                xnew.transition((x: number) => internal.transition(1.0 - x), duration, easing);
            }
        }
    }
}

export function AccordionContent(unit: Unit, {}: {} = {}) {
    const internal = xnew.context('xnew.accordionframe');
    xnew.nest(`<div style="display: ${internal.open ? 'block' : 'none'};">`) as HTMLElement;
    xnew.nest('<div style="padding: 0; display: flex; flex-direction: column; box-sizing: border-box;">') as HTMLElement;

    internal.on('-transition', ({ rate }: { rate: number }) => {
        unit.transition({ element: unit.element, rate });
    });
    
    return {
        transition({ element, rate }: { element: HTMLElement, rate: number }) {
            const wrapper = element.parentElement as HTMLElement;
            wrapper.style.display = 'block';
            if (rate === 0.0) {
                wrapper.style.display = 'none';
            } else if (rate < 1.0) {
                Object.assign(wrapper.style, { height: element.offsetHeight * rate + 'px', overflow: 'hidden', opacity: rate });
            } else {
                Object.assign(wrapper.style, { height: 'auto', overflow: 'visible', opacity: 1.0 });
            }
        }
    }
}
