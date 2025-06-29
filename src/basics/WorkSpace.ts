import { xnew } from '../core/xnew';
import { UserEvent } from './UserEvent';

interface Position {
    x: number | null | undefined;
    y: number | null | undefined;
}

interface Transform {
    position: Position | null | undefined;
    rotation: number | null | undefined;
    scale: number | null | undefined;
}

export function WorkSpace(self: xnew.Unit, attributes: any = {}) {
    xnew.context('workspace', self);

    const current: Transform = {
        position : { x: 0, y: 0 },
        rotation: 0,
        scale: 1
    }

    const local = attributes;
    local.style = Object.assign(local.style ?? {}, { overflow: 'hidden', });    
    const fix = xnew.nest(local);

    xnew(Controller);

    const base = xnew.nest({ style: { position: 'absolute', top: '0px', left: '0px' } });
    xnew(Grid);
    return {
        get transform(): Transform {
            return current;
        },
        move(transform: Transform) {
            if (transform.position) {
                current.position = transform.position;
            }
            if (transform.rotation) {
                current.rotation = transform.rotation;
            }
            if (transform.scale) {
                current.scale = transform.scale;
            }
        },
        update() {
            let text = '';
            if (current.position) {
                text += `translate(${current.position.x}px, ${current.position.y}px) `;
            }
            if (current.rotation) {
                text += `rotate(${current.rotation}deg) `;
            }
            if (current.scale) {
                text += `scale(${current.scale}) `;
            }
            base.style.transform = text;
        }
    }
}

function Controller(self: xnew.Unit) {
    const ws = xnew.context('workspace');
    self.on('touchstart contextmenu wheel', (event) => event.preventDefault());
    self.on('+scale', (scale: any) => {
        if (self.element) {
            const s = 0.2 * (scale - 1);
            ws.move({
                position: {
                    x: ws.transform.position.x - (ws.transform.position.x + self.element.clientWidth / 2) * s,
                    y: ws.transform.position.y - (ws.transform.position.y + self.element.clientHeight / 2) * s,
                },
                scale: ws.transform.scale + s,
            });
        }
    });
    self.on('+translate', (delta: any) => {
        ws.move({
            position: {
                x: ws.transform.position.x - delta.x,
                y: ws.transform.position.y + delta.y
            }
        });
    });
    self.on('+rotate', (delta: any) => {
        // scene.rotation.x += delta.y * 0.01;
        // xthree.scene.rotation.z += delta.x * 0.01;
    });
    const user = xnew(UserEvent);

    user.on('-dragmove', ({ event, delta }: any) => {
        if (event.target == user.element) {
            if (event.buttons & 1 || !event.buttons) {
                xnew.emit('+rotate', { x: +delta.x, y: +delta.y });
            }
            if (event.buttons & 1) {
                xnew.emit('+translate', { x: -delta.x, y: +delta.y });
            }
        }
    });

    user.on('-wheel', ({ delta }: any ) => xnew.emit('+scale', 1 + 0.001 * delta.y));
}

function Grid(self: xnew.Unit) {
    const ws = xnew.context('workspace');
    const grid = xnew.nest({ style: { position: 'absolute', top: '0px', left: '0px', pointerEvents: 'none' } });
    const size = 100;
    const count = 10;

    // for (let i = -count; i <= count; i++) {
    //     const lineX = xnew.nest({ style: { position: 'absolute', width: '1px', height: `${size * count}px`, backgroundColor: '#ccc' } });
    //     lineX.style.left = `${i * size}px`;
    //     grid.append(lineX);

    //     const lineY = xnew.nest({ style: { position: 'absolute', width: `${size * count}px`, height: '1px', backgroundColor: '#ccc' } });
    //     lineY.style.top = `${i * size}px`;
    //     grid.append(lineY);
    // }

    return {
        update() {

        }
    }
  
}