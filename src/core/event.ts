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

function addEvent(
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

        if (props.type.indexOf('window.') === 0) {
            if (['window.keydown', 'window.keyup'].includes(props.type)) {
                finalize = this.window_key(props);
            } else if (['window.keydown.arrow', 'window.keyup.arrow'].includes(props.type)) {
                finalize = this.window_key_arrow(props);
            } else if (['window.keydown.wasd', 'window.keyup.wasd'].includes(props.type)) {
                finalize = this.window_key_wasd(props);
            } else {
                finalize = this.window_basic(props);
            }
        } else if (props.type.indexOf('document.') === 0) {
            {
                finalize = this.document_basic(props);
            }
        } else {
            if (props.type === 'resize') {
                finalize = this.element_resize(props);
            } else if (props.type === 'change') {
                finalize = this.element_change(props);
            } else if (props.type === 'input') {
                finalize = this.element_input(props);
            } else if (props.type === 'wheel') {
                finalize = this.element_wheel(props);
            } else if (props.type === 'click') {
                finalize = this.element_click(props);
            } else if (props.type === 'click.outside') {
                finalize = this.element_click_outside(props);
            } else if (['pointerdown', 'pointermove', 'pointerup', 'pointerover', 'pointerout'].includes(props.type)) {
                finalize = this.element_pointer(props);
            } else if (['pointerdown.outside', 'pointermove.outside', 'pointerup.outside'].includes(props.type)) {
                finalize = this.element_pointer_outside(props);
            } else if (['mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout'].includes(props.type)) {
                finalize = this.element_mouse(props);
            } else if (['touchstart', 'touchmove', 'touchend', 'touchcancel'].includes(props.type)) {
                finalize = this.element_touch(props);
            } else if (['dragstart', 'dragmove', 'dragend'].includes(props.type)) {
                finalize = this.element_drag(props);
            } else {
                finalize = this.element_basic(props);
            }
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

    private element_basic(props: EventProps): Function {
        return addEvent(props.element, props.type, (event: Event) => {
            props.listener({ event });
        }, props.options);
    }

    private element_resize(props: EventProps) {
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

    private element_change(props: EventProps): Function {
        return addEvent(props.element, props.type, (event: any) => {
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

    private element_input(props: EventProps): Function {
        return addEvent(props.element, props.type, (event: any) => {
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

    private element_click(props: EventProps): Function {
        return addEvent(props.element, props.type, (event: any) => {
            props.listener({ event, position: pointer(props.element, event).position });
        }, props.options);
    }

    private element_click_outside(props: EventProps): Function {
        return addEvent(document, props.type.split('.')[0], (event: any) => {
            if (props.element.contains(event.target) === false) {
                props.listener({ event, position: pointer(props.element, event).position });
            }
        }, props.options);
    }

    private element_pointer(props: EventProps): Function {
        return addEvent(props.element, props.type, (event: any) => {
            props.listener({ event, position: pointer(props.element, event).position });
        }, props.options);
    }

    private element_mouse(props: EventProps): Function {
        return addEvent(props.element, props.type, (event: any) => {
            props.listener({ event, position: pointer(props.element, event).position });
        }, props.options);
    }

    private element_touch(props: EventProps): Function {
        return addEvent(props.element, props.type, (event: any) => {
            props.listener({ event, position: pointer(props.element, event).position });
        }, props.options);
    }

    private element_pointer_outside(props: EventProps): Function {
        return addEvent(document, props.type.split('.')[0], (event: any) => {
            if (props.element.contains(event.target) === false) {
                props.listener({ event, position: pointer(props.element, event).position });
            }
        }, props.options);
    }

    private element_wheel(props: EventProps): Function {
        return addEvent(props.element, props.type, (event: any) => {
            props.listener({ event, delta: { x: event.wheelDeltaX, y: event.wheelDeltaY } });
        }, props.options);
    }

    private element_drag(props: EventProps): Function {
        let pointermove: any = null;
        let pointerup: any = null;
        let pointercancel: any = null;
        
        const pointerdown = addEvent(props.element, 'pointerdown', (event: any) => {
            const id = event.pointerId;
            const position = pointer(props.element, event).position;
            let previous = position;
    
            pointermove = addEvent(window, 'pointermove', (event: any) => {
                if (event.pointerId === id) {
                    const position = pointer(props.element, event).position;
                    const delta = { x: position.x - previous.x, y: position.y - previous.y };
                    if (props.type === 'dragmove') {
                        props.listener({ event, position, delta });
                    }
                    previous = position;
                }
            }, props.options);
            pointerup = addEvent(window, 'pointerup', (event: any) => {
                if (event.pointerId === id) {
                    const position = pointer(props.element, event).position;
                    if (props.type === 'dragend') {
                        props.listener({ event, position, delta: { x: 0, y: 0 } });
                    }
                    remove();
                }
            }, props.options);
            pointercancel = addEvent(window, 'pointercancel', (event: any) => {
                if (event.pointerId === id) {
                    const position = pointer(props.element, event).position;
                    if (props.type === 'dragend') {
                        props.listener({ event, position, delta: { x: 0, y: 0 } });
                    }
                    remove();
                }
            }, props.options);
    
            if (props.type === 'dragstart') {
                props.listener({ event, position, delta: { x: 0, y: 0 } });
            }
        }, props.options);

        function remove() {
            pointermove?.(); pointermove = null;
            pointerup?.(); pointerup = null;
            pointercancel?.(); pointercancel = null;
        }

        return () => {
            pointerdown();
            remove();
        };
    }

    private window_basic(props: EventProps): Function {
        const type = props.type.substring('window.'.length);
        return addEvent(window, type, (event: Event) => {
            props.listener({ event });
        }, props.options);
    }

    private window_key(props: EventProps) {
        const type = props.type.substring(props.type.indexOf('.') + 1);
        return addEvent(window, type, (event: any) => {
            if (event.repeat) return;
            props.listener({ event, code: event.code } );
        }, props.options);
    }

    private window_key_arrow(props: EventProps) {
        const keymap: any = {};

        const keydown = addEvent(window, 'keydown', (event: any) => {
            if (event.repeat) return;
            keymap[event.code] = 1;
            if (props.type === 'window.keydown.arrow' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
                const vector = {
                    x: (keymap['ArrowLeft'] ? -1 : 0) + (keymap['ArrowRight'] ? +1 : 0),
                    y: (keymap['ArrowUp'] ? -1 : 0) + (keymap['ArrowDown'] ? +1 : 0)
                };
                props.listener({ event, code: event.code, vector } );
            }
        }, props.options);
        const keyup = addEvent(window, 'keyup', (event: any) => {
            keymap[event.code] = 0;
            if (props.type === 'window.keyup.arrow' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
                const vector = {
                    x: (keymap['ArrowLeft'] ? -1 : 0) + (keymap['ArrowRight'] ? +1 : 0),
                    y: (keymap['ArrowUp'] ? -1 : 0) + (keymap['ArrowDown'] ? +1 : 0)
                };
                props.listener({ event, code: event.code, vector } );
            }
        }, props.options);
        return () => {
            keydown();
            keyup();
        }
    }

    private window_key_wasd(props: EventProps) {
        const keymap: any = {};

        const finalize1 = addEvent(window, 'keydown', (event: any) => {
            if (event.repeat) return;
            keymap[event.code] = 1;
            if (props.type === 'window.keydown.wasd' && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
                const vector = {
                    x: (keymap['KeyA'] ? -1 : 0) + (keymap['KeyD'] ? +1 : 0),
                    y: (keymap['KeyW'] ? -1 : 0) + (keymap['KeyS'] ? +1 : 0)
                };
                props.listener({ event, code: event.code, vector } );
            }
        }, props.options);

        const finalize2 = addEvent(window, 'keyup', (event: any) => {
            keymap[event.code] = 0;
            if (props.type === 'window.keyup.wasd' && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
                const vector = {
                    x: (keymap['KeyA'] ? -1 : 0) + (keymap['KeyD'] ? +1 : 0),
                    y: (keymap['KeyW'] ? -1 : 0) + (keymap['KeyS'] ? +1 : 0)
                };
                props.listener({ event, code: event.code, vector } );
            }
        }, props.options);

        return () => {
            finalize1();
            finalize2();
        };
    }

    private document_basic(props: EventProps): Function {
        const type = props.type.substring('document.'.length);
        return addEvent(document, type, (event: Event) => {
            props.listener({ event });
        }, props.options);
    }
}

function pointer(element: any, event: any) {
    const rect = element.getBoundingClientRect();
    const position = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    return { position };
}