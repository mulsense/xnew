import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

//----------------------------------------------------------------------------------------------------
// svg template
//----------------------------------------------------------------------------------------------------

interface SVGInterface {
    viewBox?: string;
    className?: string;
    style?: string;
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    strokeLinejoin?: string;
    strokeLinecap?: string;
    fill?: string;
    fillOpacity?: number;
}

export function SVG(unit: Unit,
    {
        viewBox = '0 0 64 64',
        className = '',
        style = '',
        stroke = 'none',
        strokeOpacity = 1,
        strokeWidth = 1,
        strokeLinejoin = 'round',
        strokeLinecap = 'round',
        fill = 'none',
        fillOpacity = 1
    }:
    SVGInterface = {}
) {
    xnew.nest(`<svg
        viewBox="${viewBox}"
        class="${className}"
        style="${style}"
        stroke="${stroke}"
        stroke-opacity="${strokeOpacity}"
        stroke-width="${strokeWidth}"
        stroke-linejoin="${strokeLinejoin}"
        stroke-linecap="${strokeLinecap}"
        fill="${fill}"
        fill-opacity="${fillOpacity}"
    ">`);
}
