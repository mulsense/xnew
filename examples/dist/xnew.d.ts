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

declare class Eventor {
    private map;
    add(element: HTMLElement | SVGElement, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    remove(type: string, listener: Function): void;
    private basic;
    private resize;
    private click;
    private click_outside;
    private pointer;
    private mouse;
    private touch;
    private pointer_outside;
    private wheel;
    private drag;
    private gesture;
    private key;
    private key_arrow;
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
interface Context {
    stack: Context | null;
    key?: string;
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
    elements: UnitElement[];
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
    static nest(unit: Unit, tag: string, textContent?: string | number): UnitElement;
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
    static context(unit: Unit, key: string, value?: any): any;
    static component2units: MapSet<Function, Unit>;
    static find(component: Function): Unit[];
    static type2units: MapSet<string, Unit>;
    on(type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    off(type?: string, listener?: Function): void;
    static on(unit: Unit, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    static off(unit: Unit, type: string, listener?: Function): void;
    static emit(type: string, ...args: any[]): void;
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

declare function Accordion(unit: Unit, { open, duration, easing }?: {
    open?: boolean;
    duration?: number;
    easing?: string;
}): {
    toggle(): void;
    open(): void;
    close(): void;
};

declare function Screen(unit: Unit, { width, height, fit }?: {
    width?: number;
    height?: number;
    fit?: 'contain' | 'cover' | 'fill';
}): {
    readonly canvas: UnitElement;
    resize(width: number, height: number): void;
};

declare function Modal(unit: Unit, { duration, easing }?: {
    duration?: number;
    easing?: string;
}): {
    close(): void;
};

declare function AnalogStick(unit: Unit, { stroke, strokeOpacity, strokeWidth, strokeLinejoin, fill, fillOpacity }?: {
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    strokeLinejoin?: string;
    diagonal?: boolean;
    fill?: string;
    fillOpacity?: number;
}): void;
declare function DirectionalPad(unit: Unit, { diagonal, stroke, strokeOpacity, strokeWidth, strokeLinejoin, fill, fillOpacity }?: {
    diagonal?: boolean;
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    strokeLinejoin?: string;
    fill?: string;
    fillOpacity?: number;
}): void;

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
}
declare const xnew: CreateUnit & {
    nest(tag: string, textContent?: string | number): HTMLElement | SVGElement;
    extend(component: Function, props?: Object): {
        [key: string]: any;
    };
    context(key: string, value?: any): any;
    promise(promise: Promise<any>): UnitPromise;
    then(callback: Function): UnitPromise;
    catch(callback: Function): UnitPromise;
    finally(callback: Function): UnitPromise;
    scope(callback: any): any;
    find(component: Function): Unit[];
    emit(type: string, ...args: any[]): void;
    timeout(timeout: Function, duration?: number): any;
    interval(timeout: Function, duration: number, iterations?: number): any;
    transition(transition: Function, duration?: number, easing?: string): any;
    protect(): void;
} & {
    basics: {
        Screen: typeof Screen;
        Modal: typeof Modal;
        Accordion: typeof Accordion;
        AnalogStick: typeof AnalogStick;
        DirectionalPad: typeof DirectionalPad;
    };
    audio: {
        load(path: string): UnitPromise;
        synthesizer(props: SynthesizerOptions): Synthesizer;
        volume: number;
    };
};

export { xnew as default };
