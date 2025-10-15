import xnew from 'xnew';

var xutil = {
    AnalogStick,
    DPad,
    CircleButton,
};
//----------------------------------------------------------------------------------------------------
// controller
//----------------------------------------------------------------------------------------------------
function SVGTemplate(self, { fill = null, fillOpacity = 0.8, stroke = null, strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round' }) {
    xnew.nest(`<svg
        viewBox="0 0 100 100"
        style="position: absolute; width: 100%; height: 100%; user-select: none;
        ${fill ? `fill: ${fill}; fill-opacity: ${fillOpacity};` : ''}
        ${stroke ? `stroke: ${stroke}; stroke-opacity: ${strokeOpacity}; stroke-width: ${strokeWidth}; stroke-linejoin: ${strokeLinejoin};` : ''}
    ">`);
}
function AnalogStick(self, { size = 130, fill = '#FFF', fillOpacity = 0.8, stroke = '#000', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round' } = {}) {
    strokeWidth /= (size / 100);
    xnew.nest(`<div style="position: relative; width: ${size}px; height: ${size}px; cursor: pointer; user-select: none; overflow: hidden;">`);
    xnew((self) => {
        xnew.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
        xnew('<polygon points="50  7 40 18 60 18">');
        xnew('<polygon points="50 93 40 83 60 83">');
        xnew('<polygon points=" 7 50 18 40 18 60">');
        xnew('<polygon points="93 50 83 40 83 60">');
    });
    const target = xnew((self) => {
        xnew.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
        xnew('<circle cx="50" cy="50" r="23">');
    });
    const user = xnew(xnew.UserEvent);
    user.on('-dragstart', ({ event, position }) => {
        const vector = getVector(position);
        target.element.style.filter = 'brightness(90%)';
        target.element.style.left = vector.x * size / 4 + 'px';
        target.element.style.top = vector.y * size / 4 + 'px';
        xnew.emit('-down', { vector });
    });
    user.on('-dragmove', ({ event, position }) => {
        const vector = getVector(position);
        target.element.style.filter = 'brightness(90%)';
        target.element.style.left = vector.x * size / 4 + 'px';
        target.element.style.top = vector.y * size / 4 + 'px';
        xnew.emit('-move', { vector });
    });
    user.on('-dragend', ({ event }) => {
        const vector = { x: 0, y: 0 };
        target.element.style.filter = '';
        target.element.style.left = vector.x * size / 4 + 'px';
        target.element.style.top = vector.y * size / 4 + 'px';
        xnew.emit('-up', { vector });
    });
    function getVector(position) {
        const x = position.x - size / 2;
        const y = position.y - size / 2;
        const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (size / 4));
        const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
        return { x: Math.cos(a) * d, y: Math.sin(a) * d };
    }
}
function DPad(self, { size = 130, fill = '#FFF', fillOpacity = 0.8, stroke = '#000', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round' } = {}) {
    strokeWidth /= (size / 100);
    xnew.nest(`<div style="position: relative; width: ${size}px; height: ${size}px; cursor: pointer; user-select: none; overflow: hidden;">`);
    const polygons = [
        '<polygon points="50 50 35 35 35  5 37  3 63  3 65  5 65 35">',
        '<polygon points="50 50 35 65 35 95 37 97 63 97 65 95 65 65">',
        '<polygon points="50 50 35 35  5 35  3 37  3 63  5 65 35 65">',
        '<polygon points="50 50 65 35 95 35 97 37 97 63 95 65 65 65">'
    ];
    const targets = polygons.map((polygon) => {
        return xnew((self) => {
            xnew.extend(SVGTemplate, { fill, fillOpacity });
            xnew(polygon);
        });
    });
    xnew((self) => {
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
    const user = xnew(xnew.UserEvent);
    user.on('-dragstart', ({ event, position }) => {
        const vector = getVector(position);
        targets[0].element.style.filter = (vector.y < 0) ? 'brightness(90%)' : '';
        targets[1].element.style.filter = (vector.y > 0) ? 'brightness(90%)' : '';
        targets[2].element.style.filter = (vector.x < 0) ? 'brightness(90%)' : '';
        targets[3].element.style.filter = (vector.x > 0) ? 'brightness(90%)' : '';
        xnew.emit('-down', { vector });
    });
    user.on('-dragmove', ({ event, position }) => {
        const vector = getVector(position);
        targets[0].element.style.filter = (vector.y < 0) ? 'brightness(90%)' : '';
        targets[1].element.style.filter = (vector.y > 0) ? 'brightness(90%)' : '';
        targets[2].element.style.filter = (vector.x < 0) ? 'brightness(90%)' : '';
        targets[3].element.style.filter = (vector.x > 0) ? 'brightness(90%)' : '';
        xnew.emit('-move', { vector });
    });
    user.on('-dragend', ({ event }) => {
        const vector = { x: 0, y: 0 };
        targets[0].element.style.filter = '';
        targets[1].element.style.filter = '';
        targets[2].element.style.filter = '';
        targets[3].element.style.filter = '';
        xnew.emit('-up', { vector });
    });
    function getVector(position) {
        const x = position.x - size / 2;
        const y = position.y - size / 2;
        const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
        const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (size / 4));
        const vector = { x: Math.cos(a) * d, y: Math.sin(a) * d };
        vector.x = Math.abs(vector.x) > 0.5 ? Math.sign(vector.x) : 0;
        vector.y = Math.abs(vector.y) > 0.5 ? Math.sign(vector.y) : 0;
        return vector;
    }
}
function CircleButton(self, { size = 80, fill = '#FFF', fillOpacity = 0.8, stroke = '#000', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round' } = {}) {
    strokeWidth /= (size / 100);
    xnew.nest(`<div style="position: relative; width: ${size}px; height: ${size}px; cursor: pointer; user-select: none; overflow: hidden;">`);
    const target = xnew((self) => {
        xnew.extend(SVGTemplate, { fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin });
        xnew('<circle cx="50" cy="50" r="40">');
    });
    const user = xnew(xnew.UserEvent);
    user.on('-dragstart', (event) => {
        target.element.style.filter = 'brightness(90%)';
        xnew.emit('-down', event);
    });
    user.on('-dragend', (event) => {
        target.element.style.filter = '';
        xnew.emit('-up', event);
    });
}

export { xutil as default };
