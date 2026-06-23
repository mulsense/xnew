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

type DomElement = HTMLElement | SVGElement;
declare class Eventor {
    private map;
    add(element: DomElement, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    remove(type: string, listener: Function): void;
}

interface Context {
    previous: Context | null;
    key?: any;
    value?: any;
}
interface Snapshot {
    unit: Unit;
    context: Context;
    element: DomElement;
    Component: Function | null;
}
type Status = 'invoked' | 'initialized' | 'started' | 'stopped' | 'finalizing' | 'finalized';
interface UnitOptions {
    setup?: (unit: Unit) => void;
}
type ComponentFn<P extends object = any, A extends object = {}> = (unit: Unit, props: P) => A | void;
type DefinesOf<C> = C extends (...args: any[]) => infer R ? ([R] extends [void] ? {} : Exclude<R, void | undefined>) : {};
type PropsOf<C> = C extends (unit: Unit, props: infer P, ...rest: any[]) => any ? P : {};
declare const SYSTEM_EVENTS: readonly ["start", "update", "render", "stop", "finalize"];
type SystemEvent = typeof SYSTEM_EVENTS[number];
declare class Unit {
    _: {
        parent: Unit | null;
        children: Unit[];
        status: Status;
        tostart: boolean;
        protected: boolean;
        updateCount: number;
        renderCount: number;
        promises: UnitPromise[];
        defines: Record<string, any>;
        systems: Record<SystemEvent, {
            listener: Function;
            execute: Function;
        }[]>;
        currentElement: DomElement;
        currentContext: Context;
        currentComponent: Function | null;
        afterSnapshot: Snapshot | null;
        nestElements: {
            element: DomElement;
            owned: boolean;
        }[];
        Components: Function[];
        listeners: MapMap<string, Function, {
            element: DomElement;
            Component: Function | null;
            execute: Function;
        }>;
        eventor: Eventor;
        key: any;
    };
    constructor(options: UnitOptions | null, parent: Unit | null, ...args: any[]);
    get parent(): Unit | null;
    get element(): DomElement;
    private start;
    private stop;
    finalize(): void;
    static finalize(unit: Unit): void;
    static nest(unit: Unit, target: DomElement | string, textContent?: string | number): DomElement;
    static extend(unit: Unit, Component: Function, props?: Object): {
        [key: string]: any;
    };
    static start(unit: Unit): void;
    static stop(unit: Unit): void;
    static update(unit: Unit, delta?: number): void;
    static render(unit: Unit, delta?: number): void;
    static engineRoot: Unit;
    static currentUnit: Unit;
    static reset(): void;
    static scope(snapshot: Snapshot, func: Function, ...args: any[]): any;
    static snapshot(unit: Unit): Snapshot;
    static unit2Contexts: MapSet<Unit, Context>;
    static addContext(unit: Unit, orner: Unit, key: any, value?: Unit): void;
    static getContext(unit: Unit, key: any): any;
    static component2units: MapSet<Function, Unit>;
    static ancestors(unit: Unit | null): Unit[];
    static protectBoundary(from: Unit | null): Unit | undefined;
    static isVisible(boundary: Unit | undefined, current: Unit | null, ancestors: Unit[]): boolean;
    static find(Component: Function, key?: any): Unit[];
    static type2units: MapSet<string, Unit>;
    on(type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    off(type?: string, listener?: Function): void;
    static on(unit: Unit, type: string, listener: Function, options?: boolean | AddEventListenerOptions): void;
    static off(unit: Unit, type: string, listener?: Function): void;
    static emit(type: string, props?: object): void;
}
declare class UnitPromise {
    private promise;
    key?: string;
    constructor(promise: Promise<any>, key?: string);
    then(callback: Function): UnitPromise;
    catch(callback: Function): UnitPromise;
    finally(callback: Function): UnitPromise;
    static defer(key?: string): {
        unitPromise: UnitPromise;
        resolve: (value?: unknown) => void;
        reject: (reason?: unknown) => void;
    };
    static results(promises: UnitPromise[], key?: string): UnitPromise;
    private static assignKey;
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
}

interface XnewBase {
    <C extends ComponentFn<any, any>>(Component: C, props?: PropsOf<C>): Unit & DefinesOf<C>;
    <C extends ComponentFn<any, any>>(target: DomElement | string, Component: C, props?: PropsOf<C>): Unit & DefinesOf<C>;
    (target: DomElement | string, content?: string | number): Unit;
    (content: string | number): Unit;
    (parent: Unit | null, ...args: any[]): Unit;
    (): Unit;
}

type Environment = 'server' | 'client';

interface ClientStatus {
    id: string;
    name: string | undefined;
}
interface RoomStatus {
    id: string | undefined;
    name: string | undefined;
}
interface SyncStatus {
    id?: string;
    clients: ClientStatus[];
    room?: RoomStatus;
}
interface BootOptions {
    io?: any;
    socket?: any;
    room?: RoomStatus;
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
interface SVGTextInterface {
    text?: string;
    fontSize?: number;
    anchor?: {
        x: number;
        y: number;
    };
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
declare function SVGText(unit: Unit, { text, fontSize, anchor, className, style, stroke, strokeOpacity, strokeWidth, strokeLinejoin, strokeLinecap, fill, fillOpacity }?: SVGTextInterface): void;

declare function Screen(unit: Unit, { width, height, fit }?: {
    width?: number;
    height?: number;
    fit?: 'contain' | 'cover';
}): {
    readonly canvas: DomElement;
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
    change(Component: Function, props?: any): void;
    add(Component: Function, props?: any): void;
};

declare function Lobby(unit: Unit, { io, socket, Room, maxRooms, roomNameMax }: {
    io?: any;
    socket?: any;
    Room?: Function;
    maxRooms?: number;
    roomNameMax?: number;
}): void;
declare function Room(unit: Unit, { io, socket, room, Component, graceMs }: Pick<BootOptions, 'io' | 'socket' | 'room'> & {
    Component: Function;
    graceMs?: number;
}): {
    readonly id: string | undefined;
    readonly name: string | undefined;
    readonly memberCount: number;
};

declare function Aspect(unit: Unit, { aspect, fit }?: {
    aspect?: number;
    fit?: 'contain' | 'cover';
}): void;

declare function AudioTrack(unit: Unit, { url, volume, loop }: {
    url: string;
    volume?: number;
    loop?: boolean;
}): {
    play: ({ offset, fade: fadeMs, loop: loopArg }?: {
        offset?: number;
        fade?: number;
        loop?: boolean;
    }) => void;
    pause: ({ fade: fadeMs }?: {
        fade?: number;
    }) => void;
    readonly isPlaying: boolean;
    readonly isLoaded: boolean;
    volume: number;
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
declare function Synthesizer(unit: Unit, props: SynthesizerOptions): {
    press: (frequency: number | string, duration?: number | string, wait?: number) => {
        release: () => void;
    } | undefined;
};
declare function Volume(unit: Unit): {
    volume: number;
    readonly muted: boolean;
};

declare namespace xnew {
    type Unit = InstanceType<typeof Unit>;
    type UnitTimer = InstanceType<typeof UnitTimer>;
    type Component<P extends object = any, A extends object = {}> = ComponentFn<P, A>;
    type Environment = Environment;
    type Status = Status;
}
declare const xnew: XnewBase & {
    nest(target: DomElement | string): HTMLElement | SVGElement;
    extend<C extends ComponentFn<any, any>>(Component: C, props?: PropsOf<C>): DefinesOf<C>;
    context(key: any): any;
    promise: {
        (): {
            resolve: (value?: unknown) => void;
            reject: (reason?: unknown) => void;
        };
        (key: string): {
            resolve: (value?: unknown) => void;
            reject: (reason?: unknown) => void;
        };
        (promise: Function | Promise<any> | Unit): UnitPromise;
        (key: string, promise: Function | Promise<any> | Unit): UnitPromise;
    };
    scope(callback: any): any;
    find(Component: Function, opts?: {
        key?: any;
    }): Unit[];
    emit(type: string, ...args: any[]): void;
    timeout(callback: Function, duration?: number): UnitTimer;
    interval(callback: Function, duration: number, iterations?: number): UnitTimer;
    transition(transition: Function, duration?: number, easing?: string): UnitTimer;
    chunk(callback: (arg: {
        index: number;
    }) => void, max: number, options?: {
        budgetMs?: number;
    }): UnitPromise;
    protect(): void;
    server<C extends ComponentFn<any, any>>(callback: C, props?: PropsOf<C>): DefinesOf<C> | {};
    client<C extends ComponentFn<any, any>>(callback: C, props?: PropsOf<C>): DefinesOf<C> | {};
} & {
    basics: {
        SVG: typeof SVG;
        SVGText: typeof SVGText;
        Aspect: typeof Aspect;
        Screen: typeof Screen;
        OpenAndClose: typeof OpenAndClose;
        AnalogStick: typeof AnalogStick;
        DPad: typeof DPad;
        Panel: typeof Panel;
        Accordion: typeof Accordion;
        Popup: typeof Popup;
        Scene: typeof Scene;
        Lobby: typeof Lobby;
        Room: typeof Room;
        AudioTrack: typeof AudioTrack;
        Synthesizer: typeof Synthesizer;
        Volume: typeof Volume;
    };
    sync: {
        state(initial?: Record<string, any>): Record<string, any>;
        register(components: Record<string, Function>): void;
        readonly status: SyncStatus;
        emit(event: string, payload?: Record<string, any>): void;
        boot(opts: BootOptions, ...args: any[]): Unit;
    };
};

export { xnew };
export type { BootOptions, ClientStatus, RoomStatus, SyncStatus };
