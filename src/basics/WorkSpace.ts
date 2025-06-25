import { xnew } from '../core/xnew';
import { UserEvent } from './UserEvent';

interface Transform {
    position: { x: number | null, y: number | null } | null | undefined;
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

    const base = xnew.nest({});
    return {
        get transform(): Transform {
            return current;
        },
        set(transform: Transform) {
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
            ws.set({
                position: {
                    x: ws.transform.position.x + (ws.transform.position.x) * s,
                    y: ws.transform.position.y + (ws.transform.position.y - self.element.clientHeight / 2) * s,
                },
                scale: ws.transform.scale + s,
            });
        }
    });
    self.on('+translate', (movement: any) => {
        ws.set({
            position: {
                x: ws.transform.position.x - movement.x,
                y: ws.transform.position.y + movement.y
            }
        });
    });
    self.on('+rotate', (movement: any) => {
        // scene.rotation.x += movement.y * 0.01;
        // xthree.scene.rotation.z += movement.x * 0.01;
    });
    const user = xnew(xnew.UserEvent);

    user.on('-dragmove', ({ event, movement }: any) => {
        if (event.target == user.element) {
            if (event.buttons & 1 || !event.buttons) {
                xnew.emit('+rotate', { x: +movement.x, y: +movement.y });
            }
            if (event.buttons & 1) {
                xnew.emit('+translate', { x: -movement.x, y: +movement.y });
            }
        }
    });

    user.on('-wheel', ({ delta }: any ) => xnew.emit('+scale', 1 + 0.001 * delta.y));
}