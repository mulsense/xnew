//----------------------------------------------------------------------------------------------------
// dom — DOM との境界（要素判定 + イベントバインド）
//
// 何を DOM 要素とみなすか（SSR-safe な型ガード）と、Unit の DOM イベントバインドをここに集約する。
// イベントは既定では素の addEventListener で { event } を渡し（'window.' / 'document.' 接頭辞は
// バインド先の切替のみ）、特殊イベントは defineEvent(type, factory) の辞書で payload を正規化する。
// mouse / touch は意図的に未定義（pointer に一本化。素の { event } としては動く）。
// 登録は 1 tick 遅延し、コンポーネント初期化中に attach したリスナが同 tick で発火しない。
//
// - DomElement / isDomElement : xnew がホストできる要素型（HTML | SVG）とその型ガード
// - Eventor : (type, listener) → finalize の管理。辞書 → 素通しの順に解決
//   （defineEvent / listen / EventProps は内部実装）
//
// Payload: change|input:{event,value} / click|pointer*:{event,position} / *.outside: 要素の外で発火 /
// wheel:{event,delta} / resize:{} / drag*:{event,position,delta} /
// window.keydown|keyup:{event}(repeat 除去) / window.keydown|keyup.arrow|wasd:{event,vector} /
// (window|document).keydown|keyup.<key>(.repeat)?:{event}（名前付きキー絞り込み。既定 repeat 除去）
// キーボードを window/document にバインドするには 'window.' / 'document.' 接頭辞が必須。
// 接頭辞なしの 'keydown' 等は通常イベントとして unit 自身の要素にバインドされる。
//----------------------------------------------------------------------------------------------------

import { MapMap } from './map';

export type DomElement = HTMLElement | SVGElement;

export function isDomElement(value: unknown): value is DomElement {
    return (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) || (typeof SVGElement !== 'undefined' && value instanceof SVGElement);
}

//----------------------------------------------------------------------------------------------------
// eventor
//----------------------------------------------------------------------------------------------------

interface EventProps {
    element: DomElement;
    type: string;
    listener: Function;
    options?: boolean | AddEventListenerOptions
}

/** Builds the binding for one custom event type. Returns a finalizer that detaches everything. */
type EventFactory = (props: EventProps) => Function;

const factories = new Map<string, EventFactory>();

/** Registers a custom event factory for one or more exact type strings (last registration wins). */
function defineEvent(types: string | string[], factory: EventFactory): void {
    (Array.isArray(types) ? types : [types]).forEach((type) => factories.set(type, factory));
}

function listen(
    target: Window | Document | DomElement,
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

    public add(element: DomElement, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        const props: EventProps = { element, type, listener, options };
        const factory = factories.get(type) ?? keyboardFactory(type);

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

function getPointerPosition(element: DomElement, event: { clientX: number, clientY: number }): { x: number, y: number } {
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

// window へバインドする keydown/keyup（auto-repeat は除去）。'window.' 接頭辞が必須。
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

// vector 系は常に window で押下状態を集約する（'window.' 接頭辞が必須）。
defineEvent('window.keydown.arrow', keyVectorEvent('keydown', ARROW_CODES));
defineEvent('window.keyup.arrow', keyVectorEvent('keyup', ARROW_CODES));
defineEvent('window.keydown.wasd', keyVectorEvent('keydown', WASD_CODES));
defineEvent('window.keyup.wasd', keyVectorEvent('keyup', WASD_CODES));

//----------------------------------------------------------------------------------------------------
// named-key filter — (window|document).(keydown|keyup).<key>(.repeat)?
//
// 末尾のキー名で絞り込んだ keydown / keyup を { event } で通知する（event.code 判定を不要にする）。
// <key>: space / enter / escape(esc) / tab / up|down|left|right / a–z / 0–9。その他は code|key 名で照合。
// 既定で auto-repeat を除去（plain keydown と同じ）。`.repeat` を付けると押しっぱなしの連続発火も通す。
// 'window.' / 'document.' 接頭辞が必須（どこにバインドするかを明示する）。接頭辞なしは named-key として扱わない。
// 例: unit.on('window.keydown.space', ({ event }) => ...) / 'window.keydown.a.repeat' / 'document.keyup.escape'
//----------------------------------------------------------------------------------------------------

const KEY_ALIASES: Record<string, string> = {
    space: 'Space', enter: 'Enter', escape: 'Escape', esc: 'Escape', tab: 'Tab',
    up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
};

function matchKey(name: string, event: KeyboardEvent): boolean {
    if (KEY_ALIASES[name] !== undefined) return event.code === KEY_ALIASES[name];
    if (/^[a-z]$/.test(name)) return event.code === 'Key' + name.toUpperCase();
    if (/^[0-9]$/.test(name)) return event.code === 'Digit' + name;
    return event.code?.toLowerCase() === name || event.key?.toLowerCase() === name;
}

// 一致すれば EventFactory、しなければ undefined（呼び出し側が別解決）。.arrow / .wasd は先に
// 完全一致 factory が解決するためここには来ない。
function keyboardFactory(type: string): EventFactory | undefined {
    const matched = type.match(/^(window|document)\.(keydown|keyup)\.([A-Za-z0-9]+)(\.repeat)?$/);
    if (matched === null) return undefined;
    const [, scope, variant, rawKey, repeat] = matched;
    const key = rawKey.toLowerCase();
    const allowRepeat = repeat !== undefined;
    const target = scope === 'document' ? document : window; // 'window.' は window、'document.' は document（接頭辞必須）
    return (props: EventProps) => listen(target, variant, (event: any) => {
        if (allowRepeat === false && event.repeat) return;
        if (matchKey(key, event)) props.listener({ event });
    }, props.options);
}
