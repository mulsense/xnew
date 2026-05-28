//----------------------------------------------------------------------------------------------------
// Screen — aspect-fitted <canvas> component
//
// Wraps a fixed-resolution <canvas> in an Aspect container so the drawing buffer keeps the
// requested width × height while CSS scales it to the surrounding box. Convenience component
// used as the base of game-style examples.
//
// - Screen : component({ width, height, fit }) returning { canvas }
//----------------------------------------------------------------------------------------------------

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
