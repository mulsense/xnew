import { xnew } from '../core/xnew';

export function Accordion(self: xnew.Unit, { open = false, duration = 200, easing = 'ease' } = {}) {
    const outer = xnew.nest('<div style="overflow: hidden">') as HTMLElement;
    const inner = xnew.nest('<div style="padding: 0; display: flex; flex-direction: column; box-sizing: border-box;">') as HTMLElement;

    let state = open ? 'open' : 'closed';

    outer.style.display = state === 'open' ? 'block' : 'none';

    return {
        open() {
            if (state === 'closed') {
                state = 'opening';
                xnew.transition((x: number) => self.transition(outer, x), duration, easing)
                .next(() => { state = 'open'; });
            }
        },
        close() {
            if (state === 'open') {
                state = 'closing';
                xnew.transition((x: number) => self.transition(outer, 1.0 - x), duration, easing)
                .next(() => { state = 'closed'; });
            }
        },
        transition(element: HTMLElement, x: number) {
            element.style.height = inner.offsetHeight * x + 'px';
            element.style.opacity = x.toString();
            if (x === 0.0) {
                element.style.display = 'none';
                element.style.height = '0px';
            } else if (x === 1.0) {
                element.style.height = 'auto';
            } else {
                element.style.display = 'block';
            }
        },
        toggle() {
            isOpen ? self.close() : self.open();
        },
    };
}

