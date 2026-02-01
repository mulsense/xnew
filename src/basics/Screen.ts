import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function Screen(unit: Unit,
    { width = 640, height = 480, fit = 'contain' } = {}
) {
    const size = { width, height };
    const wrapper = xnew.nest('<div style="position: relative; width: 100%; height: 100%; overflow: hidden;">');
    unit.on('resize', resize);

    const absolute = xnew.nest('<div style="position: absolute; margin: auto; container-type: size; overflow: hidden;">');
    const canvas = xnew(`<canvas width="${width}" height="${height}" style="width: 100%; height: 100%; vertical-align: bottom; user-select: none; user-drag: none; pointer-events: auto;">`);
  

    resize();

    function resize() {
        const aspect = size.width / size.height;
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
        Object.assign((absolute as HTMLElement).style, style);
    }

    return {
        get canvas() {
            return canvas.element;
        },
        resize(width: number, height: number): void{
            size.width = width;
            size.height = height;
            canvas.element.setAttribute('width', width + 'px');
            canvas.element.setAttribute('height', height + 'px');
            resize();
        },
    }
}
