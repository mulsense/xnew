import { create } from 'domain';
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

function createBasicEvent(
    target: Window | Document | HTMLElement | SVGElement, 
    type: string, 
    execute: EventListenerOrEventListenerObject, 
    options?: boolean | AddEventListenerOptions
): Function {
    let initalized = false;
    const id = setTimeout(() => {
        initalized = true;
        target.addEventListener(type, execute, options);
    }, 0);

    return () => {
        if (initalized === false) {
            clearTimeout(id);
        } else {
            target.removeEventListener(type, execute);
        }
    };
}

export class Eventor {
    private map = new MapMap<string, Function, Function>();

    public add(element: HTMLElement | SVGElement, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        const props: EventProps = { element, type, listener, options };
        let finalize: Function;

        if (props.type === 'resize') {
            finalize = this.resize(props);
        } else if (props.type === 'change') {
            finalize = this.change(props);
        } else if (props.type === 'input') {
            finalize = this.input(props);
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
        } else if (['keydown', 'keyup'].includes(props.type)) {
            finalize = this.key(props);
        } else if (['keydown.arrow', 'keyup.arrow'].includes(props.type)) {
            finalize = this.key_arrow(props);
        } else if (['keydown.wasd', 'keyup.wasd'].includes(props.type)) {
            finalize = this.key_wasd(props);
        } else {
            finalize = createBasicEvent(props.element, props.type, (event: Event) => props.listener({ event }), props.options);
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

    private resize(props: EventProps) {
        const observer = new ResizeObserver((entries: any) => {
            for (const entry of entries) {
                props.listener({}); break;
            }
        });
        observer.observe(props.element);
        return () => {
            observer.unobserve(props.element);
        };
    }

    private change(props: EventProps): Function {
        return createBasicEvent(props.element, props.type, (event: any) => {
            let value: any = null;
            if (event.target.type === 'checkbox') {
                value = event.target.checked;
            } else if (event.target.type === 'range' || event.target.type === 'number') {
                value = parseFloat(event.target.value);
            } else {
                value = event.target.value;
            }
            props.listener({ event, value });
        }, props.options);
    }

    private input(props: EventProps): Function {
        return createBasicEvent(props.element, props.type, (event: any) => {
            let value: any = null;
            if (event.target.type === 'checkbox') {
                value = event.target.checked;
            } else if (event.target.type === 'range' || event.target.type === 'number') {
                value = parseFloat(event.target.value);
            } else {
                value = event.target.value;
            }
            props.listener({ event, value });
        }, props.options);
    }

    private click(props: EventProps): Function {
        return createBasicEvent(props.element, props.type, (event: any) => {
            props.listener({ event, position: pointer(props.element, event).position });
        }, props.options);
    }

    private click_outside(props: EventProps): Function {
        return createBasicEvent(document, props.type.split('.')[0], (event: any) => {
            if (props.element.contains(event.target) === false) {
                props.listener({ event, position: pointer(props.element, event).position });
            }
        }, props.options);
    }

    private pointer(props: EventProps): Function {
        return createBasicEvent(props.element, props.type, (event: any) => {
            props.listener({ event, position: pointer(props.element, event).position });
        }, props.options);
    }

    private mouse(props: EventProps): Function {
        return createBasicEvent(props.element, props.type, (event: any) => {
            props.listener({ event, position: pointer(props.element, event).position });
        }, props.options);
    }

    private touch(props: EventProps): Function {
        return createBasicEvent(props.element, props.type, (event: any) => {
            props.listener({ event, position: pointer(props.element, event).position });
        }, props.options);
    }

    private pointer_outside(props: EventProps): Function {
        return createBasicEvent(document, props.type.split('.')[0], (event: any) => {
            if (props.element.contains(event.target) === false) {
                props.listener({ event, position: pointer(props.element, event).position });
            }
        }, props.options);
    }

    private wheel(props: EventProps): Function {
        return createBasicEvent(props.element, props.type, (event: any) => {
            props.listener({ event, delta: { x: event.wheelDeltaX, y: event.wheelDeltaY } });
        }, props.options);
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
                        props.listener({ event, position, delta });
                    }
                    previous = position;
                }
            };
            pointerup = (event: any) => {
                if (event.pointerId === id) {
                    const position = pointer(props.element, event).position;
                    if (props.type === 'dragend') {
                        props.listener({ event, position, delta: { x: 0, y: 0 } });
                    }
                    remove();
                }
            };
            pointercancel = (event: any) => {
                if (event.pointerId === id) {
                    const position = pointer(props.element, event).position;
                    if (props.type === 'dragend') {
                        props.listener({ event, position, delta: { x: 0, y: 0 } });
                    }
                    remove();
                }
            };
    
            window.addEventListener('pointermove', pointermove);
            window.addEventListener('pointerup', pointerup);
            window.addEventListener('pointercancel', pointercancel);
    
            if (props.type === 'dragstart') {
                props.listener({ event, position, delta: { x: 0, y: 0 } });
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

    private key(props: EventProps) {
        const execute = (event: any) => {
            if (props.type === 'keydown' && event.repeat) return;
            props.listener({ event, code: event.code } );
        };
        return createBasicEvent(window, props.type, execute, props.options);
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
                props.listener({ event, code: event.code, vector } );
            }
        };
        const keyup = (event: any) => {
            keymap[event.code] = 0;
            if (props.type === 'keyup.arrow' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
                const vector = {
                    x: (keymap['ArrowLeft'] ? -1 : 0) + (keymap['ArrowRight'] ? +1 : 0),
                    y: (keymap['ArrowUp'] ? -1 : 0) + (keymap['ArrowDown'] ? +1 : 0)
                };
                props.listener({ event, code: event.code, vector } );
            }
        };

        window.addEventListener('keydown', keydown, props.options);
        window.addEventListener('keyup', keyup, props.options);
        return () => {
            window.removeEventListener('keydown', keydown);
            window.removeEventListener('keyup', keyup);
        }
    }

    private key_wasd(props: EventProps) {
        const keymap: any = {};
        const keydown = (event: any) => {
            if (event.repeat) return;
            keymap[event.code] = 1;
            if (props.type === 'keydown.wasd' && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
                const vector = {
                    x: (keymap['KeyA'] ? -1 : 0) + (keymap['KeyD'] ? +1 : 0),
                    y: (keymap['KeyW'] ? -1 : 0) + (keymap['KeyS'] ? +1 : 0)
                };
                props.listener({ event, code: event.code, vector } );
            }
        };
        const keyup = (event: any) => {
            keymap[event.code] = 0;
            if (props.type === 'keyup.wasd' && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
                const vector = {
                    x: (keymap['KeyA'] ? -1 : 0) + (keymap['KeyD'] ? +1 : 0),
                    y: (keymap['KeyW'] ? -1 : 0) + (keymap['KeyS'] ? +1 : 0)
                };
                props.listener({ event, code: event.code, vector } );
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