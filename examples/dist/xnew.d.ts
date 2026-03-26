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
type UnitArgs = [Component?: Function | string, props?: Object] | [target: UnitElement | string, Component?: Function | string, props?: Object];
interface Context {
    previous: Context | null;
    key?: any;
    value?: any;
}
interface Snapshot {
    unit: Unit;
    context: Context;
    element: UnitElement;
    Component: Function | null;
}
declare class Unit {
    [key: string]: any;
    _: {
        parent: Unit | null;
        children: Unit[];
        state: string;
        tostart: boolean;
        protected: boolean;
        promises: UnitPromise[];
        results: Record<string, any>;
        defines: Record<string, any>;
        systems: Record<string, {
            listener: Function;
            execute: Function;
        }[]>;
        currentElement: UnitElement;
        currentContext: Context;
        currentComponent: Function | null;
        afterSnapshot: Snapshot | null;
        nestElements: {
            element: UnitElement;
            owned: boolean;
        }[];
        Components: Function[];
        listeners: MapMap<string, Function, {
            element: UnitElement;
            Component: Function | null;
            execute: Function;
        }>;
        eventor: Eventor;
    };
    constructor(parent: Unit | null, ...args: UnitArgs);
    get element(): UnitElement;
    start(): void;
    stop(): void;
    finalize(): void;
    static finalize(unit: Unit): void;
    static nest(unit: Unit, target: UnitElement | string, textContent?: string | number): UnitElement;
    static currentComponent: Function;
    static extend(unit: Unit, Component: Function, props?: Object): {
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
    static unit2Contexts: MapSet<Unit, Context>;
    static addContext(unit: Unit, orner: Unit, key: any, value?: Unit): void;
    static getContext(unit: Unit, key: any): any;
    static component2units: MapSet<Function, Unit>;
    static find(Component: Function): Unit[];
    static type2units: MapSet<string, Unit>;
    on(type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    off(type?: string, listener?: Function): void;
    static on(unit: Unit, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    static off(unit: Unit, type: string, listener?: Function): void;
    static emit(type: string, props?: object): void;
}
declare class UnitPromise {
    private promise;
    constructor(promise: Promise<any>);
    then(callback: Function): UnitPromise;
    catch(callback: Function): UnitPromise;
    finally(callback: Function): UnitPromise;
    static all(promises: UnitPromise[]): UnitPromise;
    private wrap;
}
declare class UnitTimer {
    private unit;
    private queue;
    clear(): void;
    timeout(timeout: Function, duration?: number): UnitTimer;
    interval(timeout: Function, duration?: number, iterations?: number): UnitTimer;
    transition(transition: Function, duration?: number, easing?: string): UnitTimer;
    private static execute;
    private static next;
    private static Component;
}

interface TransitionOptions {
    duration?: number;
    easing?: string;
}
declare function OpenAndClose(unit: Unit, { open, transition }: {
    open?: boolean;
    transition?: TransitionOptions;
}): {
    toggle(): void;
    open(): void;
    close(): void;
};
declare function Accordion(unit: Unit): void;
declare function Popup(unit: Unit): void;

interface SVGInterface {
    viewBox?: string;
    className?: string;
    style?: string;
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    strokeLinejoin?: string;
    strokeLinecap?: string;
    fill?: string;
    fillOpacity?: number;
}
declare function SVG(unit: Unit, { viewBox, className, style, stroke, strokeOpacity, strokeWidth, strokeLinejoin, strokeLinecap, fill, fillOpacity }?: SVGInterface): void;

declare function Screen(unit: Unit, { width, height, fit }?: {
    width?: number;
    height?: number;
    fit?: 'contain' | 'cover';
}): {
    readonly canvas: UnitElement;
};

declare function AnalogStick(unit: Unit, { stroke, strokeOpacity, strokeWidth, fill, fillOpacity }?: {
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    fill?: string;
    fillOpacity?: number;
}): void;
declare function DPad(unit: Unit, { diagonal, stroke, strokeOpacity, strokeWidth, fill, fillOpacity }?: {
    diagonal?: boolean;
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    fill?: string;
    fillOpacity?: number;
}): void;

interface PanelOptions {
    name?: string;
    open?: boolean;
    params?: Record<string, any>;
}
declare function Panel(unit: Unit, { params }: PanelOptions): {
    group({ name, open, params }: PanelOptions, inner: Function): Unit;
    button(key: string): Unit;
    select(key: string, { value, items }?: {
        value?: string;
        items?: string[];
    }): Unit;
    range(key: string, { value, min, max, step }?: {
        value?: number;
        min?: number;
        max?: number;
        step?: number;
    }): Unit;
    checkbox(key: string, { value }?: {
        value?: boolean;
    }): Unit;
    separator(): void;
};

declare function Scene(unit: Unit): {
    moveTo(Component: Function, props?: any): void;
    append(Component: Function, props?: any): void;
};

declare function VolumeController(unit: Unit, { anchor }?: {
    anchor?: string | undefined;
}): void;

declare class XImage {
    canvas: HTMLCanvasElement;
    constructor(canvas: HTMLCanvasElement);
    constructor(width: number, height: number);
    crop(x: number, y: number, width: number, height: number): XImage;
    download(filename: string): void;
}

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
declare const xnew: ((...args: UnitArgs) => Unit) & {
    nest(target: UnitElement | string): HTMLElement | SVGElement;
    extend(Component: Function, props?: Object): {
        [key: string]: any;
    };
    append(parent: Unit, ...args: UnitArgs): void;
    next(unit: Unit, ...args: UnitArgs): void;
    context(key: any): any;
    promise(promise: Function | Promise<any> | Unit): UnitPromise;
    then(callback: Function): UnitPromise;
    catch(callback: Function): UnitPromise;
    finally(callback: Function): UnitPromise;
    resolvers(): {
        resolve(): void;
        reject(): void;
    };
    output(object?: Record<string, any>): void;
    scope(callback: any): any;
    find(Component: Function): Unit[];
    emit(type: string, ...args: any[]): void;
    timeout(callback: Function, duration?: number): UnitTimer;
    interval(callback: Function, duration: number, iterations?: number): UnitTimer;
    transition(transition: Function, duration?: number, easing?: string): UnitTimer;
    protect(): void;
} & {
    basics: {
        SVG: typeof SVG;
        Screen: typeof Screen;
        OpenAndClose: typeof OpenAndClose;
        AnalogStick: typeof AnalogStick;
        DPad: typeof DPad;
        Panel: typeof Panel;
        Accordion: typeof Accordion;
        Popup: typeof Popup;
        Scene: typeof Scene;
        VolumeController: typeof VolumeController;
    };
    audio: {
        load(path: string): UnitPromise;
        synthesizer(props: SynthesizerOptions): Synthesizer;
        volume: number;
    };
    image: {
        from(canvas: HTMLCanvasElement): XImage;
    };
};

export { xnew as default };
