import { xnew } from '../core/xnew';

export function Modal(self: xnew.Unit) {
    xnew.nest('<div style="position: fixed; inset: 0;">');
    
    xnew().on('click', (event: Event) => {
        if (self.element === event.target) {
            self.close();
        }
    });
    return {
        close: () => {
            self.finalize();
        }
    }
}
