import { xnew } from '../core/xnew';

export function Modal(self: xnew.Unit) {
    const base = xnew.nest('<div style="position: fixed; inset: 0;">');
    
    xnew().on('click', (event: Event) => {
        if (base === event.target) {
            self.close();
        }
    });
    return {
        get base() {
            return base;
        },
        close: () => {
            self.finalize();
        }
    }
}
