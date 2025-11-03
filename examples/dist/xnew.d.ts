declare function ResizeEvent(resize: any): void;

declare class MapSet<Key, Value> extends Map<Key, Set<Value>> {
    has(key: Key): boolean;
    has(key: Key, value: Value): boolean;
    add(key: Key, value: Value): MapSet<Key, Value>;
    keys(): IterableIterator<Key>;
    keys(key: Key): IterableIterator<Value>;
    delete(key: Key): boolean;
    delete(key: Key, value: Value): boolean;
}
declare class MapMap<Key1, Key2, Value> extends Map<Key1, Map<Key2, Value>> {
    has(key1: Key1): boolean;
    has(key1: Key1, key2: Key2): boolean;
    set(key1: Key1, value: Map<Key2, Value>): this;
    set(key1: Key1, key2: Key2, value: Value): this;
    get(key1: Key1): Map<Key2, Value> | undefined;
    get(key1: Key1, key2: Key2): Value | undefined;
    keys(): IterableIterator<Key1>;
    keys(key1: Key1): IterableIterator<Key2>;
    delete(key1: Key1): boolean;
    delete(key1: Key1, key2: Key2): boolean;
}

type UnitElement = HTMLElement | SVGElement;
interface Context {
    stack: Context | null;
    key: string;
    value: any;
}
interface Capture {
    checker: (unit: Unit) => boolean;
    execute: (unit: Unit) => any;
}
interface UnitInternal {
    parent: Unit | null;
    children: Unit[];
    target: Object | null;
    props?: Object;
    baseElement: UnitElement;
    baseContext: Context | null;
    baseComponent: Function;
    currentElement: UnitElement;
    nextNest: {
        element: UnitElement;
        position: InsertPosition;
    };
    components: Set<Function>;
    listeners: MapMap<string, Function, [UnitElement, Function]>;
    sublisteners: MapMap<string, Function, [UnitElement | Window | Document, Function]>;
    captures: Capture[];
    state: string;
    tostart: boolean;
    defines: Record<string, any>;
    system: Record<string, Function[]>;
}
declare class Unit {
    [key: string]: any;
    _: UnitInternal;
    static roots: Unit[];
    constructor(target: Object | null, component?: Function | string, props?: Object);
    get element(): UnitElement;
    start(): void;
    stop(): void;
    finalize(): void;
    reboot(): void;
    static initialize(unit: Unit, nextNest: {
        element: UnitElement;
        position: InsertPosition;
    }): void;
    static finalize(unit: Unit): void;
    static nest(unit: Unit, tag: string): UnitElement | null;
    static extend(unit: Unit, component: Function, props?: Object): void;
    static start(unit: Unit, time: number): void;
    static stop(unit: Unit): void;
    static update(unit: Unit, time: number): void;
    static ticker(time: number): void;
    static reset(): void;
    static componentUnits: MapSet<Function, Unit>;
    get components(): Set<Function>;
    static find(component: Function): Unit[];
    static typeUnits: MapSet<string, Unit>;
    on(type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    off(type?: string, listener?: Function): void;
    emit(type: string, ...args: any[]): void;
    static subon(unit: any, target: UnitElement | Window | Document, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    static suboff(unit: any, target: UnitElement | Window | Document | null, type?: string, listener?: Function): void;
}

interface xnewtype$1 {
    (...args: any[]): Unit;
    [key: string]: any;
}
declare namespace xnew$1 {
    type Unit = InstanceType<typeof Unit>;
}
declare const xnew$1: xnewtype$1;

declare function UserEvent(self: xnew$1.Unit): void;

declare function Screen(screen: xnew$1.Unit, { width, height, fit }?: {
    width?: number | undefined;
    height?: number | undefined;
    fit?: string | undefined;
}): {
    readonly canvas: any;
    resize(width: number, height: number): void;
    readonly scale: {
        x: number;
        y: number;
    };
};

declare function InputFrame(frame: xnew$1.Unit, {}?: {}): void;

declare function ModalFrame(frame: xnew$1.Unit, {}?: {}): {
    close(): void;
};
declare function ModalContent(content: xnew$1.Unit, { duration, easing, background }?: {
    duration?: number;
    easing?: string;
    background?: string;
}): void;

declare function TabFrame(frame: xnew$1.Unit, { select }?: {
    select?: number | undefined;
}): void;
declare function TabButton(button: xnew$1.Unit, {}?: {}): {
    select(): void;
    deselect(): void;
};
declare function TabContent(self: xnew$1.Unit, {}?: {}): {
    select(): void;
    deselect(): void;
};

declare function AccordionFrame(frame: xnew$1.Unit, {}?: {}): {
    toggle(): void;
    open(): void;
    close(): void;
};
declare function AccordionHeader(header: xnew$1.Unit, {}?: {}): void;
declare function AccordionBullet(bullet: xnew$1.Unit, { type }?: {
    type?: string;
}): {
    transition(status: number): void;
} | undefined;
declare function AccordionContent(content: xnew$1.Unit, { open, duration, easing }?: {
    open?: boolean;
    duration?: number;
    easing?: string;
}): {
    readonly status: number;
    transition(status: number): void;
};

declare function DragFrame(frame: xnew$1.Unit, { x, y }?: {
    x?: number;
    y?: number;
}): void;
declare function DragTarget(target: xnew$1.Unit, {}?: {}): void;

declare function TouchStick(self: xnew$1.Unit, { size, fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin }?: {
    size?: number | undefined;
    fill?: string | undefined;
    fillOpacity?: number | undefined;
    stroke?: string | undefined;
    strokeOpacity?: number | undefined;
    strokeWidth?: number | undefined;
    strokeLinejoin?: string | undefined;
}): void;
declare function TouchDPad(self: xnew$1.Unit, { size, fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin }?: {
    size?: number | undefined;
    fill?: string | undefined;
    fillOpacity?: number | undefined;
    stroke?: string | undefined;
    strokeOpacity?: number | undefined;
    strokeWidth?: number | undefined;
    strokeLinejoin?: string | undefined;
}): void;
declare function TouchButton(self: xnew$1.Unit, { size, fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin }?: {
    size?: number | undefined;
    fill?: string | undefined;
    fillOpacity?: number | undefined;
    stroke?: string | undefined;
    strokeOpacity?: number | undefined;
    strokeWidth?: number | undefined;
    strokeLinejoin?: string | undefined;
}): void;

type Envelope = {
    amount: number;
    ADSR: [number, number, number, number];
};
type LFO = {
    amount: number;
    type: OscillatorType;
    rate: number;
};
type OscillatorOptions = {
    type?: OscillatorType;
    envelope?: Envelope | null;
    LFO?: LFO | null;
};
type FilterOptions = {
    type?: BiquadFilterType;
    Q?: number;
    cutoff?: number;
    envelope?: Envelope | null;
    LFO?: LFO | null;
};
type AmpOptions = {
    envelope?: Envelope | null;
    LFO?: LFO | null;
};
type ReverbOptions = {
    time?: number;
    mix?: number;
};
type DelayOptions = {
    time?: number;
    feedback?: number;
    mix?: number;
};
type SynthProps = {
    oscillator?: OscillatorOptions | null;
    filter?: FilterOptions | null;
    amp?: AmpOptions | null;
};
type SynthEffects = {
    bmp?: number | null;
    reverb?: ReverbOptions | null;
    delay?: DelayOptions | null;
};
declare function synthesizer(props?: SynthProps, effects?: SynthEffects): Synthesizer;
declare class Synthesizer {
    oscillator: OscillatorOptions;
    filter: FilterOptions;
    amp: AmpOptions;
    bmp: number;
    reverb: ReverbOptions;
    delay: DelayOptions;
    options: {
        bmp: number;
    };
    static initialize(): void;
    constructor({ oscillator, filter, amp }?: SynthProps, { bmp, reverb, delay }?: SynthEffects);
    static keymap: {
        [key: string]: number;
    };
    static notemap: {
        [key: string]: number;
    };
    press(frequency: number | string, duration?: number | string | null, wait?: number): {
        release: () => void;
    };
}

declare const basics: {
    Screen: typeof Screen;
    UserEvent: typeof UserEvent;
    ResizeEvent: typeof ResizeEvent;
    ModalFrame: typeof ModalFrame;
    ModalContent: typeof ModalContent;
    AccordionFrame: typeof AccordionFrame;
    AccordionHeader: typeof AccordionHeader;
    AccordionBullet: typeof AccordionBullet;
    AccordionContent: typeof AccordionContent;
    TabFrame: typeof TabFrame;
    TabButton: typeof TabButton;
    TabContent: typeof TabContent;
    InputFrame: typeof InputFrame;
    DragFrame: typeof DragFrame;
    DragTarget: typeof DragTarget;
    TouchStick: typeof TouchStick;
    TouchDPad: typeof TouchDPad;
    TouchButton: typeof TouchButton;
};
declare const audio: {
    synthesizer: typeof synthesizer;
};
interface xnewtype extends xnewtype$1 {
    basics: typeof basics;
    audio: typeof audio;
}
declare namespace xnew {
    type Unit = InstanceType<typeof Unit>;
}
declare const xnew: xnewtype;

export { xnew as default };
