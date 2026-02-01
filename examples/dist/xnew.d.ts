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

declare class EventManager {
    private map;
    add(element: UnitElement, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
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
    config: {
        protect: boolean;
    };
    baseElement: UnitElement;
    baseContext: Context;
    baseComponent: Function;
    currentElement: UnitElement;
    currentContext: Context;
    currentComponent: Function | null;
    anchor: UnitElement | null;
    state: string;
    tostart: boolean;
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
    eventManager: EventManager;
}
declare class Unit {
    [key: string]: any;
    _: Internal;
    constructor(parent: Unit | null, target: UnitElement | string | null, component?: Function | string, props?: Object, config?: any);
    get element(): UnitElement;
    start(): void;
    stop(): void;
    finalize(): void;
    reboot(): void;
    static initialize(unit: Unit, anchor: UnitElement | null): void;
    static finalize(unit: Unit): void;
    static nest(unit: Unit, tag: string): UnitElement;
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
    static wrap(unit: Unit, listener: Function): (...args: any[]) => any;
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
declare class UnitPromise {
    promise: Promise<any>;
    component: Function | null;
    constructor(promise: Promise<any>, component: Function | null);
    then(callback: Function): UnitPromise;
    catch(callback: Function): UnitPromise;
    finally(callback: Function): UnitPromise;
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
     * @param target - HTMLElement, SVGElement, selector string, or HTML tag for new element
     * @param Component - component function
     * @param props - properties for component function
     * @returns A new Unit instance
     * @example
     * const unit = xnew(element, MyComponent, { data: 0 })
     * const unit = xnew('#selector', MyComponent, { data: 0 })
     * const unit = xnew('<div>', MyComponent, { data: 0 })
     */
    (target: HTMLElement | SVGElement | string, Component?: Function | string, props?: Object): Unit;
}
declare const xnew$1: CreateUnit & {
    /**
     * Creates a nested HTML/SVG element within the current component
     * @param tag - HTML or SVG tag name (e.g., '<div>', '<span>', '<svg>')
     * @returns The created HTML/SVG element
     * @throws Error if called after component initialization
     * @example
     * const div = xnew.nest('<div>')
     * div.textContent = 'Hello'
     */
    nest(tag: string): HTMLElement | SVGElement;
    /**
     * Extends the current component with another component's functionality
     * @param component - Component function to extend with
     * @param props - Optional properties to pass to the extended component
     * @returns The extended component's return value
     * @throws Error if called after component initialization
     * @example
     * const api = xnew.extend(BaseComponent, { data: {} })
     */
    extend(component: Function, props?: Object): {
        [key: string]: any;
    };
    /**
     * Gets or sets a context value that can be accessed by child components
     * @param key - Context key
     * @param value - Optional value to set (if undefined, gets the value)
     * @returns The context value if getting, undefined if setting
     * @example
     * // Set context in parent
     * xnew.context('theme', 'dark')
     *
     * // Get context in child
     * const theme = xnew.context('theme')
     */
    context(key: string, value?: any): any;
    /**
     * Registers a promise with the current component for lifecycle management
     * @param promise - Promise to register
     * @returns UnitPromise wrapper for chaining
     * @example
     * xnew.promise(fetchData()).then(data => console.log(data))
     */
    promise(promise: Promise<any>): UnitPromise;
    /**
     * Handles successful resolution of all registered promises in the current component
     * @param callback - Function to call when all promises resolve
     * @returns UnitPromise for chaining
     * @example
     * xnew.then(results => console.log('All promises resolved', results))
     */
    then(callback: Function): UnitPromise;
    /**
     * Handles rejection of any registered promise in the current component
     * @param callback - Function to call if any promise rejects
     * @returns UnitPromise for chaining
     * @example
     * xnew.catch(error => console.error('Promise failed', error))
     */
    catch(callback: Function): UnitPromise;
    /**
     * Executes callback after all registered promises settle (resolve or reject)
     * @param callback - Function to call after promises settle
     * @returns UnitPromise for chaining
     * @example
     * xnew.finally(() => console.log('All promises settled'))
     */
    finally(callback: Function): UnitPromise;
    /**
     * Creates a scoped callback that captures the current component context
     * @param callback - Function to wrap with current scope
     * @returns Function that executes callback in the captured scope
     * @example
     * setTimeout(xnew.scope(() => {
     *   console.log('This runs in the xnew component scope')
     * }), 1000)
     */
    scope(callback: any): any;
    /**
     * Finds all instances of a component in the component tree
     * @param component - Component function to search for
     * @returns Array of Unit instances matching the component
     * @throws Error if component parameter is invalid
     * @example
     * const buttons = xnew.find(ButtonComponent)
     * buttons.forEach(btn => btn.finalize())
     */
    find(component: Function): Unit[];
    emit(type: string, ...args: any[]): void;
    /**
     * Executes a callback once after a delay, managed by component lifecycle
     * @param timeout - Function to execute after Duration
     * @param duration - Duration in milliseconds
     * @returns Object with clear() method to cancel the timeout
     * @example
     * const timer = xnew.timeout(() => console.log('Delayed'), 1000)
     * // Cancel if needed: timer.clear()
     */
    timeout(timeout: Function, duration?: number): any;
    /**
     * Executes a callback repeatedly at specified intervals, managed by component lifecycle
     * @param timeout - Function to execute at each duration
     * @param duration - Duration in milliseconds
     * @returns Object with clear() method to stop the interval
     * @example
     * const timer = xnew.interval(() => console.log('Tick'), 1000)
     * // Stop when needed: timer.clear()
     */
    interval(timeout: Function, duration: number, iterations?: number): any;
    /**
     * Creates a transition animation with easing, executing callback with progress values
     * @param callback - Function called with progress value (0.0 to 1.0)
     * @param duration - Duration of transition in milliseconds
     * @param easing - Easing function: 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out' (default: 'linear')
     * @returns Object with clear() and next() methods for controlling transitions
     * @example
     * xnew.transition(p => {
     *   element.style.opacity = p
     * }, 500, 'ease-out').transition(p => {
     *   element.style.transform = `scale(${p})`
     * }, 300)
     */
    transition(transition: Function, duration?: number, easing?: string): any;
    protect(...args: any[]): Unit;
};

declare function Accordion(unit: Unit, { open, duration, easing }?: {
    open?: boolean;
    duration?: number;
    easing?: string;
}): {
    state: number;
    toggle(): void;
    open(): void;
    close(): void;
};

declare function Screen(unit: Unit, { width, height, fit }?: {
    width?: number | undefined;
    height?: number | undefined;
    fit?: string | undefined;
}): {
    readonly canvas: UnitElement;
    resize(width: number, height: number): void;
};

declare function Modal(unit: Unit, { duration, easing }?: {
    duration?: number;
    easing?: string;
}): {
    state: number;
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

declare function TextStream(unit: Unit, { text, speed, fade }?: {
    text?: string;
    speed?: number;
    fade?: number;
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

declare const basics: {
    Screen: typeof Screen;
    Modal: typeof Modal;
    Accordion: typeof Accordion;
    TextStream: typeof TextStream;
    AnalogStick: typeof AnalogStick;
    DirectionalPad: typeof DirectionalPad;
};

declare const audio: {
    load(path: string): UnitPromise;
    synthesizer(props: SynthesizerOptions): Synthesizer;
    volume: number;
};
declare namespace xnew {
    type Unit = InstanceType<typeof Unit>;
}
declare const xnew: (typeof xnew$1) & {
    basics: typeof basics;
    audio: typeof audio;
} & {
    global: any;
};

export { xnew as default };
