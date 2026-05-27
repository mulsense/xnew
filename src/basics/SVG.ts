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

interface SVGTextInterface {
    text?: string;
    fontSize?: number;
    anchor?: { x: number, y: number };
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


export function SVGText(unit: Unit, {
    text = '',
    fontSize = 20,
    anchor = { x: 0, y: 0 },
    className = '',
    style = '',
    stroke = 'none',
    strokeOpacity = 1,
    strokeWidth = 1,
    strokeLinejoin = 'round',
    strokeLinecap = 'round',
    fill = 'currentColor',
    fillOpacity = 1
}: SVGTextInterface = {}) {
    xnew.extend(SVG, { className, style, stroke, strokeOpacity, strokeWidth, strokeLinejoin, strokeLinecap, fill, fillOpacity });
    const svg = unit.element as SVGSVGElement;

    xnew.nest(`<text x="0" y="0" font-size="${fontSize}">`);
    unit.element.textContent = text;

    const bbox = (unit.element as SVGGraphicsElement).getBBox();
    const padding = 0;
    svg.setAttribute('viewBox', `
        ${bbox.x - padding}
        ${bbox.y - padding}
        ${bbox.width + padding * 2}
        ${bbox.height + padding * 2}
    `);

    svg.style.width = (bbox.width + padding * 2) + 'px';
    svg.style.overflow = 'visible';
}