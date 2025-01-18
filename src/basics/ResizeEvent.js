import { xnew } from '../core/xnew';

export function ResizeEvent() {
    const self = xthis;
    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            self.emit('resize');
            break;
        }
    });

    if (xthis.element) {
        observer.observe(xthis.element);
    }
    return {
        finalize() {
            if (xthis.element) {
                observer.unobserve(xthis.element);
            }
        }
    }
}
