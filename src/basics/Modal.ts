import { xnew } from '../core/xnew';

export function Modal(self: xnew.Unit) {
    const fixed = xnew.nest('<div style="position: fixed; inset: 0;">');
    
    xnew().on('click', (event: Event) => {
        if (fixed.element === event.target) {
            self.close();
        }
    });
    return {
        close: () => {
            self.finalize();
        }
    }
}
