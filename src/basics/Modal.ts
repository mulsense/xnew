import { xnew } from '../core/xnew';

export function Modal(self: xnew.Unit) {
    const fixed = xnew.nest({ position: 'fixed', inset: 0 });
    
    xnew().on('click', (event: Event) => {
        if (fixed === event.target) {
            if (self.close) {
                self.close();
            } else {
                self.finalize();
            }
        }
    });
}
