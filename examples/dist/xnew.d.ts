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

declare class Ticker {
    private id;
    constructor(callback: Function);
    clear(): void;
}

type UnitElement = HTMLElement | SVGElement;
interface Context {
    stack: Context | null;
    key?: string;
    value?: any;
}
interface Snapshot {
    unit: Unit;
    context: Context;
    element: UnitElement;
}
interface Capture {
    checker: (unit: Unit) => boolean;
    execute: (unit: Unit) => any;
}
interface UnitInternal {
    parent: Unit | null;
    target: Object | null;
    props?: Object;
    baseElement: UnitElement;
    baseContext: Context;
    baseComponent: Function;
    currentElement: UnitElement;
    currentContext: Context;
    anchor: UnitElement | null;
    state: string;
    tostart: boolean;
    children: Unit[];
    promises: Promise<any>[];
    captures: Capture[];
    elements: UnitElement[];
    components: Function[];
    listeners1: MapMap<string, Function, [UnitElement, Function]>;
    listeners2: MapMap<string, Function, [UnitElement | Window | Document, Function]>;
    defines: Record<string, any>;
    systems: Record<string, Function[]>;
}
declare class Unit {
    [key: string]: any;
    _: UnitInternal;
    constructor(parent: Unit | null, target: Object | null, component?: Function | string, props?: Object);
    get element(): UnitElement;
    get components(): Function[];
    start(): void;
    stop(): void;
    finalize(): void;
    reboot(): void;
    static initialize(unit: Unit, anchor: UnitElement | null): void;
    static finalize(unit: Unit): void;
    static nest(unit: Unit, tag: string): UnitElement;
    static extend(unit: Unit, component: Function, props?: Object): void;
    static start(unit: Unit): void;
    static stop(unit: Unit): void;
    static update(unit: Unit): void;
    static root: Unit;
    static current: Unit;
    static ticker: Ticker;
    static reset(): void;
    static wrap(unit: Unit, listener: Function): (...args: any[]) => any;
    static scope(snapshot: Snapshot, func: Function, ...args: any[]): any;
    static snapshot(unit: Unit): Snapshot;
    static context(unit: Unit, key: string, value?: any): any;
    static componentUnits: MapSet<Function, Unit>;
    static find(component: Function): Unit[];
    static typeUnits: MapSet<string, Unit>;
    on(type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    off(type?: string, listener?: Function): void;
    emit(type: string, ...args: any[]): void;
    static subon(unit: Unit, target: UnitElement | Window | Document, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    static suboff(unit: Unit, target: UnitElement | Window | Document | null, type?: string, listener?: Function): void;
}

declare namespace xnew$1 {
    type Unit = InstanceType<typeof Unit>;
}
declare const xnew$1: any;

declare function PointerEvent(unit: xnew$1.Unit): void;

declare function KeyboardEvent(unit: xnew$1.Unit): void;

declare function Screen(screen: xnew$1.Unit, { width, height, fit }?: {
    width?: number | undefined;
    height?: number | undefined;
    fit?: string | undefined;
}): {
    readonly canvas: any;
    resize(width: number, height: number): void;
};

declare function InputFrame(frame: xnew$1.Unit, {}?: {}): void;

declare function ModalFrame(frame: xnew$1.Unit, { duration, easing }?: {
    duration?: number;
    easing?: string;
}): {
    close(): void;
};
declare function ModalContent(content: xnew$1.Unit, { background }?: {
    background?: string;
}): {
    transition({ element, rate }: {
        element: HTMLElement;
        rate: number;
    }): void;
};

declare function TabFrame(frame: xnew$1.Unit, { select }?: {
    select?: string;
}): void;
declare function TabButton(button: xnew$1.Unit, { key }?: {
    key?: string;
}): {
    select({ element }: {
        element: HTMLElement;
    }): void;
    deselect({ element }: {
        element: HTMLElement;
    }): void;
};
declare function TabContent(content: xnew$1.Unit, { key }?: {
    key?: string;
}): {
    select({ element }: {
        element: HTMLElement;
    }): void;
    deselect({ element }: {
        element: HTMLElement;
    }): void;
};

declare function AccordionFrame(frame: xnew$1.Unit, { open, duration, easing }?: {
    open?: boolean;
    duration?: number;
    easing?: string;
}): {
    toggle(): void;
    open(): void;
    close(): void;
};
declare function AccordionHeader(header: xnew$1.Unit, {}?: {}): void;
declare function AccordionBullet(bullet: xnew$1.Unit, { type }?: {
    type?: string;
}): void;
declare function AccordionContent(content: xnew$1.Unit, {}?: {}): {
    transition({ element, rate }: {
        element: HTMLElement;
        rate: number;
    }): void;
};

declare function DragFrame(frame: xnew$1.Unit, { x, y }?: {
    x?: number;
    y?: number;
}): void;
declare function DragTarget(target: xnew$1.Unit, {}?: {}): void;

declare function AnalogStick(self: xnew$1.Unit, { size, fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin }?: {
    size?: number;
    diagonal?: boolean;
    fill?: string;
    fillOpacity?: number;
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    strokeLinejoin?: string;
}): void;
declare function DirectionalPad(self: xnew$1.Unit, { size, diagonal, fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin }?: {
    size?: number;
    diagonal?: boolean;
    fill?: string;
    fillOpacity?: number;
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    strokeLinejoin?: string;
}): void;

declare function load(path: string): AudioFile;
declare class AudioFile {
    buffer?: AudioBuffer;
    promise: Promise<void>;
    source?: AudioBufferSourceNode;
    amp?: GainNode;
    start: number | null;
    constructor(path: string);
    play(offset?: number, loop?: boolean): void;
    pause(): number | undefined;
}

declare function synthesizer(props: SynthProps): Synthesizer;
type SynthProps = {
    oscillator: OscillatorOptions;
    amp: AmpOptions;
    filter?: FilterOptions;
    reverb?: ReverbOptions;
    bpm?: number;
};
type OscillatorOptions = {
    type: OscillatorType;
    envelope?: Envelope;
    LFO?: LFO;
};
type FilterOptions = {
    type: BiquadFilterType;
    cutoff: number;
};
type AmpOptions = {
    envelope: Envelope;
};
type ReverbOptions = {
    time: number;
    mix: number;
};
type Envelope = {
    amount: number;
    ADSR: [number, number, number, number];
};
type LFO = {
    amount: number;
    type: OscillatorType;
    rate: number;
};
declare class Synthesizer {
    props: SynthProps;
    constructor(props: SynthProps);
    press(frequency: number | string, duration?: number | string, wait?: number): {
        release: () => void;
    } | undefined;
}

declare const basics: {
    Screen: typeof Screen;
    PointerEvent: typeof PointerEvent;
    ResizeEvent: typeof ResizeEvent;
    KeyboardEvent: typeof KeyboardEvent;
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
    AnalogStick: typeof AnalogStick;
    DirectionalPad: typeof DirectionalPad;
};
declare const audio: {
    master: GainNode;
    context: AudioContext;
    synthesizer: typeof synthesizer;
    load: typeof load;
};
interface xnew_interface {
    (...args: any[]): Unit;
    [key: string]: any;
    basics: typeof basics;
    audio: typeof audio;
}
declare namespace xnew {
    type Unit = InstanceType<typeof Unit>;
}
declare const xnew: xnew_interface;

export { xnew as default };
export type { xnew_interface };
