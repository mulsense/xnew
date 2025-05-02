import xnew from 'xnew';

export default function xutil() {
}

Object.defineProperty(xutil, 'AnalogStick', { enumerable: true, value: AnalogStick });
Object.defineProperty(xutil, 'DPad', { enumerable: true, value: DPad });
Object.defineProperty(xutil, 'CircleButton', { enumerable: true, value: CircleButton });


//----------------------------------------------------------------------------------------------------
// controller
//----------------------------------------------------------------------------------------------------

function AnalogStick(self,
    {
        size = 130,
        fill = '#FFF', fillOpacity = 0.8,
        stroke = '#000', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round'
    } = {}
) {
    strokeWidth /= (size / 100);

    xnew.nest({
        style: {
            position: 'relative', width: `${size}px`, height: `${size}px`,
            cursor: 'pointer', userSelect: 'none', overflow: 'hidden'
        }
    });

    xnew({
        tagName: 'svg',
        style: {
            position: 'absolute', width: '100%', height: '100%', userSelect: 'none',
            fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin,
        },
        viewBox: '0 0 100 100'
    },
        `
        <polygon points="50  7 40 18 60 18"></polygon>
        <polygon points="50 93 40 83 60 83"></polygon>
        <polygon points=" 7 50 18 40 18 60"></polygon>
        <polygon points="93 50 83 40 83 60"></polygon>
        `
    );

    const target = xnew({
        tagName: 'svg',
        style: {
            position: 'absolute', width: '100%', height: '100%',
            userSelect: 'none',
            fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin,
        },
        viewBox: '0 0 100 100'
    },
        `
        <circle cx="50" cy="50" r="23"></circle>
        `
    );

    const drag = xnew(xnew.DragEvent);

    drag.on('-down -move', ({ event, position }) => {
        target.element.style.filter = 'brightness(90%)';
        const x = position.x - size / 2;
        const y = position.y - size / 2;
        const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (size / 4));
        const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
        const vector = { x: Math.cos(a) * d, y: Math.sin(a) * d };
        xnew.emit(xnew.event.type, { vector });
        target.element.style.left = vector.x * size / 4 + 'px';
        target.element.style.top = vector.y * size / 4 + 'px';
    });

    drag.on('-up -cancel', ({ event }) => {
        target.element.style.filter = '';

        const vector = { x: 0, y: 0 };
        xnew.emit(xnew.event.type, { vector });
        target.element.style.left = vector.x * size / 4 + 'px';
        target.element.style.top = vector.y * size / 4 + 'px';
    });
}

function DPad(self,
    {
        size = 130,
        fill = '#FFF', fillOpacity = 0.8,
        stroke = '#000', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round'
    } = {}
) {
    strokeWidth /= (size / 100);

    xnew.nest({
        style: {
            position: 'relative', width: `${size}px`, height: `${size}px`,
            cursor: 'pointer', overflow: 'hidden', userSelect: 'none'
        }
    });

    const polygons = [
        '<polygon points="50 50 35 35 35  5 37  3 63  3 65  5 65 35"></polygon>',
        '<polygon points="50 50 35 65 35 95 37 97 63 97 65 95 65 65"></polygon>',
        '<polygon points="50 50 35 35  5 35  3 37  3 63  5 65 35 65"></polygon>',
        '<polygon points="50 50 65 35 95 35 97 37 97 63 95 65 65 65"></polygon>'
    ];

    const targets = polygons.map((polygon) => {
        return xnew({
            tagName: 'svg',
            style: {
                position: 'absolute', width: '100%', height: '100%',
                userSelect: 'none',
                fill, fillOpacity
            },
            viewBox: '0 0 100 100'
        }, polygon);
    });

    xnew({
        tagName: 'svg',
        style: {
            position: 'absolute', width: '100%', height: '100%',
            userSelect: 'none',
            fill: 'none', stroke, strokeOpacity, strokeWidth, strokeLinejoin,
        },
        viewBox: '0 0 100 100'
    },
        `
        <polyline points="35 35 35  5 37  3 63  3 65  5 65 35"></polyline>
        <polyline points="35 65 35 95 37 97 63 97 65 95 65 65"></polyline>
        <polyline points="35 35  5 35  3 37  3 63  5 65 35 65"></polyline>
        <polyline points="65 35 95 35 97 37 97 63 95 65 65 65"></polyline>
        <polygon points="50 11 42 20 58 20"></polygon>
        <polygon points="50 89 42 80 58 80"></polygon>
        <polygon points="11 50 20 42 20 58"></polygon>
        <polygon points="89 50 80 42 80 58"></polygon>
        `
    );

    const drag = xnew(xnew.DragEvent);

    drag.on('-down -move', ({ event, position }) => {
        const x = position.x - size / 2;
        const y = position.y - size / 2;
        const a = (y !== 0 || x !== 0) ? Math.atan2(y, x) : 0;
        const d = Math.min(1.0, Math.sqrt(x * x + y * y) / (size / 4));

        const vector = { x: Math.cos(a) * d, y: Math.sin(a) * d };
        vector.x = Math.abs(vector.x) > 0.5 ? Math.sign(vector.x) : 0;
        vector.y = Math.abs(vector.y) > 0.5 ? Math.sign(vector.y) : 0;
        targets[0].element.style.filter = (vector.y < 0) ? 'brightness(90%)' : '';
        targets[1].element.style.filter = (vector.y > 0) ? 'brightness(90%)' : '';
        targets[2].element.style.filter = (vector.x < 0) ? 'brightness(90%)' : '';
        targets[3].element.style.filter = (vector.x > 0) ? 'brightness(90%)' : '';
        xnew.emit(xnew.event.type, { vector });
    });

    drag.on('-up -cancel', ({ event }) => {
        const vector = { x: 0, y: 0 };
        targets[0].element.style.filter = '';
        targets[1].element.style.filter = '';
        targets[2].element.style.filter = '';
        targets[3].element.style.filter = '';
        xnew.emit(xnew.event.type, { vector });
    });
}

function CircleButton(self,
    {
        size = 80,
        fill = '#FFF', fillOpacity = 0.8,
        stroke = '#000', strokeOpacity = 0.8, strokeWidth = 2, strokeLinejoin = 'round'
    } = {}
) {
    strokeWidth /= (size / 100);
    xnew.nest({
        style: {
            position: 'relative', width: `${size}px`, height: `${size}px`,
            userSelect: 'none'
        }
    });

    const target = xnew({
        tagName: 'svg',
        style: {
            width: '100%', height: '100%', cursor: 'pointer',
            userSelect: 'none',
            fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin,
        },
        viewBox: '0 0 100 100'
    },
        `
        <circle cx="50" cy="50" r="40"></circle>
        `
    );

    const drag = xnew(xnew.DragEvent);

    drag.on('-down', (event) => {
        // target.element.style.filter = 'brightness(90%)';
        xnew.emit('-down', event);
    });
    drag.on('-up', (event) => {
        target.element.style.filter = '';
        xnew.emit('-up', event);
    });
}

