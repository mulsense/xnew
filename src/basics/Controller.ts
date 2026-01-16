import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

//----------------------------------------------------------------------------------------------------
// controller
//----------------------------------------------------------------------------------------------------

function SVGTemplate(self: Unit,
    { stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round', fill = null, fillOpacity = 0.8 } 
    : { stroke?: string, strokeOpacity: number, strokeWidth: number, strokeLinejoin: string, fill: string | null, fillOpacity: number },
) {
    xnew.nest(`<svg
        viewBox="0 0 100 100"
        style="position: absolute; width: 100%; height: 100%; select: none;
        stroke: ${stroke}; stroke-opacity: ${strokeOpacity}; stroke-width: ${strokeWidth}; stroke-linejoin: ${strokeLinejoin};
        ${fill ? `fill: ${fill}; fill-opacity: ${fillOpacity};` : ''}
    ">`);
}


export function AnalogStick(unit: Unit,
    { stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round', fill = '#FFF', fillOpacity = 0.8 }:
    { stroke?: string, strokeOpacity?: number, strokeWidth?: number, strokeLinejoin?: string, diagonal?: boolean,fill?: string, fillOpacity?: number } = {}
) {
    const outer = xnew.nest(`<div style="position: relative; width: 100%; height: 100%;">`);

    const internal = xnew((unit: Unit) => {
        let newsize = Math.min(outer.clientWidth, outer.clientHeight);

        const inner = xnew.nest(`<div style="position: absolute; width: ${newsize}px; height: ${newsize}px; margin: auto; inset: 0; cursor: pointer; pointer-select: none; pointer-events: auto; overflow: hidden;">`);
        xnew(outer).on('resize', () => {
            newsize = Math.min(outer.clientWidth, outer.clientHeight);
            inner.style.width = `${newsize}px`;
            inner.style.height = `${newsize}px`;
        });
        
        xnew((unit: Unit) => {
            xnew.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
            xnew('<polygon points="50  7 40 18 60 18">');
            xnew('<polygon points="50 93 40 83 60 83">');
            xnew('<polygon points=" 7 50 18 40 18 60">');
            xnew('<polygon points="93 50 83 40 83 60">');
        });

        const target = xnew((unit: Unit) => {
            xnew.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
            xnew('<circle cx="50" cy="50" r="23">');
        });

        unit.on('dragstart', ({ event, position }: { event: any, position: { x: number, y: number } }) => {
            const vector = getVector(position);
            target.element.style.filter = 'brightness(90%)';
            target.element.style.left = vector.x * newsize / 4 + 'px';
            target.element.style.top = vector.y * newsize / 4 + 'px';
            xnew.emit('-down', { vector });
        });
        unit.on('dragmove', ({ event, position }: { event: any, position: { x: number, y: number } }) => {
            const vector = getVector(position);
            target.element.style.filter = 'brightness(90%)';
            target.element.style.left = vector.x * newsize / 4 + 'px';
            target.element.style.top = vector.y * newsize / 4 + 'px';
            xnew.emit('-move', { vector });
        });
        unit.on('dragend', ({ event }: { event: any }) => {
            const vector = { x: 0, y: 0 };
            target.element.style.filter = '';
            target.element.style.left = vector.x * newsize / 4 + 'px';
            target.element.style.top = vector.y * newsize / 4 + 'px';
            xnew.emit('-up', { vector });
        });
        function getVector(position: { x: number, y: number }) {
            const x = position.x - newsize / 2;
            const y = position.y - newsize / 2;
            const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (newsize / 4));
            const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
            return { x: Math.cos(a) * d, y: Math.sin(a) * d };
        }
    });

    internal.on('-down', (...args: any[]) => xnew.emit('-down', ...args));
    internal.on('-move', (...args: any[]) => xnew.emit('-move', ...args));
    internal.on('-up', (...args: any[]) => xnew.emit('-up', ...args));
}

export function DirectionalPad(unit: Unit,
    { diagonal = true, stroke = 'currentColor', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round', fill = '#FFF', fillOpacity = 0.8 }:
    { diagonal?: boolean, stroke?: string, strokeOpacity?: number, strokeWidth?: number, strokeLinejoin?: string, fill?: string, fillOpacity?: number } = {}
) {
    const outer = xnew.nest(`<div style="position: relative; width: 100%; height: 100%;">`);

    const internal = xnew((unit: Unit) => {
        let newsize = Math.min(outer.clientWidth, outer.clientHeight);

        const inner = xnew.nest(`<div style="position: absolute; width: ${newsize}px; height: ${newsize}px; margin: auto; inset: 0; cursor: pointer; pointer-select: none; pointer-events: auto; overflow: hidden;">`);
        xnew(outer).on('resize', () => {
            newsize = Math.min(outer.clientWidth, outer.clientHeight);
            inner.style.width = `${newsize}px`;
            inner.style.height = `${newsize}px`;
        });

        const polygons = [
            '<polygon points="50 50 35 35 35  5 37  3 63  3 65  5 65 35">',
            '<polygon points="50 50 35 65 35 95 37 97 63 97 65 95 65 65">',
            '<polygon points="50 50 35 35  5 35  3 37  3 63  5 65 35 65">',
            '<polygon points="50 50 65 35 95 35 97 37 97 63 95 65 65 65">'
        ];

        const targets = polygons.map((polygon) => {
            return xnew((unit: Unit) => {
                xnew.extend(SVGTemplate, { stroke: 'none', fill, fillOpacity });
                xnew(polygon);
            });
        });

        xnew((unit: Unit) => {
            xnew.extend(SVGTemplate, { fill: 'none', stroke, strokeOpacity, strokeWidth, strokeLinejoin });
            xnew('<polyline points="35 35 35  5 37  3 63  3 65  5 65 35">');
            xnew('<polyline points="35 65 35 95 37 97 63 97 65 95 65 65">');
            xnew('<polyline points="35 35  5 35  3 37  3 63  5 65 35 65">');
            xnew('<polyline points="65 35 95 35 97 37 97 63 95 65 65 65">');
            xnew('<polygon points="50 11 42 20 58 20">');
            xnew('<polygon points="50 89 42 80 58 80">');
            xnew('<polygon points="11 50 20 42 20 58">');
            xnew('<polygon points="89 50 80 42 80 58">');
        });

        unit.on('dragstart', ({ event, position }: { event: any, position: { x: number, y: number } }) => {
            const vector = getVector(position);
            targets[0].element.style.filter = (vector.y < 0) ? 'brightness(90%)' : '';
            targets[1].element.style.filter = (vector.y > 0) ? 'brightness(90%)' : '';
            targets[2].element.style.filter = (vector.x < 0) ? 'brightness(90%)' : '';
            targets[3].element.style.filter = (vector.x > 0) ? 'brightness(90%)' : '';
            xnew.emit('-down', { vector });
        });
        unit.on('dragmove', ({ event, position }: { event: any, position: { x: number, y: number } }) => {
            const vector = getVector(position);
            targets[0].element.style.filter = (vector.y < 0) ? 'brightness(90%)' : '';
            targets[1].element.style.filter = (vector.y > 0) ? 'brightness(90%)' : '';
            targets[2].element.style.filter = (vector.x < 0) ? 'brightness(90%)' : '';
            targets[3].element.style.filter = (vector.x > 0) ? 'brightness(90%)' : '';
            xnew.emit('-move', { vector });
        });
        unit.on('dragend', ({ event }: { event: any }) => {
            const vector = { x: 0, y: 0 };
            targets[0].element.style.filter = '';
            targets[1].element.style.filter = '';
            targets[2].element.style.filter = '';
            targets[3].element.style.filter = '';
            xnew.emit('-up', { vector });
        });
        function getVector(position: { x: number, y: number }) {
            const x = position.x - newsize / 2;
            const y = position.y - newsize / 2;
            const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
            const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (newsize / 4));
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
            return vector;
        }
    });

    internal.on('-down', (...args: any[]) => xnew.emit('-down', ...args));
    internal.on('-move', (...args: any[]) => xnew.emit('-move', ...args));
    internal.on('-up', (...args: any[]) => xnew.emit('-up', ...args));
    
}

