import { xnew } from '../core/xnew';

export function Modal(self, {} = {}) {
    xnew.nest({
        style: {
            position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
    });
    
    xnew().on('click', () => {
        self.close();
    });

    xnew.nest({});

    xnew().on('click', (event) => {
        event.stopPropagation(); 
    });

    return {
        close() {
            self.finalize();
        }
    }
}