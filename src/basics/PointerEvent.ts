import { xnew } from '../core/xnew';

export function PointerEvent(unit: xnew.Unit) {
    const internal = xnew();
    internal.on('pointerdown', (event: any) => unit.emit('-pointerdown', { event, position: getPosition(unit.element, event) }));
    internal.on('pointermove', (event: any) => unit.emit('-pointermove', { event, position: getPosition(unit.element, event) }));
    internal.on('pointerup', (event: any) => unit.emit('-pointerup', { event, position: getPosition(unit.element, event) }));
    internal.on('wheel', (event: any) => unit.emit('-wheel', { event, delta: { x: event.wheelDeltaX, y: event.wheelDeltaY } }));

    internal.on('mouseover', (event: any) => unit.emit('-mouseover', { event, position: getPosition(unit.element, event) }));
    internal.on('mouseout', (event: any) => unit.emit('-mouseout', { event, position: getPosition(unit.element, event) }));
   
    const drag = xnew(DragEvent);
    drag.on('-dragstart', (...args: any[]) => unit.emit('-dragstart', ...args));
    drag.on('-dragmove', (...args: any[]) => unit.emit('-dragmove', ...args));
    drag.on('-dragend', (...args: any[]) => unit.emit('-dragend', ...args));
    drag.on('-dragcancel', (...args: any[]) => unit.emit('-dragcancel', ...args));

    const gesture = xnew(GestureEvent);
    gesture.on('-gesturestart', (...args: any[]) => unit.emit('-gesturestart', ...args));
    gesture.on('-gesturemove', (...args: any[]) => unit.emit('-gesturemove', ...args));
    gesture.on('-gestureend', (...args: any[]) => unit.emit('-gestureend', ...args));
    gesture.on('-gesturecancel', (...args: any[]) => unit.emit('-gesturecancel', ...args));  
}

function DragEvent(unit: xnew.Unit) {
    xnew().on('pointerdown', (event: any) => {

        const id = event.pointerId;
        const position = getPosition(unit.element, event);
        let previous = position;
        xnew(() => {
            xnew.listener(window).on('pointermove', (event: any) => {
                if (event.pointerId === id) {
                    const position = getPosition(unit.element, event);
                    const delta = { x: position.x - previous.x, y: position.y - previous.y };
                    unit.emit('-dragmove', { event, position, delta });
                    previous = position;
                }
            });
            xnew.listener(window).on('pointerup', (event: any) => {
                if (event.pointerId === id) {
                    const position = getPosition(unit.element, event);
                    unit.emit('-dragend', { event, position, });
                    xnew.listener(window).off();
                }
            });
            xnew.listener(window).on('pointercancel', (event: any) => {
                if (event.pointerId === id) {
                    const position = getPosition(unit.element, event);
                    unit.emit('-dragcancel', { event, position, });
                    xnew.listener(window).off();
                }
            });
        });
        unit.emit('-dragstart', { event, position });
    });
}

function GestureEvent(unit: xnew.Unit) {
    const drag = xnew(DragEvent);

    let isActive = false;
    const map = new Map();

    drag.on('-dragstart', ({ event, position }: any) => {
        map.set(event.pointerId, { ...position });

        isActive = map.size === 2 ? true : false;
        if (isActive === true) {
            unit.emit('-gesturestart', {});
        }
    });

    drag.on('-dragmove', ({ event, position, delta }: any) => {
        if (map.size >= 2 && isActive === true) {
            const a = map.get(event.pointerId);
            const b = getOthers(event.pointerId)[0];

            let scale = 0.0;
            {
                const v = { x: a.x - b.x, y: a.y - b.y };
                const s = v.x * v.x + v.y * v.y;
                scale = 1 + (s > 0.0 ? (v.x * delta.x + v.y * delta.y) / s : 0);
            }
            // let rotate = 0.0;
            // {
            //     const c = { x: a.x + delta.x, y: a.y + delta.y };
            //     const v1 = { x: a.x - b.x, y: a.y - b.y };
            //     const v2 = { x: c.x - b.x, y: c.y - b.y };
            //     const l1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
            //     const l2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

            //     if (l1 > 0.0 && l2 > 0.0) {
            //         const angle = Math.acos((v1.x * v2.x + v1.y * v2.y) / (l1 * l2));
            //         const sign = v1.x * v2.y - v1.y * v2.x;
            //         rotate = sign > 0.0 ? +angle : -angle;
            //     }
            // }

            unit.emit('-gesturemove', { event, position, delta, scale });
        }
        map.set(event.pointerId, position);
    });

    drag.on('-dragend', ({ event }: any) => {
        if (isActive === true) {
            unit.emit('-gestureend', {});
        }
        isActive = false;
        map.delete(event.pointerId);
    });

    drag.on('-dragcancel', ({ event }: any) => {
        if (isActive === true) {
            unit.emit('-gesturecancel', { event });
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

function getPosition(element: any, event: any) {
    const rect = element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

