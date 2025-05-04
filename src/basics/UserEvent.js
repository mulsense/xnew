import { xnew } from '../core/xnew';

export function UserEvent(self) {
    const unit = xnew();
    unit.on('pointerdown', (event) => xnew.emit('-pointerdown', { event, position: getPosition(self.element, event) }));
    unit.on('pointermove', (event) => xnew.emit('-pointermove', { event, position: getPosition(self.element, event) }));
    unit.on('pointerup', (event) => xnew.emit('-pointerup', { event, position: getPosition(self.element, event) }));
    unit.on('wheel', (event) => xnew.emit('-wheel', { event, delta: { x: event.wheelDeltaX, y: event.wheelDeltaY } }));

    const drag = xnew(DragEvent);
    drag.on('-dragstart', (...args) => xnew.emit('-dragstart', ...args));
    drag.on('-dragmove', (...args) => xnew.emit('-dragmove', ...args));
    drag.on('-dragend', (...args) => xnew.emit('-dragend', ...args));
    drag.on('-dragcancel', (...args) => xnew.emit('-dragcancel', ...args));

    const keyborad = xnew(Keyboard);
    keyborad.on('-keydown', (...args) => xnew.emit('-keydown', ...args));
    keyborad.on('-keyup', (...args) => xnew.emit('-keyup', ...args));
    keyborad.on('-arrowkeydown', (...args) => xnew.emit('-arrowkeydown', ...args));
    keyborad.on('-arrowkeyup', (...args) => xnew.emit('-arrowkeyup', ...args));

    const gesture = xnew(GestureEvent);
    gesture.on('-gesturestart', (...args) => xnew.emit('-gesturestart', ...args));
    gesture.on('-gesturemove', (...args) => xnew.emit('-gesturemove', ...args));
    gesture.on('-gestureend', (...args) => xnew.emit('-gestureend', ...args));
    gesture.on('-gesturecancel', (...args) => xnew.emit('-gesturecancel', ...args));  
}

function DragEvent(self) {
    xnew().on('pointerdown', (event) => {
        const id = event.pointerId;
        const position = getPosition(self.element, event);
        let previous = position;

        const win = xnew(window);
        win.on('pointermove', (event) => {
            if (event.pointerId === id) {
                const position = getPosition(self.element, event);
                const movement = { x: position.x - previous.x, y: position.y - previous.y };
                xnew.emit('-dragmove', { event, position, movement });
                previous = position;
            }
        });
        win.on('pointerup', (event) => {
            if (event.pointerId === id) {
                const position = getPosition(self.element, event);
                xnew.emit('-dragend', { event, position, });
                win.finalize();
            }
        });
        win.on('pointercancel', (event) => {
            if (event.pointerId === id) {
                const position = getPosition(self.element, event);
                xnew.emit('-dragcancel', { event, position, });
                win.finalize();
            }
        });
        xnew.emit('-dragstart', { event, position });
    });
}

function GestureEvent(self) {
    const drag = xnew(DragEvent);

    let isActive = false;
    const map = new Map();

    drag.on('-dragstart', ({ event, position }) => {
        map.set(event.pointerId, { ...position });

        isActive = map.size === 2 ? true : false;
        if (isActive === true) {
            xnew.emit('-gesturestart', {});
        }
    });

    drag.on('-dragmove', ({ event, position, movement }) => {
        if (isActive === true) {
            const a = map.get(event.pointerId);
            const b = getOthers(event.pointerId)[0];

            let scale = 0.0;
            {
                const v = { x: a.x - b.x, y: a.y - b.y };
                const s = v.x * v.x + v.y * v.y;
                scale = 1 + (s > 0.0 ? (v.x * movement.x + v.y * movement.y) / s : 0);
            }
            let rotate = 0.0;
            {
                const c = { x: a.x + movement.x, y: a.y + movement.y };
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

            xnew.emit('-gesturemove', { scale });
        }
        map.set(event.pointerId, position);
    });

    drag.on('-dragend', ({ event }) => {
        if (isActive === true) {
            xnew.emit('-gesturemend', {});
        }
        isActive = false;
        map.delete(event.pointerId);
    });

    drag.on('-dragcancel', ({ event }) => {
        if (isActive === true) {
            xnew.emit('-gesturecancel', {});
        }
        isActive = false;
        map.delete(event.pointerId);
    });

    function getOthers(id) {
        const backup = map.get(id);
        map.delete(id);
        const others = [...map.values()];
        map.set(id, backup);
        return others;
    }
}

function Keyboard(self) {
    const state = {};

    const win = xnew(window);
    win.on('keydown', (event) => {
        if (event.repeat === true) return;
        state[event.code] = 1;
        xnew.emit('-keydown', { code: event.code });
    });

    win.on('keyup', (event) => {
        if (state[event.code]) state[event.code] = 0;
        xnew.emit('-keyup', { code: event.code });
    });

    win.on('keydown', (event) => {
        if (event.repeat === true) return;
        xnew.emit('-arrowkeydown', { code: event.code, vector: getVector() });
    });

    win.on('keyup', (event) => {
        if (event.repeat === true) return;
        xnew.emit('-arrowkeyup', { code: event.code, vector: getVector() });
    });

    function getVector() {
        return {
            x: (state['ArrowLeft'] ? -1 : 0) + (state['ArrowRight'] ? +1 : 0),
            y: (state['ArrowUp'] ? -1 : 0) + (state['ArrowDown'] ? +1 : 0)
        };
    }
}

function getPosition(element, event) {
    const rect = element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
