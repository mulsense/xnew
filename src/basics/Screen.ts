import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

interface ScreenSize { width: number, height: number }
type ScreenFit = 'contain' | 'cover' | 'fill' | 'resize';

export function Screen(unit: Unit, { width, height, fit = 'contain' }: { width?: number, height?: number, fit?: ScreenFit } = {}) {
    const size: ScreenSize = { width: width ?? 800, height: height ?? 600 };

    const outer = xnew.nest('<div style="position: relative; width: 100%; height: 100%; overflow: hidden;">');
    xnew().on('resize', resize);

    const absolute = xnew.nest('<div style="position: absolute; margin: auto; container-type: size; overflow: hidden;">');

    const canvas = xnew(`<canvas width="${size.width}" height="${size.height}" style="width: 100%; height: 100%; vertical-align: bottom; user-select: none; user-drag: none; pointer-events: auto;">`);

    resize();

    function resize() {
        const style: any = { width: '100%', height: '100%', top: 0, left: 0, bottom: 0, right: 0 };
        
        if (fit === 'contain') {
            const aspect = size.width / size.height;
            if (outer.clientWidth < outer.clientHeight * aspect) {
                style.height = Math.floor(outer.clientWidth / aspect) + 'px';
            } else {
                style.width = Math.floor(outer.clientHeight * aspect) + 'px';
            }
        } else if (fit === 'cover') {
            const aspect = size.width / size.height;
            if (outer.clientWidth < outer.clientHeight * aspect) {
                style.width = Math.floor(outer.clientHeight * aspect) + 'px';
                style.left = Math.floor((outer.clientWidth - outer.clientHeight * aspect) / 2) + 'px';
                style.right = 'auto';
            } else {
                style.height = Math.floor(outer.clientWidth / aspect) + 'px';
                style.top = Math.floor((outer.clientHeight - outer.clientWidth / aspect) / 2) + 'px';
                style.bottom = 'auto';
            }
        } else if (fit === 'resize') {
            size.width = outer.clientWidth > 0 ? outer.clientWidth : size.width;
            size.height = outer.clientHeight > 0 ? outer.clientHeight : size.height;
            console.log(size);
            canvas.element.setAttribute('width', size.width + 'px');
            canvas.element.setAttribute('height', size.height + 'px');
        }
        Object.assign((absolute as HTMLElement).style, style);
    }

    return {
        get canvas() {
            return canvas.element;
        },
    }
}
