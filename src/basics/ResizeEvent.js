import { xnew } from '../core/xnew';

export function ResizeEvent() {
    const self = xnew.current;
    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            self.emit('resize');
            break;
        }
    });

    if (self.element) {
        observer.observe(self.element);
    }
    return {
        finalize() {
            if (self.element) {
                observer.unobserve(self.element);
            }
        }
    }
}
