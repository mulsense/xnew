import { xnew } from '../core/xnew';

export function ResizeEvent(self) {
    const observer = new ResizeObserver(xnew.scope((entries) => {
        for (const entry of entries) {
            xnew.emit('-resize');
            break;
        }
    }));

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
