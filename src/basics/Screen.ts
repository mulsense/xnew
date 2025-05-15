import { xnew } from '../core/xnew';
import { ResizeEvent } from './ResizeEvent';

export function Screen(self: any, { width = 640, height = 480, fit = 'contain' } = {}) {
    const wrapper = xnew.nest({
        style: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }
    });
    const absolute = xnew.nest({
        style: { position: 'absolute', margin: 'auto' } 
    });

    const canvas = xnew({
        tagName: 'canvas', width, height,
        style: { width: '100%', height: '100%', verticalAlign: 'bottom' }
    });

    const observer = xnew(wrapper, ResizeEvent);
    observer.on('-resize', resize);
    resize();

    function resize() {
        const aspect = canvas.element.width / canvas.element.height;
        const style: any = { width: '100%', height: '100%', top: 0, left: 0, bottom: 0, right: 0 };
        
        if (fit === 'contain') {
            if (wrapper.clientWidth < wrapper.clientHeight * aspect) {
                style.height = Math.floor(wrapper.clientWidth / aspect) + 'px';
            } else {
                style.width = Math.floor(wrapper.clientHeight * aspect) + 'px';
            }
        } else if (fit === 'cover') {
            if (wrapper.clientWidth < wrapper.clientHeight * aspect) {
                style.width = Math.floor(wrapper.clientHeight * aspect) + 'px';
                style.left = Math.floor((wrapper.clientWidth - wrapper.clientHeight * aspect) / 2) + 'px';
                style.right = 'auto';
            } else {
                style.height = Math.floor(wrapper.clientWidth / aspect) + 'px';
                style.top = Math.floor((wrapper.clientHeight - wrapper.clientWidth / aspect) / 2) + 'px';
                style.bottom = 'auto';
            }
        } else if (fit === 'fill') {
        }
        Object.assign(absolute.style, style);
    }

    return {
        get canvas() {
            return canvas.element;
        },
        resize(width: number, height: number): void{
            canvas.element.width = width;
            canvas.element.height = height;
            resize();
        },
        get scale() {
            return { x: canvas.element.width / canvas.element.clientWidth, y: canvas.element.height / canvas.element.clientHeight };
        }
    }
}
