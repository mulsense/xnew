import { xnew } from '../core/xnew';

export function ResizeEvent(self) {
    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            self.emit('-resize');
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
