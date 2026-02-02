import { MapSet, MapMap } from './map';

//----------------------------------------------------------------------------------------------------
// event manager
//----------------------------------------------------------------------------------------------------

interface EventProps {
    element: HTMLElement | SVGElement;
    type: string;
    listener: Function;
    options?: boolean | AddEventListenerOptions
}

export class EventManager {
    private map = new MapMap<string, Function, Function>();

    public add(element: HTMLElement | SVGElement, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        const props: EventProps = { element, type, listener, options };
        let finalize: Function;

        if (props.type === 'resize') {
            finalize = this.resize(props);
        } else if (props.type === 'wheel') {
            finalize = this.wheel(props);
        } else if (props.type === 'click') {
            finalize = this.click(props);
        } else if (props.type === 'click.outside') {
            finalize = this.click_outside(props);
        } else if (['pointerdown', 'pointermove', 'pointerup', 'pointerover', 'pointerout'].includes(props.type)) {
            finalize = this.pointer(props);
        } else if (['pointerdown.outside', 'pointermove.outside', 'pointerup.outside'].includes(props.type)) {
            finalize = this.pointer_outside(props);
        } else if (['mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout'].includes(props.type)) {
            finalize = this.mouse(props);
        } else if (['touchstart', 'touchmove', 'touchend', 'touchcancel'].includes(props.type)) {
            finalize = this.touch(props);
        } else if (['dragstart', 'dragmove', 'dragend'].includes(props.type)) {
            finalize = this.drag(props);
        } else if (['gesturestart', 'gesturemove', 'gestureend'].includes(props.type)) {
            finalize = this.gesture(props);
        } else if (['keydown', 'keyup'].includes(props.type)) {
            finalize = this.key(props);
        } else if (['keydown.arrow', 'keyup.arrow'].includes(props.type)) {
            finalize = this.key_arrow(props);
        } else {
            finalize = this.basic(props);
        }
        this.map.set(props.type, props.listener, finalize);
    }

    public remove(type: string, listener: Function): void {
        const finalize = this.map.get(type, listener);
        if (finalize) {
            finalize();
            this.map.delete(type, listener)
        }
    }

    private basic(props: EventProps): Function {
        const execute = (event: Event) => {
            props.listener({ event, type: event.type });
        };
        props.element.addEventListener(props.type, execute, props.options);
        return () => {
            props.element.removeEventListener(props.type, execute);
        };
    }

    private resize(props: EventProps) {
        const observer = new ResizeObserver((entries: any) => {
            for (const entry of entries) {
                props.listener({ type: 'resize' }); break;
            }
        });
        observer.observe(props.element);
        return () => {
            observer.unobserve(props.element);
        };
    }

    private click(props: EventProps): Function {
        const execute = (event: any) => {
            props.listener({ event, type: props.type, position: pointer(props.element, event).position });
        };
        props.element.addEventListener(props.type, execute, props.options);
        return () => {
            props.element.removeEventListener(props.type, execute);
        };
    }

    private click_outside(props: EventProps): Function {
        const execute = (event: any) => {
            if (props.element.contains(event.target) === false) {
                props.listener({ event, type: props.type, position: pointer(props.element, event).position });
            }
        };
        document.addEventListener(props.type.split('.')[0], execute, props.options);
        return () => {
            document.removeEventListener(props.type.split('.')[0], execute);
        };
    }

    private pointer(props: EventProps): Function {
        const execute = (event: any) => {
            props.listener({ event, type: props.type, position: pointer(props.element, event).position });
        };
        props.element.addEventListener(props.type, execute, props.options);
        return () => {
            props.element.removeEventListener(props.type, execute);
        };
    }

    private mouse(props: EventProps): Function {
        const execute = (event: any) => {
            props.listener({ event, type: props.type, position: pointer(props.element, event).position });
        };
        props.element.addEventListener(props.type, execute, props.options);
        return () => {
            props.element.removeEventListener(props.type, execute);
        };
    }

    private touch(props: EventProps): Function {
        const execute = (event: any) => {
            props.listener({ event, type: props.type, position: pointer(props.element, event).position });
        };
        props.element.addEventListener(props.type, execute, props.options);
        return () => {
            props.element.removeEventListener(props.type, execute);
        };
    }

    private pointer_outside(props: EventProps): Function {
        const execute = (event: any) => {
            if (props.element.contains(event.target) === false) {
                props.listener({ event, type: props.type, position: pointer(props.element, event).position });
            }
        };
        document.addEventListener(props.type.split('.')[0], execute, props.options);
        return () => {
            document.removeEventListener(props.type.split('.')[0], execute);
        };
    }

    private wheel(props: EventProps): Function {
        const execute = (event: any) => {
            props.listener({ event, type: props.type, delta: { x: event.wheelDeltaX, y: event.wheelDeltaY } });
        };
        props.element.addEventListener(props.type, execute, props.options);
        return () => {
            props.element.removeEventListener(props.type, execute);
        };
    }

    private drag(props: EventProps): Function {
        let pointermove: any = null;
        let pointerup: any = null;
        let pointercancel: any = null;
        
        const pointerdown = (event: any) => {
            const id = event.pointerId;
            const position = pointer(props.element, event).position;
            let previous = position;
    
            pointermove = (event: any) => {
                if (event.pointerId === id) {
                    const position = pointer(props.element, event).position;
                    const delta = { x: position.x - previous.x, y: position.y - previous.y };
                    if (props.type === 'dragmove') {
                        props.listener({ event, type: props.type, position, delta });
                    }
                    previous = position;
                }
            };
            pointerup = (event: any) => {
                if (event.pointerId === id) {
                    const position = pointer(props.element, event).position;
                    if (props.type === 'dragend') {
                        props.listener({ event, type: props.type, position, delta: { x: 0, y: 0 } });
                    }
                    remove();
                }
            };
            pointercancel = (event: any) => {
                if (event.pointerId === id) {
                    const position = pointer(props.element, event).position;
                    if (props.type === 'dragend') {
                        props.listener({ event, type: props.type, position, delta: { x: 0, y: 0 } });
                    }
                    remove();
                }
            };
    
            window.addEventListener('pointermove', pointermove);
            window.addEventListener('pointerup', pointerup);
            window.addEventListener('pointercancel', pointercancel);
    
            if (props.type === 'dragstart') {
                props.listener({ event, type: props.type, position, delta: { x: 0, y: 0 } });
            }
        };

        function remove() {
            if (pointermove) window.removeEventListener('pointermove', pointermove);
            if (pointerup) window.removeEventListener('pointerup', pointerup);
            if (pointercancel) window.removeEventListener('pointercancel', pointercancel);
            pointermove = null;
            pointerup = null;
            pointercancel = null;
        }

        props.element.addEventListener('pointerdown', pointerdown, props.options);

        return () => {
            props.element.removeEventListener('pointerdown', pointerdown);
            remove();
        };
    }

    private gesture(props: EventProps): Function {
        let isActive = false;
        const map = new Map();

        const element = props.element;
        const options = props.options;

        const dragstart = ({ event, position }: any) => {
            map.set(event.pointerId, position);

            isActive = map.size === 2 ? true : false;
            if (isActive === true && props.type === 'gesturestart') {
                props.listener({ event, type: props.type });
            }
        };

        const dragmove = ({ event, position, delta }: any) => {
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
                if (props.type === 'gesturemove') {
                    props.listener({ event, type: props.type, scale });
                }
            }
            map.set(event.pointerId, position);
        };

        const dragend = ({ event }: any) => {
            map.delete(event.pointerId);
            if (isActive === true && props.type === 'gestureend') {
                props.listener({ event, type: props.type, scale: 1.0 });
            }
            isActive = false;
        };
        this.add(element, 'dragstart', dragstart, options);
        this.add(element, 'dragmove', dragmove, options);
        this.add(element, 'dragend', dragend, options);

        function getOthers(id: number) {
            const backup = map.get(id);
            map.delete(id);
            const others = [...map.values()];
            map.set(id, backup);
            return others;
        }

        return () => {
            this.remove('dragstart', dragstart);
            this.remove('dragmove', dragmove);
            this.remove('dragend', dragend);
        };
    }

    private key(props: EventProps) {
        const execute = (event: any) => {
            if (props.type === 'keydown' && event.repeat) return;
            props.listener({ event, type: props.type, code: event.code } );
        };
        window.addEventListener(props.type, execute, props.options);
        return () => {
            window.removeEventListener(props.type, execute);
        };
    }

    private key_arrow(props: EventProps) {
        const keymap: any = {};
        const keydown = (event: any) => {
            if (event.repeat) return;
            keymap[event.code] = 1;
            if (props.type === 'keydown.arrow' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
                const vector = {
                    x: (keymap['ArrowLeft'] ? -1 : 0) + (keymap['ArrowRight'] ? +1 : 0),
                    y: (keymap['ArrowUp'] ? -1 : 0) + (keymap['ArrowDown'] ? +1 : 0)
                };
                props.listener({ event, type: props.type, code: event.code, vector } );
            }
        };
        const keyup = (event: any) => {
            keymap[event.code] = 0;
            if (props.type === 'keyup.arrow' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
                const vector = {
                    x: (keymap['ArrowLeft'] ? -1 : 0) + (keymap['ArrowRight'] ? +1 : 0),
                    y: (keymap['ArrowUp'] ? -1 : 0) + (keymap['ArrowDown'] ? +1 : 0)
                };
                props.listener({ event, type: props.type, code: event.code, vector } );
            }
        };

        window.addEventListener('keydown', keydown, props.options);
        window.addEventListener('keyup', keyup, props.options);
        return () => {
            window.removeEventListener('keydown', keydown);
            window.removeEventListener('keyup', keyup);
        }
    }
}

function pointer(element: any, event: any) {
    const rect = element.getBoundingClientRect();
    const position = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    return { position };
}