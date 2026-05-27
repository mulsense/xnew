import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { SVG } from '../basics/SVG';
import { Aspect } from '../basics/Aspect';

//----------------------------------------------------------------------------------------------------
// controller
//----------------------------------------------------------------------------------------------------

const svgTemplate = { viewBox: '0 0 64 64', style: "position: absolute; width: 100%; height: 100%;" };

export function AnalogStick(unit: Unit,
    { stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 1, fill = '#FFF', fillOpacity = 0.8 }:
    { stroke?: string, strokeOpacity?: number, strokeWidth?: number, fill?: string, fillOpacity?: number } = {}
) {
    xnew.extend(Aspect, { aspect: 1.0, fit: 'contain' });
    xnew.nest(`<div style="width: 100%; height: 100%; cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: none; pointer-events: auto;">`);

    xnew((unit: Unit) => {
        xnew.extend(SVG, { ...svgTemplate, stroke, strokeOpacity, strokeWidth, fill, fillOpacity });
        xnew('<polygon points="32  7 27 13 37 13">');
        xnew('<polygon points="32 57 27 51 37 51">');
        xnew('<polygon points=" 7 32 13 27 13 37">');
        xnew('<polygon points="57 32 51 27 51 37">');
    });

    const target = xnew((unit: Unit) => {
        xnew.extend(SVG, { ...svgTemplate, stroke, strokeOpacity, strokeWidth, fill, fillOpacity });
        xnew('<circle cx="32" cy="32" r="14">');
    });

    unit.on('dragstart dragmove', ({ type, position }: { type: string, position: { x: number, y: number } }) => {
        const size = unit.element.clientWidth;
        const x = position.x - size / 2;
        const y = position.y - size / 2;
        const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (size / 4));
        const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
        const vector = { x: Math.cos(a) * d, y: Math.sin(a) * d };

        Object.assign(target.element.style, { filter: 'brightness(80%)', left: `${vector.x * size / 4}px`, top: `${vector.y * size / 4}px` });
        const nexttype = { dragstart: '-down', dragmove: '-move' }[type] as string;
        xnew.emit(nexttype, { vector });
    });

    unit.on('dragend', () => {
        Object.assign(target.element.style, { filter: '', left: '0px', top: '0px' });
        xnew.emit('-up', { vector: { x: 0, y: 0 } });
    });
}

export function DPad(unit: Unit,
    { diagonal = true, stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 1, fill = '#FFF', fillOpacity = 0.8 }:
    { diagonal?: boolean, stroke?: string, strokeOpacity?: number, strokeWidth?: number, fill?: string, fillOpacity?: number } = {}
) {
    xnew.extend(Aspect, { aspect: 1.0, fit: 'contain' });
    xnew.nest(`<div style="width: 100%; height: 100%; cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: none; pointer-events: auto;">`);

    const polygons = [
        '<polygon points="32 32 23 23 23  4 24  3 40  3 41  4 41 23">',
        '<polygon points="32 32 23 41 23 60 24 61 40 61 41 60 41 41">',
        '<polygon points="32 32 23 23  4 23  3 24  3 40  4 41 23 41">',
        '<polygon points="32 32 41 23 60 23 61 24 61 40 60 41 41 41">'
    ];

    const targets = polygons.map((polygon) => {
        return xnew((unit: Unit) => {
            xnew.extend(SVG, { ...svgTemplate, fill, fillOpacity });
            xnew(polygon);
        });
    });

    xnew((unit: Unit) => {
        xnew.extend(SVG, { ...svgTemplate, stroke, strokeOpacity, strokeWidth });
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
        targets[0].element.style.filter = '';
        targets[1].element.style.filter = '';
        targets[2].element.style.filter = '';
        targets[3].element.style.filter = '';
        xnew.emit('-up', { vector: { x: 0, y: 0 } });
    });
}
