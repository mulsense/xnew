import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

//----------------------------------------------------------------------------------------------------
// controller
//----------------------------------------------------------------------------------------------------

function SVGTemplate(self: Unit,
    { stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 1, strokeLinejoin = 'round', fill = null, fillOpacity = 0.8 }:
    { stroke?: string, strokeOpacity: number, strokeWidth: number, strokeLinejoin: string, fill: string | null, fillOpacity: number },
) {
    xnew.nest(`<svg
        viewBox="0 0 64 64"
        style="position: absolute; width: 100%; height: 100%; select: none;
        stroke: ${stroke}; stroke-opacity: ${strokeOpacity}; stroke-width: ${strokeWidth}; stroke-linejoin: ${strokeLinejoin};
        ${fill ? `fill: ${fill}; fill-opacity: ${fillOpacity};` : ''}
    ">`);
}

export function AnalogStick(unit: Unit,
    { stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 1, strokeLinejoin = 'round', fill = '#FFF', fillOpacity = 0.8 }:
    { stroke?: string, strokeOpacity?: number, strokeWidth?: number, strokeLinejoin?: string, diagonal?: boolean,fill?: string, fillOpacity?: number } = {}
) {
    xnew.nest(`<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; container-type: size;">`);
    xnew.nest(`<div style="width: min(100cqw, 100cqh); aspect-ratio: 1; cursor: pointer; pointer-select: none; pointer-events: auto; overflow: hidden;">`);
    
    xnew((unit: Unit) => {
        xnew.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
        xnew('<polygon points="32  7 27 13 37 13">');
        xnew('<polygon points="32 57 27 51 37 51">');
        xnew('<polygon points=" 7 32 13 27 13 37">');
        xnew('<polygon points="57 32 51 27 51 37">');
    });

    const target = xnew((unit: Unit) => {
        xnew.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
        xnew('<circle cx="32" cy="32" r="14">');
    });

    unit.on('dragstart dragmove', ({ type, position }: { type: string, position: { x: number, y: number } }) => {
        const size = unit.element.clientWidth;
        const x = position.x - size / 2;
        const y = position.y - size / 2;
        const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (size / 4));
        const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
        const vector = { x: Math.cos(a) * d, y: Math.sin(a) * d };

        target.element.style.filter = 'brightness(80%)';
        target.element.style.left = `${vector.x * size / 4}px`;
        target.element.style.top = `${vector.y * size / 4}px`;
        const nexttype = { dragstart: '-down', dragmove: '-move' }[type] as string;
        xnew.emit(nexttype, { vector });
    });

    unit.on('dragend', () => {
        const size = unit.element.clientWidth;
        const vector = { x: 0, y: 0 };
        target.element.style.filter = '';
        target.element.style.left = `${vector.x * size / 4}px`;
        target.element.style.top = `${vector.y * size / 4}px`;
        xnew.emit('-up', { vector });
    });
}

export function DPad(unit: Unit,
    { diagonal = true, stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 1, strokeLinejoin = 'round', fill = '#FFF', fillOpacity = 0.8 }:
    { diagonal?: boolean, stroke?: string, strokeOpacity?: number, strokeWidth?: number, strokeLinejoin?: string, fill?: string, fillOpacity?: number } = {}
) {
    xnew.nest(`<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; container-type: size;">`);
    xnew.nest(`<div style="width: min(100cqw, 100cqh); aspect-ratio: 1; cursor: pointer; pointer-select: none; pointer-events: auto; overflow: hidden;">`);

    const polygons = [
        '<polygon points="32 32 23 23 23  4 24  3 40  3 41  4 41 23">',
        '<polygon points="32 32 23 41 23 60 24 61 40 61 41 60 41 41">',
        '<polygon points="32 32 23 23  4 23  3 24  3 40  4 41 23 41">',
        '<polygon points="32 32 41 23 60 23 61 24 61 40 60 41 41 41">'
    ];

    const targets = polygons.map((polygon) => {
        return xnew((unit: Unit) => {
            xnew.extend(SVGTemplate, { stroke: 'none', fill, fillOpacity });
            xnew(polygon);
        });
    });

    xnew((unit: Unit) => {
        xnew.extend(SVGTemplate, { fill: 'none', stroke, strokeOpacity, strokeWidth, strokeLinejoin });
        xnew('<polyline points="23 23 23  4 24  3 40  3 41  4 41 23">');
        xnew('<polyline points="23 41 23 60 24 61 40 61 41 60 41 41">');
        xnew('<polyline points="23 23  4 23  3 24  3 40  4 41 23 41">');
        xnew('<polyline points="41 23 60 23 61 24 61 40 60 41 41 41">');
        xnew('<polygon points="32  7 27 13 37 13">');
        xnew('<polygon points="32 57 27 51 37 51">');
        xnew('<polygon points=" 7 32 13 27 13 37">');
        xnew('<polygon points="57 32 51 27 51 37">');
    });

    unit.on('dragstart dragmove', ({ type, position }: { type: string, position: { x: number, y: number } }) => {
        const size = unit.element.clientWidth;
        const x = position.x - size / 2;
        const y = position.y - size / 2;
        const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
        const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (size / 4));
        const vector = { x: Math.cos(a) * d, y: Math.sin(a) * d };
        if (diagonal === true) {
            vector.x = Math.abs(vector.x) > 0.5 ? Math.sign(vector.x) : 0;
            vector.y = Math.abs(vector.y) > 0.5 ? Math.sign(vector.y) : 0;
        } else if (Math.abs(vector.x) > Math.abs(vector.y)) {
            vector.x = Math.abs(vector.x) > 0.5 ? Math.sign(vector.x) : 0;
            vector.y = 0;
        } else {
            vector.x = 0;
            vector.y = Math.abs(vector.y) > 0.5 ? Math.sign(vector.y) : 0;
        }

        targets[0].element.style.filter = (vector.y < 0) ? 'brightness(80%)' : '';
        targets[1].element.style.filter = (vector.y > 0) ? 'brightness(80%)' : '';
        targets[2].element.style.filter = (vector.x < 0) ? 'brightness(80%)' : '';
        targets[3].element.style.filter = (vector.x > 0) ? 'brightness(80%)' : '';
        const nexttype = { dragstart: '-down', dragmove: '-move' }[type] as string;
        xnew.emit(nexttype, { vector });
    });

    unit.on('dragend', () => {
        const vector = { x: 0, y: 0 };
        targets[0].element.style.filter = '';
        targets[1].element.style.filter = '';
        targets[2].element.style.filter = '';
        targets[3].element.style.filter = '';
        xnew.emit('-up', { vector });
    });
}

