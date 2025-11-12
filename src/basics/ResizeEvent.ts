import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function ResizeEvent(resize: Unit) {
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


