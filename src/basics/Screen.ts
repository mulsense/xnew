import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { Aspect } from '../basics/Aspect';

export function Screen(unit: Unit,
    { width = 800, height = 600, fit = 'contain' }:
    { width?: number, height?: number, fit?: 'contain' | 'cover' } = {}
) {
    xnew.extend(Aspect, { aspect: width / height, fit });
    
    const canvas = xnew(`<canvas width="${width}" height="${height}" style="width: 100%; height: 100%; vertical-align: bottom;">`);

    return {
        get canvas() { return canvas.element; },
    }
}
