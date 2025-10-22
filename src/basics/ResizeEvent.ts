import { xnew } from '../core/xnew';

export function ResizeEvent(self: any) {
    const observer = new ResizeObserver(xnew.scope((entries: any) => {
        for (const entry of entries) {
            self.emit('-resize');
            break;
        }
    }));

    if (self.element) {
        observer.observe(self.element);
    }
    self.on('finalize', () => {
        if (self.element) {
            observer.unobserve(self.element);
        }
    });
}


