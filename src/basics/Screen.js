import { xnew } from '../core/xnew';
import { ResizeEvent } from './ResizeEvent';
import { PointerEvent } from './PointerEvent';

export function Screen(self, { width = 640, height = 480, fit = 'contain' } = {}) {
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
        const style = { width: '100%', height: '100%', top: 0, left: 0, bottom: 0, right: 0 };
        
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

    const pointer = xnew(canvas, PointerEvent);
    pointer.on('-wheel', (data) => self.emit('-wheel', scale(data)));
    pointer.on('-pointermove', (data) => self.emit('-pointermove', scale(data)));
    pointer.on('-pointerdown', (data) => self.emit('-pointerdown', scale(data)));
    pointer.on('-pointerup', (data) => self.emit('-pointerup', scale(data)));
    pointer.on('-pointercancel', (data) => self.emit('-pointercancel', scale(data)));

    pointer.on('-gesturestart', (data) => self.emit('-gesturestart', scale(data)));
    pointer.on('-gesturemove', (data) => self.emit('-gesturemove', scale(data)));
    pointer.on('-gestureend', (data) => self.emit('-gestureend', scale(data)));
    pointer.on('-gesturecancel', (data) => self.emit('-gesturecancel', scale(data)));

    pointer.on('-dragstart', (data) => self.emit('-dragstart', scale(data)));
    pointer.on('-dragmove', (data) => self.emit('-dragmove', scale(data)));
    pointer.on('-dragend', (data) => self.emit('-dragend', scale(data)));
    pointer.on('-dragcancel', (data) => self.emit('-dragcancel', scale(data)));

    function scale(data) {
        const sx = canvas.element.width / canvas.element.clientWidth;
        const sy = canvas.element.height / canvas.element.clientHeight;
        if (data.position) {
            data.position.x *= sx;
            data.position.y *= sy;
        }
        if (data.delta) {
            data.delta.x *= sx;
            data.delta.y *= sy;
        }
        return data;
    }

    return {
        get canvas() {
            return canvas.element;
        },
        resize(width, height) {
            canvas.element.width = width;
            canvas.element.height = height;
            resize();
        },
        get scale() {
            return { x: canvas.element.width / canvas.element.clientWidth, y: canvas.element.height / canvas.element.clientHeight };
        }
    }
}
