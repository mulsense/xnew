declare function ResizeEvent(self: any): void;

declare const LIFECYCLE_EVENTS: readonly ["start", "update", "stop", "finalize"];
type LifecycleEvent = typeof LIFECYCLE_EVENTS[number];
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
    root: Unit;
    parent: Unit | null;
    children: Unit[];
    target: Object | null;
    props?: Object;
    nextNest: {
        element: HTMLElement | SVGElement;
        position: InsertPosition;
    };
    baseElement: HTMLElement | SVGElement;
    currentElement: HTMLElement | SVGElement;
    baseContext: Context | null;
    baseComponent: Function | null;
    components: Function[];
    captures: Capture[];
    state: string;
    tostart: boolean;
    upcount: number;
    resolved: boolean;
    defines: Record<string, any>;
    system: Record<LifecycleEvent, Function[]>;
}
declare class Unit {
    [key: string]: any;
    _: UnitInternal;
    static roots: Unit[];
    constructor(parent: Unit | null, target: Object | null, component?: Function | string, props?: Object);
    get element(): HTMLElement | SVGElement;
    start(): void;
    stop(): void;
    finalize(): void;
    reboot(): void;
    get components(): Function[];
    on(type: string, listener: Function, options?: boolean | AddEventListenerOptions): Unit;
    off(type?: string, listener?: Function): Unit;
    emit(type: string, ...args: any[]): void;
    static initialize(unit: Unit): void;
    static finalize(unit: Unit): void;
    static nest(unit: Unit, tag: string): HTMLElement | SVGElement | null;
    static extend(unit: Unit, component: Function, props?: Object): void;
    static start(unit: Unit, time: number): void;
    static stop(unit: Unit): void;
    static update(unit: Unit, time: number): void;
    static ticker(time: number): void;
    static reset(): void;
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
}): {
    transition(status: number): void;
};

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
declare function AccordionButton(button: xnew$1.Unit, {}?: {}): void;
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

declare function PanelFrame(frame: xnew$1.Unit): void;
declare function PanelGroup(group: xnew$1.Unit, { name, open }?: {
    name?: string;
    open?: boolean;
}): void;

declare function DragFrame(frame: xnew$1.Unit, { x, y }?: {
    x?: number;
    y?: number;
}): void;
declare function DragTarget(target: xnew$1.Unit, {}?: {}): void;

declare function VirtualStick(self: xnew$1.Unit, { size, fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin }?: {
    size?: number | undefined;
    fill?: string | undefined;
    fillOpacity?: number | undefined;
    stroke?: string | undefined;
    strokeOpacity?: number | undefined;
    strokeWidth?: number | undefined;
    strokeLinejoin?: string | undefined;
}): void;
declare function VirtualDPad(self: xnew$1.Unit, { size, fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin }?: {
    size?: number | undefined;
    fill?: string | undefined;
    fillOpacity?: number | undefined;
    stroke?: string | undefined;
    strokeOpacity?: number | undefined;
    strokeWidth?: number | undefined;
    strokeLinejoin?: string | undefined;
}): void;
declare function VirtualButton(self: xnew$1.Unit, { size, fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin }?: {
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
    AccordionButton: typeof AccordionButton;
    AccordionBullet: typeof AccordionBullet;
    AccordionContent: typeof AccordionContent;
    TabFrame: typeof TabFrame;
    TabButton: typeof TabButton;
    TabContent: typeof TabContent;
    PanelFrame: typeof PanelFrame;
    PanelGroup: typeof PanelGroup;
    InputFrame: typeof InputFrame;
    DragFrame: typeof DragFrame;
    DragTarget: typeof DragTarget;
    VirtualStick: typeof VirtualStick;
    VirtualDPad: typeof VirtualDPad;
    VirtualButton: typeof VirtualButton;
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
