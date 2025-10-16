import { xnew } from '../core/xnew';

export function Modal(self: xnew.Unit, { duration = 200, easing = 'ease' } = {}) {
    const fixed = xnew.nest('<div style="position: fixed; inset: 0; opacity: 0;">') as HTMLElement;

    xnew().on('click', (event: Event) => {
        if (self.element === event.target) {
            self.close();
        }
    });
    xnew.timeout(() => self.open());
    return {
        open() {
            xnew.transition((x: number) => fixed.style.opacity = x.toString(), duration, easing);
        },
        close() {
            xnew.transition((x: number) => fixed.style.opacity = (1.0 - x).toString(), duration, easing).next(() => self.finalize());
        }
    }
}
