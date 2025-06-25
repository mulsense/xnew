import { xnew } from '../core/xnew';

export function Modal(self: xnew.Unit, attributes: any = {}) {
    const local = attributes;
    local.style = Object.assign(local.style ?? {}, { position: 'fixed', inset: 0, });

    const fixed = xnew.nest(local);
    
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
