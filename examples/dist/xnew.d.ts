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

interface TimerOptions {
    transition?: Function;
    timeout?: Function;
    duration: number;
    iterations: number;
    easing?: string;
}

declare class Eventor {
    private map;
    add(element: HTMLElement | SVGElement, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    remove(type: string, listener: Function): void;
    private element_basic;
    private element_resize;
    private element_change;
    private element_input;
    private element_click;
    private element_click_outside;
    private element_pointer;
    private element_mouse;
    private element_touch;
    private element_pointer_outside;
    private element_wheel;
    private element_drag;
    private window_basic;
    private window_key;
    private window_key_arrow;
    private window_key_wasd;
    private document_basic;
}

type UnitElement = HTMLElement | SVGElement;
declare class UnitPromise {
    promise: Promise<any>;
    component: Function | null;
    constructor(promise: Promise<any>, component: Function | null);
    then(callback: Function): UnitPromise;
    catch(callback: Function): UnitPromise;
    finally(callback: Function): UnitPromise;
}
declare class UnitTimer {
    private unit;
    private stack;
    constructor(options: TimerOptions);
    clear(): void;
    timeout(timeout: Function, duration?: number): this;
    iteration(timeout: Function, duration?: number, iterations?: number): this;
    transition(transition: Function, duration?: number, easing?: string): this;
    static execute(timer: UnitTimer, options: TimerOptions): void;
    static next(timer: UnitTimer): void;
    static Component(unit: Unit, { options, snapshot }: {
        options: TimerOptions;
        snapshot: Snapshot;
    }): void;
}
interface Context {
    stack: Context | null;
    key?: any;
    value?: any;
}
interface Snapshot {
    unit: Unit;
    context: Context;
    element: UnitElement;
    component: Function | null;
}
interface Internal {
    parent: Unit | null;
    target: Object | null;
    props?: Object;
    baseElement: UnitElement;
    baseContext: Context;
    baseComponent: Function;
    currentElement: UnitElement;
    currentContext: Context;
    currentComponent: Function | null;
    anchor: UnitElement | null;
    state: string;
    tostart: boolean;
    protected: boolean;
    ancestors: Unit[];
    children: Unit[];
    promises: UnitPromise[];
    nestElements: {
        element: UnitElement;
        owned: boolean;
    }[];
    components: Function[];
    listeners: MapMap<string, Function, {
        element: UnitElement;
        component: Function | null;
        execute: Function;
    }>;
    defines: Record<string, any>;
    systems: Record<string, {
        listener: Function;
        execute: Function;
    }[]>;
    eventor: Eventor;
}
declare class Unit {
    [key: string]: any;
    _: Internal;
    constructor(parent: Unit | null, target: UnitElement | string | null, component?: Function | string | number, props?: Object);
    get element(): UnitElement;
    start(): void;
    stop(): void;
    finalize(): void;
    reboot(): void;
    static initialize(unit: Unit, anchor: UnitElement | null): void;
    static finalize(unit: Unit): void;
    static nest(unit: Unit, target: UnitElement | string, textContent?: string | number): UnitElement;
    static currentComponent: Function;
    static extend(unit: Unit, component: Function, props?: Object): {
        [key: string]: any;
    };
    static start(unit: Unit): void;
    static stop(unit: Unit): void;
    static update(unit: Unit): void;
    static render(unit: Unit): void;
    static rootUnit: Unit;
    static currentUnit: Unit;
    static reset(): void;
    static scope(snapshot: Snapshot, func: Function, ...args: any[]): any;
    static snapshot(unit: Unit): Snapshot;
    static context(unit: Unit, key: any, value?: any): any;
    static component2units: MapSet<Function, Unit>;
    static find(component: Function): Unit[];
    static type2units: MapSet<string, Unit>;
    on(type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    off(type?: string, listener?: Function): void;
    static on(unit: Unit, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    static off(unit: Unit, type: string, listener?: Function): void;
    static emit(type: string, props?: object): void;
}

interface CreateUnit {
    /**
     * Creates a new Unit component
     * @param Component - component function
     * @param props - properties for component function
     * @returns A new Unit instance
     * @example
     * const unit = xnew(MyComponent, { data: 0 })
     */
    (Component?: Function | string, props?: Object): Unit;
    /**
     * Creates a new Unit component
     * @param target - HTMLElement | SVGElement, or HTML tag for new element
     * @param Component - component function
     * @param props - properties for component function
     * @returns A new Unit instance
     * @example
     * const unit = xnew(element, MyComponent, { data: 0 })
     * const unit = xnew('<div>', MyComponent, { data: 0 })
     */
    (target: HTMLElement | SVGElement | string, Component?: Function | string, props?: Object): Unit;
}

declare function OpenAndClose(unit: Unit, { open }: {
    open?: boolean;
}): {
    toggle(duration?: number, easing?: string): void;
    open(duration?: number, easing?: string): void;
    close(duration?: number, easing?: string): void;
};
declare function Accordion(unit: Unit): void;
declare function Popup(unit: Unit): void;

type ScreenFit = 'contain' | 'cover';
declare function Screen(unit: Unit, { aspect, fit }?: {
    aspect?: number;
    fit?: ScreenFit;
}): void;

declare function AnalogStick(unit: Unit, { stroke, strokeOpacity, strokeWidth, strokeLinejoin, fill, fillOpacity }?: {
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    strokeLinejoin?: string;
    diagonal?: boolean;
    fill?: string;
    fillOpacity?: number;
}): void;
declare function DPad(unit: Unit, { diagonal, stroke, strokeOpacity, strokeWidth, strokeLinejoin, fill, fillOpacity }?: {
    diagonal?: boolean;
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    strokeLinejoin?: string;
    fill?: string;
    fillOpacity?: number;
}): void;

interface PanelOptions {
    name?: string;
    open?: boolean;
    params?: Record<string, any>;
}
declare function Panel(unit: Unit, { name, open, params }: PanelOptions): {
    group({ name, open, params }: PanelOptions, inner: Function): Unit;
    button(key: string): Unit;
    select(key: string, { options }?: {
        options?: string[];
    }): Unit;
    range(key: string, options?: {
        min?: number;
        max?: number;
        step?: number;
    }): Unit;
    checkbox(key: string): Unit;
    separator(): void;
};

type SynthesizerOptions = {
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
    props: SynthesizerOptions;
    constructor(props: SynthesizerOptions);
    press(frequency: number | string, duration?: number | string, wait?: number): {
        release: () => void;
    } | undefined;
}

declare namespace xnew {
    type Unit = InstanceType<typeof Unit>;
    type UnitTimer = InstanceType<typeof UnitTimer>;
}
declare const xnew: CreateUnit & {
    nest(target: UnitElement | string): HTMLElement | SVGElement;
    extend(component: Function, props?: Object): {
        [key: string]: any;
    };
    context(component: Function): any;
    promise(promise: Promise<any>): UnitPromise;
    then(callback: Function): UnitPromise;
    catch(callback: Function): UnitPromise;
    finally(callback: Function): UnitPromise;
    scope(callback: any): any;
    find(component: Function): Unit[];
    emit(type: string, ...args: any[]): void;
    timeout(timeout: Function, duration?: number): UnitTimer;
    interval(timeout: Function, duration: number, iterations?: number): UnitTimer;
    transition(transition: Function, duration?: number, easing?: string): UnitTimer;
    protect(): void;
} & {
    basics: {
        Screen: typeof Screen;
        OpenAndClose: typeof OpenAndClose;
        AnalogStick: typeof AnalogStick;
        DPad: typeof DPad;
        Panel: typeof Panel;
        Accordion: typeof Accordion;
        Popup: typeof Popup;
    };
    audio: {
        load(path: string): UnitPromise;
        synthesizer(props: SynthesizerOptions): Synthesizer;
        volume: number;
    };
};

export { xnew as default };
