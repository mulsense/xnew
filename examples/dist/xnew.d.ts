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
    captures: ((unit: Unit) => boolean | void)[];
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
    constructor(parent: Unit | null, ...args: any[]);
    get element(): UnitElement;
    get components(): Function[];
    start(): void;
    stop(): void;
    finalize(): void;
    reboot(): void;
    append(...args: any[]): void;
    static initialize(unit: Unit, anchor: UnitElement | null): void;
    static finalize(unit: Unit): void;
    static nest(unit: Unit, tag: string): UnitElement;
    static extend(unit: Unit, component: Function, props?: Object): {
        [key: string]: any;
    };
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
    static component2units: MapSet<Function, Unit>;
    static find(component: Function): Unit[];
    static type2units: MapSet<string, Unit>;
    on(type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    off(type?: string, listener?: Function): void;
    emit(type: string, ...args: any[]): void;
    static subon(unit: Unit, target: UnitElement | Window | Document, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    static suboff(unit: Unit, target: UnitElement | Window | Document | null, type?: string, listener?: Function): void;
}
declare class UnitPromise {
    private promise;
    constructor(promise: Promise<any>);
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
    (target: HTMLElement | SVGElement, Component?: Function | string, props?: Object): Unit;
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
     * Fetches a resource and registers the promise with the current component
     * @param url - URL to fetch
     * @param options - Optional fetch options (method, headers, body, etc.)
     * @returns UnitPromise wrapping the fetch promise
     * @example
     * xnew.fetch('/api/users').then(res => res.json()).then(data => console.log(data))
     */
    fetch(url: string, options?: object): UnitPromise;
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
    /**
     * Executes a callback once after a delay, managed by component lifecycle
     * @param timeout - Function to execute after Interval
     * @param interval - Interval duration in milliseconds
     * @returns Object with clear() method to cancel the timeout
     * @example
     * const timer = xnew.timeout(() => console.log('Delayed'), 1000)
     * // Cancel if needed: timer.clear()
     */
    timeout(timeout: Function, interval?: number): any;
    /**
     * Executes a callback repeatedly at specified intervals, managed by component lifecycle
     * @param timeout - Function to execute at each interval
     * @param interval - Interval duration in milliseconds
     * @returns Object with clear() method to stop the interval
     * @example
     * const timer = xnew.interval(() => console.log('Tick'), 1000)
     * // Stop when needed: timer.clear()
     */
    interval(timeout: Function, interval: number): any;
    /**
     * Creates a transition animation with easing, executing callback with progress values
     * @param callback - Function called with progress value (0.0 to 1.0)
     * @param interval - Duration of transition in milliseconds
     * @param easing - Easing function: 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out' (default: 'linear')
     * @returns Object with clear() and next() methods for controlling transitions
     * @example
     * xnew.transition(p => {
     *   element.style.opacity = p
     * }, 500, 'ease-out').transition(p => {
     *   element.style.transform = `scale(${p})`
     * }, 300)
     */
    transition(transition: Function, interval?: number, easing?: string): any;
    /**
     * Creates an event listener manager for a target element with automatic cleanup
     * @param target - Element, Window, or Document to attach listeners to
     * @returns Object with on() and off() methods for managing event listeners
     * @example
     * const mouse = xnew.listener(window)
     * mouse.on('mousemove', (e) => console.log(e.clientX, e.clientY))
     * // Automatically cleaned up when component finalizes
     */
    listener(target: HTMLElement | SVGElement | Window | Document): {
        on(type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
        off(type?: string, listener?: Function): void;
    };
    /**
     * Registers a capture function that can intercept and handle child component events
     * @param execute - Function that receives child unit and returns boolean (true to stop propagation)
     * @example
     * xnew.capture((childUnit) => {
     *   console.log('Child component created:', childUnit)
     *   return false // Continue propagation
     * })
     */
    capture(execute: (unit: Unit) => boolean | void): void;
};

declare function AccordionFrame(frame: Unit, { open, duration, easing }?: {
    open?: boolean;
    duration?: number;
    easing?: string;
}): {
    toggle(): void;
    open(): void;
    close(): void;
};
declare function AccordionHeader(header: Unit, {}?: {}): void;
declare function AccordionBullet(bullet: Unit, { type }?: {
    type?: string;
}): void;
declare function AccordionContent(content: Unit, {}?: {}): {
    transition({ element, rate }: {
        element: HTMLElement;
        rate: number;
    }): void;
};

declare function ResizeEvent(resize: Unit): void;
declare function KeyboardEvent(unit: Unit): void;
declare function PointerEvent(unit: Unit): void;

declare function Screen(screen: Unit, { width, height, fit }?: {
    width?: number | undefined;
    height?: number | undefined;
    fit?: string | undefined;
}): {
    readonly canvas: UnitElement;
    resize(width: number, height: number): void;
};

declare function InputFrame(frame: Unit, {}?: {}): void;

declare function ModalFrame(frame: Unit, { duration, easing }?: {
    duration?: number;
    easing?: string;
}): {
    close(): void;
};
declare function ModalContent(content: Unit, { background }?: {
    background?: string;
}): {
    transition({ element, rate }: {
        element: HTMLElement;
        rate: number;
    }): void;
};

declare function TabFrame(frame: Unit, { select }?: {
    select?: string;
}): void;
declare function TabButton(button: Unit, { key }?: {
    key?: string;
}): {
    select({ element }: {
        element: HTMLElement;
    }): void;
    deselect({ element }: {
        element: HTMLElement;
    }): void;
};
declare function TabContent(content: Unit, { key }?: {
    key?: string;
}): {
    select({ element }: {
        element: HTMLElement;
    }): void;
    deselect({ element }: {
        element: HTMLElement;
    }): void;
};

declare function DragFrame(frame: Unit, { x, y }?: {
    x?: number;
    y?: number;
}): void;
declare function DragTarget(target: Unit, {}?: {}): void;

declare function AnalogStick(self: Unit, { size, fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin }?: {
    size?: number;
    diagonal?: boolean;
    fill?: string;
    fillOpacity?: number;
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    strokeLinejoin?: string;
}): void;
declare function DirectionalPad(self: Unit, { size, diagonal, fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLinejoin }?: {
    size?: number;
    diagonal?: boolean;
    fill?: string;
    fillOpacity?: number;
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    strokeLinejoin?: string;
}): void;

declare const audio: {
    load(path: string): AudioFile;
    synthesizer(props: SynthProps): Synthesizer;
    volume: number;
};
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
declare namespace xnew {
    type Unit = InstanceType<typeof Unit>;
}
declare const xnew: (typeof xnew$1) & {
    basics: typeof basics;
    audio: typeof audio;
};

export { xnew as default };
