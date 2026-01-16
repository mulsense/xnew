import { MapSet, MapMap } from './map';
import { UnitElement } from './types';
import { xnew } from './xnew';

//----------------------------------------------------------------------------------------------------
// event manager
//----------------------------------------------------------------------------------------------------

interface EventProps {
    element: UnitElement;
    type: string;
    listener: Function;
    options?: boolean | AddEventListenerOptions
}

export class EventManager {
    private map = new MapMap<string, Function, Function>();

    public add(props: EventProps): void {
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
        } else if (['dragstart', 'dragmove', 'dragend'].includes(props.type)) {
            finalize = this.drag(props);
        } else if (['pointerdown.outside', 'pointermove.outside', 'pointerup.outside'].includes(props.type)) {
            finalize = this.pointer_outside(props);
        } else if (['keydown', 'keyup'].includes(props.type)) {
            finalize = this.key(props);
        } else if (['keydown.arrow', 'keyup.arrow'].includes(props.type)) {
            finalize = this.key_arrow(props);
        } else {
            finalize = this.basic(props);
        }
        this.map.set(props.type, props.listener, finalize);
    }

    public remove({ type, listener }: { type: string, listener: Function }): void {
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
        const observer = new ResizeObserver(xnew.scope((entries: any) => {
            for (const entry of entries) {
                props.listener({ type: 'resize' }); break;
            }
        }));
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

        document.addEventListener('pointerdown', pointerdown, props.options);

        return () => {
            document.removeEventListener('pointerdown', pointerdown);
            remove();
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