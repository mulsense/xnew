import { xnew } from '../core/xnew';

export function ResizeEvent(self: any) {
    const observer = new ResizeObserver(xnew.scope((entries: any) => {
        for (const entry of entries) {
            xnew.emit('-resize');
            break;
        }
    }));

    if (self.element) {
        observer.observe(self.element);
    }
    self.on('finalize', () => {
        if (self.element) {
            observer.unobserve(self.element);
        }
    });
}

export function UserEvent(self: xnew.Unit) {
    const unit = xnew();
    unit.on('pointerdown', (event: any) => xnew.emit('-pointerdown', { event, position: getPosition(self.element, event) }));
    unit.on('pointermove', (event: any) => xnew.emit('-pointermove', { event, position: getPosition(self.element, event) }));
    unit.on('pointerup', (event: any) => xnew.emit('-pointerup', { event, position: getPosition(self.element, event) }));
    unit.on('wheel', (event: any) => xnew.emit('-wheel', { event, delta: { x: event.wheelDeltaX, y: event.wheelDeltaY } }));

    const drag = xnew(DragEvent);
    drag.on('-dragstart', (...args: any[]) => xnew.emit('-dragstart', ...args));
    drag.on('-dragmove', (...args: any[]) => xnew.emit('-dragmove', ...args));
    drag.on('-dragend', (...args: any[]) => xnew.emit('-dragend', ...args));
    drag.on('-dragcancel', (...args: any[]) => xnew.emit('-dragcancel', ...args));

    const gesture = xnew(GestureEvent);
    gesture.on('-gesturestart', (...args: any[]) => xnew.emit('-gesturestart', ...args));
    gesture.on('-gesturemove', (...args: any[]) => xnew.emit('-gesturemove', ...args));
    gesture.on('-gestureend', (...args: any[]) => xnew.emit('-gestureend', ...args));
    gesture.on('-gesturecancel', (...args: any[]) => xnew.emit('-gesturecancel', ...args));  
    
    const keyborad = xnew(Keyboard);
    keyborad.on('-keydown', (...args: any[]) => xnew.emit('-keydown', ...args));
    keyborad.on('-keyup', (...args: any[]) => xnew.emit('-keyup', ...args));
    keyborad.on('-arrowkeydown', (...args: any[]) => xnew.emit('-arrowkeydown', ...args));
    keyborad.on('-arrowkeyup', (...args: any[]) => xnew.emit('-arrowkeyup', ...args));
}

function DragEvent(self: xnew.Unit) {
    xnew().on('pointerdown', (event: any) => {
        const id = event.pointerId;
        const position = getPosition(self.element, event);
        let previous = position;

        xnew.window.on('pointermove', (event: any) => {
            if (event.pointerId === id) {
                const position = getPosition(self.element, event);
                const delta = { x: position.x - previous.x, y: position.y - previous.y };
                xnew.emit('-dragmove', { event, position, delta });
                previous = position;
            }
        });
        xnew.window.on('pointerup', (event: any) => {
            if (event.pointerId === id) {
                const position = getPosition(self.element, event);
                xnew.emit('-dragend', { event, position, });
                xnew.window.off();
            }
        });
        xnew.window.on('pointercancel', (event: any) => {
            if (event.pointerId === id) {
                const position = getPosition(self.element, event);
                xnew.emit('-dragcancel', { event, position, });
                xnew.window.off();
            }
        });
        xnew.emit('-dragstart', { event, position });
    });
}

function GestureEvent(self: xnew.Unit) {
    const drag = xnew(DragEvent);

    let isActive = false;
    const map = new Map();

    drag.on('-dragstart', ({ event, position }: any) => {
        map.set(event.pointerId, { ...position });

        isActive = map.size === 2 ? true : false;
        if (isActive === true) {
            xnew.emit('-gesturestart', {});
        }
    });

    drag.on('-dragmove', ({ event, position, delta }: any) => {
        if (isActive === true) {
            const a = map.get(event.pointerId);
            const b = getOthers(event.pointerId)[0];

            let scale = 0.0;
            {
                const v = { x: a.x - b.x, y: a.y - b.y };
                const s = v.x * v.x + v.y * v.y;
                scale = 1 + (s > 0.0 ? (v.x * delta.x + v.y * delta.y) / s : 0);
            }
            let rotate = 0.0;
            {
                const c = { x: a.x + delta.x, y: a.y + delta.y };
                const v1 = { x: a.x - b.x, y: a.y - b.y };
                const v2 = { x: c.x - b.x, y: c.y - b.y };
                const l1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
                const l2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

                if (l1 > 0.0 && l2 > 0.0) {
                    const angle = Math.acos((v1.x * v2.x + v1.y * v2.y) / (l1 * l2));
                    const sign = v1.x * v2.y - v1.y * v2.x;
                    rotate = sign > 0.0 ? +angle : -angle;
                }
            }

            xnew.emit('-gesturemove', { event, position, delta, scale });
        }
        map.set(event.pointerId, position);
    });

    drag.on('-dragend', ({ event }: any) => {
        if (isActive === true) {
            xnew.emit('-gesturemend', { event });
        }
        isActive = false;
        map.delete(event.pointerId);
    });

    drag.on('-dragcancel', ({ event }: any) => {
        if (isActive === true) {
            xnew.emit('-gesturecancel', { event });
        }
        isActive = false;
        map.delete(event.pointerId);
    });

    function getOthers(id: number) {
        const backup = map.get(id);
        map.delete(id);
        const others = [...map.values()];
        map.set(id, backup);
        return others;
    }
}

function Keyboard(self: xnew.Unit) {
    const state: any = {};

    xnew.window.on('keydown', (event: any) => {
        state[event.code] = 1;
        xnew.emit('-keydown', { event, code: event.code });
    });
    xnew.window.on('keyup', (event: any) => {
        state[event.code] = 0;
        xnew.emit('-keyup', { event, code: event.code });
    });
    xnew.window.on('keydown', (event: any) => {
        xnew.emit('-arrowkeydown', { event, code: event.code, vector: getVector() });
    });
    xnew.window.on('keyup', (event: any) => {
        xnew.emit('-arrowkeyup', { event, code: event.code, vector: getVector() });
    });

    function getVector() {
        return {
            x: (state['ArrowLeft'] ? -1 : 0) + (state['ArrowRight'] ? +1 : 0),
            y: (state['ArrowUp'] ? -1 : 0) + (state['ArrowDown'] ? +1 : 0)
        };
    }
}

function getPosition(element: any, event: any) {
    const rect = element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

