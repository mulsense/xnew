import { xnew } from '../core/xnew';

export function ResizeEvent(resize: any) {
    const observer = new ResizeObserver((entries: any) => {
        for (const entry of entries) {
            resize.emit('-resize');
            break;
        }
    });

    if (resize.element) {
        observer.observe(resize.element);
    }
    resize.on('finalize', () => {
        if (resize.element) {
            observer.unobserve(resize.element);
        }
    });
}


