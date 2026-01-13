import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function ResizeEvent(resize: Unit) {
    const observer = new ResizeObserver(xnew.scope((entries: any) => {
        for (const entry of entries) {
            xnew.emit('-resize');
            break;
        }
    }));

    if (resize.element) {
        observer.observe(resize.element);
    }
    resize.on('finalize', () => {
        if (resize.element) {
            observer.unobserve(resize.element);
        }
    });
}

export function DirectEvent(unit: Unit) {
    const state: any = {};

    const keydown = xnew.scope((event: any) => {
        state[event.code] = 1;
        xnew.emit('-keydown', { event, type: '-keydown', code: event.code });
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
            xnew.emit('-keydown.arrow', { event, type: '-keydown.arrow', code: event.code, vector: getVector() });
        }
    });

    const keyup = xnew.scope((event: any) => {
        state[event.code] = 0;
        xnew.emit('-keyup', { event, type: '-keyup', code: event.code });
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
            xnew.emit('-keyup.arrow', { event, type: '-keyup.arrow', code: event.code, vector: getVector() });
        }
    });

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    unit.on('finalize', () => {
        window.removeEventListener('keydown', keydown);
        window.removeEventListener('keyup', keyup);
    });

    function getVector() {
        return {
            x: (state['ArrowLeft'] ? -1 : 0) + (state['ArrowRight'] ? +1 : 0),
            y: (state['ArrowUp'] ? -1 : 0) + (state['ArrowDown'] ? +1 : 0)
        };
    }

    const internal = xnew();
    internal.on('pointerdown', (event: any) => xnew.emit('-pointerdown', { event, position: getPosition(unit.element, event) }));
    internal.on('pointermove', (event: any) => xnew.emit('-pointermove', { event, position: getPosition(unit.element, event) }));
    internal.on('pointerup', (event: any) => xnew.emit('-pointerup', { event, position: getPosition(unit.element, event) }));
    internal.on('wheel', (event: any) => xnew.emit('-wheel', { event, delta: { x: event.wheelDeltaX, y: event.wheelDeltaY } }));
    internal.on('click', (event: any) => xnew.emit('-click', { event, position: getPosition(unit.element, event) }));

    internal.on('pointerover', (event: any) => xnew.emit('-pointerover', { event, position: getPosition(unit.element, event) }));
    internal.on('pointerout', (event: any) => xnew.emit('-pointerout', { event, position: getPosition(unit.element, event) }));

    const pointerdownoutside = xnew.scope((event: any) => {
        if (unit.element.contains(event.target) === false) {
            xnew.emit('-pointerdown.outside', { event, position: getPosition(unit.element, event) });
        }
    });
    const pointerupoutside = xnew.scope((event: any) => {
        if (unit.element.contains(event.target) === false) {
            xnew.emit('-pointerup.outside', { event, position: getPosition(unit.element, event) });
        }
    });
    const clickoutside = xnew.scope((event: any) => {
        if (unit.element.contains(event.target) === false) {
            xnew.emit('-click.outside', { event, position: getPosition(unit.element, event) });
        }
    });
    document.addEventListener('pointerdown', pointerdownoutside);
    document.addEventListener('pointerup', pointerupoutside);
    document.addEventListener('click', clickoutside);
    unit.on('finalize', () => {
        document.removeEventListener('pointerdown', pointerdownoutside);
        document.removeEventListener('pointerup', pointerupoutside);
        document.removeEventListener('click', clickoutside);
    });
    
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
}

export function KeyboardEvent(keyboard: Unit) {
    const state: any = {};

    const keydown = xnew.scope((event: any) => {
        state[event.code] = 1;
        xnew.emit('-keydown', { event, type: '-keydown', code: event.code });
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
            xnew.emit('-keydown.arrow', { event, type: '-keydown.arrow', code: event.code, vector: getVector() });
        }
    });

    const keyup = xnew.scope((event: any) => {
        state[event.code] = 0;
        xnew.emit('-keyup', { event, type: '-keyup', code: event.code });
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
            xnew.emit('-keyup.arrow', { event, type: '-keyup.arrow', code: event.code, vector: getVector() });
        }
    });

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    keyboard.on('finalize', () => {
        window.removeEventListener('keydown', keydown);
        window.removeEventListener('keyup', keyup);
    });

    function getVector() {
        return {
            x: (state['ArrowLeft'] ? -1 : 0) + (state['ArrowRight'] ? +1 : 0),
            y: (state['ArrowUp'] ? -1 : 0) + (state['ArrowDown'] ? +1 : 0)
        };
    }
}

export function PointerEvent(unit: Unit) {
    const internal = xnew();
    internal.on('pointerdown', (event: any) => xnew.emit('-pointerdown', { event, position: getPosition(unit.element, event) }));
    internal.on('pointermove', (event: any) => xnew.emit('-pointermove', { event, position: getPosition(unit.element, event) }));
    internal.on('pointerup', (event: any) => xnew.emit('-pointerup', { event, position: getPosition(unit.element, event) }));
    internal.on('wheel', (event: any) => xnew.emit('-wheel', { event, delta: { x: event.wheelDeltaX, y: event.wheelDeltaY } }));
    internal.on('click', (event: any) => xnew.emit('-click', { event, position: getPosition(unit.element, event) }));

    internal.on('pointerover', (event: any) => xnew.emit('-pointerover', { event, position: getPosition(unit.element, event) }));
    internal.on('pointerout', (event: any) => xnew.emit('-pointerout', { event, position: getPosition(unit.element, event) }));

    const pointerdownoutside = xnew.scope((event: any) => {
        if (unit.element.contains(event.target) === false) {
            xnew.emit('-pointerdown.outside', { event, position: getPosition(unit.element, event) });
        }
    });
    const pointerupoutside = xnew.scope((event: any) => {
        if (unit.element.contains(event.target) === false) {
            xnew.emit('-pointerup.outside', { event, position: getPosition(unit.element, event) });
        }
    });
    const clickoutside = xnew.scope((event: any) => {
        if (unit.element.contains(event.target) === false) {
            xnew.emit('-click.outside', { event, position: getPosition(unit.element, event) });
        }
    });
    document.addEventListener('pointerdown', pointerdownoutside);
    document.addEventListener('pointerup', pointerupoutside);
    document.addEventListener('click', clickoutside);
    unit.on('finalize', () => {
        document.removeEventListener('pointerdown', pointerdownoutside);
        document.removeEventListener('pointerup', pointerupoutside);
        document.removeEventListener('click', clickoutside);
    });
    
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
}

function DragEvent(unit: Unit) {
    
    const pointerdown = xnew.scope((event: any) => {
        const id = event.pointerId;
        const position = getPosition(unit.element, event);
        let previous = position;

        let connect = true;

        const pointermove = xnew.scope((event: any) => {
            if (event.pointerId === id) {
                const position = getPosition(unit.element, event);
                const delta = { x: position.x - previous.x, y: position.y - previous.y };
                xnew.emit('-dragmove', { event, position, delta });
                previous = position;
            }
        });
        const pointerup = xnew.scope((event: any) => {
            if (event.pointerId === id) {
                const position = getPosition(unit.element, event);
                xnew.emit('-dragend', { event, position, });
                remove();
            }
        });
        const pointercancel = xnew.scope((event: any) => {
            if (event.pointerId === id) {
                const position = getPosition(unit.element, event);
                xnew.emit('-dragcancel', { event, position, });
                remove();
            }
        });

        window.addEventListener('pointermove', pointermove);
        window.addEventListener('pointerup', pointerup);
        window.addEventListener('pointercancel', pointercancel);

        function remove() {
            if (connect === true) {
                window.removeEventListener('pointermove', pointermove);
                window.removeEventListener('pointerup', pointerup);
                window.removeEventListener('pointercancel', pointercancel);
                connect = false;
            }
        }
        xnew((unit: Unit) => unit.on('-finalize', remove));
        xnew.emit('-dragstart', { event, position });
    });

    unit.on('pointerdown', pointerdown);
}

function GestureEvent(unit: Unit) {
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

            xnew.emit('-gesturemove', { event, position, delta, scale });
        }
        map.set(event.pointerId, position);
    });

    drag.on('-dragend', ({ event }: any) => {
        if (isActive === true) {
            xnew.emit('-gestureend', {});
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

function getPosition(element: any, event: any) {
    const rect = element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
