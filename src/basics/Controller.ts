import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { PointerEvent, ResizeEvent } from './Event';

//----------------------------------------------------------------------------------------------------
// controller
//----------------------------------------------------------------------------------------------------

function SVGTemplate(self: Unit,
    { fill = null, fillOpacity = 0.8, stroke = null, strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round' } 
    : { fill: string | null, fillOpacity: number, stroke: string | null, strokeOpacity: number, strokeWidth: number, strokeLinejoin: string },
) {
    xnew.nest(`<svg
        viewBox="0 0 100 100"
        style="position: absolute; width: 100%; height: 100%; pointer-select: none;
        ${fill ? `fill: ${fill}; fill-opacity: ${fillOpacity};` : ''}
        ${stroke ? `stroke: ${stroke}; stroke-opacity: ${strokeOpacity}; stroke-width: ${strokeWidth}; stroke-linejoin: ${strokeLinejoin};` : ''}
    ">`);
}



export function AnalogStick(self: Unit,
    { size, fill = '#FFF', fillOpacity = 0.8, stroke = '#000', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round' }:
    { size?: number, diagonal?: boolean,fill?: string, fillOpacity?: number, stroke?: string, strokeOpacity?: number, strokeWidth?: number, strokeLinejoin?: string } = {}

) {
    xnew.nest(`<div style="position: relative; width: 100%; height: 100%;">`);
    let internal: Unit;
    let newsize: number;
    if (size) {
        newsize = size;
    } else {
        newsize = Math.min(self.element.clientWidth, self.element.clientHeight);
        xnew(self.element, ResizeEvent).on('-resize', () => {
            newsize = Math.min(self.element.clientWidth, self.element.clientHeight);
            internal?.reboot();
        });
    }

    internal = xnew(() => {
        xnew.nest(`<div style="position: absolute; width: ${newsize}px; height: ${newsize}px; margin: auto; inset: 0; cursor: pointer; pointer-select: none; pointer-events: auto; overflow: hidden;">`);

        xnew((self: Unit) => {
            xnew.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
            xnew('<polygon points="50  7 40 18 60 18">');
            xnew('<polygon points="50 93 40 83 60 83">');
            xnew('<polygon points=" 7 50 18 40 18 60">');
            xnew('<polygon points="93 50 83 40 83 60">');
        });

        const target = xnew((self: Unit) => {
            xnew.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
            xnew('<circle cx="50" cy="50" r="23">');
        });

        const pointer = xnew(PointerEvent);

        pointer.on('-dragstart', ({ event, position }: { event: any, position: { x: number, y: number } }) => {
            const vector = getVector(position);
            target.element.style.filter = 'brightness(90%)';
            target.element.style.left = vector.x * newsize / 4 + 'px';
            target.element.style.top = vector.y * newsize / 4 + 'px';
            self.emit('-down', { vector });
        });
        pointer.on('-dragmove', ({ event, position }: { event: any, position: { x: number, y: number } }) => {
            const vector = getVector(position);
            target.element.style.filter = 'brightness(90%)';
            target.element.style.left = vector.x * newsize / 4 + 'px';
            target.element.style.top = vector.y * newsize / 4 + 'px';
            self.emit('-move', { vector });
        });
        pointer.on('-dragend', ({ event }: { event: any }) => {
            const vector = { x: 0, y: 0 };
            target.element.style.filter = '';
            target.element.style.left = vector.x * newsize / 4 + 'px';
            target.element.style.top = vector.y * newsize / 4 + 'px';
            self.emit('-up', { vector });
        });
        function getVector(position: { x: number, y: number }) {
            const x = position.x - newsize / 2;
            const y = position.y - newsize / 2;
            const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (newsize / 4));
            const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
            return { x: Math.cos(a) * d, y: Math.sin(a) * d };
        }
    });
}

export function DirectionalPad(self: Unit,
    { size, diagonal = true, fill = '#FFF', fillOpacity = 0.8, stroke = '#000', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round' }:
    { size?: number, diagonal?: boolean, fill?: string, fillOpacity?: number, stroke?: string, strokeOpacity?: number, strokeWidth?: number, strokeLinejoin?: string } = {}
) {
    xnew.nest(`<div style="position: relative; width: 100%; height: 100%;">`);
    let internal: Unit;
    let newsize: number;
    if (size) {
        newsize = size;
    } else {
        newsize = Math.min(self.element.clientWidth, self.element.clientHeight);
        xnew(self.element, ResizeEvent).on('-resize', () => {
            newsize = Math.min(self.element.clientWidth, self.element.clientHeight);
            internal?.reboot();
        });
    }

    internal = xnew(() => {
        xnew.nest(`<div style="position: absolute; width: ${newsize}px; height: ${newsize}px; margin: auto; inset: 0; cursor: pointer; pointer-select: none; pointer-events: auto; overflow: hidden;">`);

        const polygons = [
            '<polygon points="50 50 35 35 35  5 37  3 63  3 65  5 65 35">',
            '<polygon points="50 50 35 65 35 95 37 97 63 97 65 95 65 65">',
            '<polygon points="50 50 35 35  5 35  3 37  3 63  5 65 35 65">',
            '<polygon points="50 50 65 35 95 35 97 37 97 63 95 65 65 65">'
        ];

        const targets = polygons.map((polygon) => {
            return xnew((self: Unit) => {
                xnew.extend(SVGTemplate, { fill, fillOpacity });
                xnew(polygon);
            });
        });

        xnew((self: Unit) => {
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

        const pointer = xnew(PointerEvent);

        pointer.on('-dragstart', ({ event, position }: { event: any, position: { x: number, y: number } }) => {
            const vector = getVector(position);
            targets[0].element.style.filter = (vector.y < 0) ? 'brightness(90%)' : '';
            targets[1].element.style.filter = (vector.y > 0) ? 'brightness(90%)' : '';
            targets[2].element.style.filter = (vector.x < 0) ? 'brightness(90%)' : '';
            targets[3].element.style.filter = (vector.x > 0) ? 'brightness(90%)' : '';
            self.emit('-down', { vector });
        });
        pointer.on('-dragmove', ({ event, position }: { event: any, position: { x: number, y: number } }) => {
            const vector = getVector(position);
            targets[0].element.style.filter = (vector.y < 0) ? 'brightness(90%)' : '';
            targets[1].element.style.filter = (vector.y > 0) ? 'brightness(90%)' : '';
            targets[2].element.style.filter = (vector.x < 0) ? 'brightness(90%)' : '';
            targets[3].element.style.filter = (vector.x > 0) ? 'brightness(90%)' : '';
            self.emit('-move', { vector });
        });
        pointer.on('-dragend', ({ event }: { event: any }) => {
            const vector = { x: 0, y: 0 };
            targets[0].element.style.filter = '';
            targets[1].element.style.filter = '';
            targets[2].element.style.filter = '';
            targets[3].element.style.filter = '';
            self.emit('-up', { vector });
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
    
}

export function TouchButton(self: Unit,
    { size = 80, fill = '#FFF', fillOpacity = 0.8, stroke = '#000', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round' } = {}
) {
    strokeWidth /= (size / 100);
    xnew.nest(`<div style="position: relative; width: ${size}px; height: ${size}px; cursor: pointer; pointer-select: none; overflow: hidden;">`);

    const target = xnew((self: Unit) => {
        xnew.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
        xnew('<circle cx="50" cy="50" r="40">');
    });

    const pointer = xnew(PointerEvent);
    pointer.on('-dragstart', (event: any) => {
        target.element.style.filter = 'brightness(90%)';
        self.emit('-down', event);
    });
    pointer.on('-dragend', (event: any) => {
        target.element.style.filter = '';
        self.emit('-up', event);
    });
}

