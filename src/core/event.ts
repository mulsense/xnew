//----------------------------------------------------------------------------------------------------
// Eventor — DOM event binding for Units (thin pass-through + special-event dictionary)
//
// By default a type is bound with a plain addEventListener and the listener receives `{ event }`;
// prefixes `window.` / `document.` only switch the bind target. On top of that, this file defines
// xnew-flavored special types via defineEvent(type, factory), so component authors get a unified
// payload per family instead of raw DOM events. Mouse / touch types are intentionally NOT defined —
// use pointer events (mouse* / touch* still work as plain `{ event }` bindings).
//
// Registration is deferred by one setTimeout tick so listeners attached during component init do
// not fire on the same tick that created them.
//
// - EventProps  : the bundle a factory receives (element / type / listener / options)
// - defineEvent : registers a custom event factory for one or more exact type strings
// - listen      : deferred addEventListener; returns a finalizer
// - Eventor     : keeps a (type, listener) → finalize map; add() consults the dictionary first,
//                 then falls back to the plain binding
//
// Payload per family:
// - change / input                                  : { event, value }   (checkbox → boolean, range/number → float)
// - click / pointerdown|move|up|over|out            : { event, position: { x, y } }
// - click.outside / pointerdown|move|up .outside    : { event, position } — fires when the target is outside the element
// - wheel                                           : { event, delta: { x, y } }
// - resize                                          : {}                 (ResizeObserver-backed)
// - dragstart / dragmove / dragend                  : { event, position, delta }
// - window.keydown / window.keyup                   : { event }          (key repeats filtered)
// - window.keydown|keyup .arrow / .wasd             : { event, vector: { x, y } }
//----------------------------------------------------------------------------------------------------

import { MapMap } from './map';

export interface EventProps {
    element: HTMLElement | SVGElement;
    type: string;
    listener: Function;
    options?: boolean | AddEventListenerOptions
}

/** Builds the binding for one custom event type. Returns a finalizer that detaches everything. */
export type EventFactory = (props: EventProps) => Function;

const factories = new Map<string, EventFactory>();

/** Registers a custom event factory for one or more exact type strings (last registration wins). */
export function defineEvent(types: string | string[], factory: EventFactory): void {
    (Array.isArray(types) ? types : [types]).forEach((type) => factories.set(type, factory));
}

export function listen(
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
        const factory = factories.get(type);

        let finalize: Function;
        if (factory !== undefined) {
            finalize = factory(props);
        } else if (type.startsWith('window.')) {
            finalize = listen(window, type.substring('window.'.length), (event: Event) => listener({ event }), options);
        } else if (type.startsWith('document.')) {
            finalize = listen(document, type.substring('document.'.length), (event: Event) => listener({ event }), options);
        } else {
            finalize = listen(element, type, (event: Event) => listener({ event }), options);
        }

        this.map.set(type, listener, finalize);
    }

    public remove(type: string, listener: Function): void {
        const finalize = this.map.get(type, listener);
        if (finalize) {
            finalize();
            this.map.delete(type, listener)
        }
    }
}

//----------------------------------------------------------------------------------------------------
// special-event dictionary
//----------------------------------------------------------------------------------------------------

function getPointerPosition(element: HTMLElement | SVGElement, event: { clientX: number, clientY: number }): { x: number, y: number } {
    const rect = element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

defineEvent(['change', 'input'], (props: EventProps) => {
    return listen(props.element, props.type, (event: any) => {
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
});

defineEvent(['click', 'pointerdown', 'pointermove', 'pointerup', 'pointerover', 'pointerout'], (props: EventProps) => {
    return listen(props.element, props.type, (event: any) => {
        props.listener({ event, position: getPointerPosition(props.element, event) });
    }, props.options);
});

defineEvent(['click.outside', 'pointerdown.outside', 'pointermove.outside', 'pointerup.outside'], (props: EventProps) => {
    return listen(document, props.type.split('.')[0], (event: any) => {
        if (props.element.contains(event.target) === false) {
            props.listener({ event, position: getPointerPosition(props.element, event) });
        }
    }, props.options);
});

defineEvent('wheel', (props: EventProps) => {
    return listen(props.element, props.type, (event: any) => {
        props.listener({ event, delta: { x: event.wheelDeltaX, y: event.wheelDeltaY } });
    }, props.options);
});

defineEvent('resize', (props: EventProps) => {
    const observer = new ResizeObserver(() => props.listener({}));
    observer.observe(props.element);
    return () => observer.unobserve(props.element);
});

defineEvent(['window.keydown', 'window.keyup'], (props: EventProps) => {
    const type = props.type.substring('window.'.length);
    return listen(window, type, (event: any) => {
        if (event.repeat) return;
        props.listener({ event });
    }, props.options);
});

defineEvent(['dragstart', 'dragmove', 'dragend'], (props: EventProps) => {
    let pointermove: Function | null = null;
    let pointerup: Function | null = null;
    let pointercancel: Function | null = null;

    const pointerdown = listen(props.element, 'pointerdown', (event: any) => {
        const id = event.pointerId;
        const position = getPointerPosition(props.element, event);
        let previous = position;

        pointermove = listen(window, 'pointermove', (event: any) => {
            if (event.pointerId === id) {
                const position = getPointerPosition(props.element, event);
                const delta = { x: position.x - previous.x, y: position.y - previous.y };
                if (props.type === 'dragmove') {
                    props.listener({ event, position, delta });
                }
                previous = position;
            }
        }, props.options);
        const finish = (event: any) => {
            if (event.pointerId === id) {
                const position = getPointerPosition(props.element, event);
                if (props.type === 'dragend') {
                    props.listener({ event, position, delta: { x: 0, y: 0 } });
                }
                remove();
            }
        };
        pointerup = listen(window, 'pointerup', finish, props.options);
        pointercancel = listen(window, 'pointercancel', finish, props.options);

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
});

// 4 キーの押下状態を keymap に保ち、対象キーの keydown / keyup で合成ベクトルを通知する。
function keyVectorEvent(variant: 'keydown' | 'keyup', codes: { left: string, right: string, up: string, down: string }): EventFactory {
    return (props: EventProps) => {
        const keymap: Record<string, number> = {};
        const targets = [codes.left, codes.right, codes.up, codes.down];
        const vector = () => ({
            x: (keymap[codes.left] ? -1 : 0) + (keymap[codes.right] ? +1 : 0),
            y: (keymap[codes.up] ? -1 : 0) + (keymap[codes.down] ? +1 : 0),
        });

        const keydown = listen(window, 'keydown', (event: any) => {
            if (event.repeat) return;
            keymap[event.code] = 1;
            if (variant === 'keydown' && targets.includes(event.code)) {
                props.listener({ event, vector: vector() });
            }
        }, props.options);
        const keyup = listen(window, 'keyup', (event: any) => {
            keymap[event.code] = 0;
            if (variant === 'keyup' && targets.includes(event.code)) {
                props.listener({ event, vector: vector() });
            }
        }, props.options);

        return () => {
            keydown();
            keyup();
        };
    };
}

const ARROW_CODES = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };
const WASD_CODES = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS' };

defineEvent('window.keydown.arrow', keyVectorEvent('keydown', ARROW_CODES));
defineEvent('window.keyup.arrow', keyVectorEvent('keyup', ARROW_CODES));
defineEvent('window.keydown.wasd', keyVectorEvent('keydown', WASD_CODES));
defineEvent('window.keyup.wasd', keyVectorEvent('keyup', WASD_CODES));
