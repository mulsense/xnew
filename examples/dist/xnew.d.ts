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
    constructor(callback: Function, fps?: number);
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
    elements: UnitElement[];
    components: Function[];
    listeners: MapMap<string, Function, {
        element: UnitElement;
        execute: Function;
    }>;
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
}
declare class UnitPromise {
    private promise;
    constructor(promise: Promise<any>);
    then(callback: Function): UnitPromise;
    catch(callback: Function): UnitPromise;
    finally(callback: Function): UnitPromise;
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
    audio: {
        load(path: string): UnitPromise;
        synthesizer(props: SynthesizerOptions): Synthesizer;
        volume: number;
    };
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
declare function KeyboardEvent(keyboard: Unit): void;
declare function PointerEvent(unit: Unit): void;

declare function Screen(screen: Unit, { width, height, fit }?: {
    width?: number | undefined;
    height?: number | undefined;
    fit?: string | undefined;
}): {
    readonly canvas: UnitElement;
    resize(width: number, height: number): void;
};

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

declare function VolumeController(unit: Unit, { range, icon }?: {
    range?: number | string;
    icon?: number | string;
}): void;

declare const icons: {
    AcademicCap(unit: Unit, props: Object): void;
    AdjustmentsHorizontal(unit: Unit, props: Object): void;
    AdjustmentsVertical(unit: Unit, props: Object): void;
    ArchiveBox(unit: Unit, props: Object): void;
    ArchiveBoxArrowDown(unit: Unit, props: Object): void;
    ArchiveBoxXMark(unit: Unit, props: Object): void;
    ArrowDown(unit: Unit, props: Object): void;
    ArrowDownCircle(unit: Unit, props: Object): void;
    ArrowDownLeft(unit: Unit, props: Object): void;
    ArrowDownOnSquare(unit: Unit, props: Object): void;
    ArrowDownOnSquareStack(unit: Unit, props: Object): void;
    ArrowDownRight(unit: Unit, props: Object): void;
    ArrowDownTray(unit: Unit, props: Object): void;
    ArrowLeft(unit: Unit, props: Object): void;
    ArrowLeftCircle(unit: Unit, props: Object): void;
    ArrowLeftEndOnRectangle(unit: Unit, props: Object): void;
    ArrowLeftOnRectangle(unit: Unit, props: Object): void;
    ArrowLeftStartOnRectangle(unit: Unit, props: Object): void;
    ArrowLongDown(unit: Unit, props: Object): void;
    ArrowLongLeft(unit: Unit, props: Object): void;
    ArrowLongRight(unit: Unit, props: Object): void;
    ArrowLongUp(unit: Unit, props: Object): void;
    ArrowPath(unit: Unit, props: Object): void;
    ArrowPathRoundedSquare(unit: Unit, props: Object): void;
    ArrowRight(unit: Unit, props: Object): void;
    ArrowRightCircle(unit: Unit, props: Object): void;
    ArrowRightEndOnRectangle(unit: Unit, props: Object): void;
    ArrowRightOnRectangle(unit: Unit, props: Object): void;
    ArrowRightStartOnRectangle(unit: Unit, props: Object): void;
    ArrowSmallDown(unit: Unit, props: Object): void;
    ArrowSmallLeft(unit: Unit, props: Object): void;
    ArrowSmallRight(unit: Unit, props: Object): void;
    ArrowSmallUp(unit: Unit, props: Object): void;
    ArrowTopRightOnSquare(unit: Unit, props: Object): void;
    ArrowTrendingDown(unit: Unit, props: Object): void;
    ArrowTrendingUp(unit: Unit, props: Object): void;
    ArrowTurnDownLeft(unit: Unit, props: Object): void;
    ArrowTurnDownRight(unit: Unit, props: Object): void;
    ArrowTurnLeftDown(unit: Unit, props: Object): void;
    ArrowTurnLeftUp(unit: Unit, props: Object): void;
    ArrowTurnRightDown(unit: Unit, props: Object): void;
    ArrowTurnRightUp(unit: Unit, props: Object): void;
    ArrowTurnUpLeft(unit: Unit, props: Object): void;
    ArrowTurnUpRight(unit: Unit, props: Object): void;
    ArrowUp(unit: Unit, props: Object): void;
    ArrowUpCircle(unit: Unit, props: Object): void;
    ArrowUpLeft(unit: Unit, props: Object): void;
    ArrowUpOnSquare(unit: Unit, props: Object): void;
    ArrowUpOnSquareStack(unit: Unit, props: Object): void;
    ArrowUpRight(unit: Unit, props: Object): void;
    ArrowUpTray(unit: Unit, props: Object): void;
    ArrowUturnDown(unit: Unit, props: Object): void;
    ArrowUturnLeft(unit: Unit, props: Object): void;
    ArrowUturnRight(unit: Unit, props: Object): void;
    ArrowUturnUp(unit: Unit, props: Object): void;
    ArrowsPointingIn(unit: Unit, props: Object): void;
    ArrowsPointingOut(unit: Unit, props: Object): void;
    ArrowsRightLeft(unit: Unit, props: Object): void;
    ArrowsUpDown(unit: Unit, props: Object): void;
    AtSymbol(unit: Unit, props: Object): void;
    Backspace(unit: Unit, props: Object): void;
    Backward(unit: Unit, props: Object): void;
    Banknotes(unit: Unit, props: Object): void;
    Bars2(unit: Unit, props: Object): void;
    Bars3(unit: Unit, props: Object): void;
    Bars3BottomLeft(unit: Unit, props: Object): void;
    Bars3BottomRight(unit: Unit, props: Object): void;
    Bars3CenterLeft(unit: Unit, props: Object): void;
    Bars4(unit: Unit, props: Object): void;
    BarsArrowDown(unit: Unit, props: Object): void;
    BarsArrowUp(unit: Unit, props: Object): void;
    Battery0(unit: Unit, props: Object): void;
    Battery100(unit: Unit, props: Object): void;
    Battery50(unit: Unit, props: Object): void;
    Beaker(unit: Unit, props: Object): void;
    Bell(unit: Unit, props: Object): void;
    BellAlert(unit: Unit, props: Object): void;
    BellSlash(unit: Unit, props: Object): void;
    BellSnooze(unit: Unit, props: Object): void;
    Bold(unit: Unit, props: Object): void;
    Bolt(unit: Unit, props: Object): void;
    BoltSlash(unit: Unit, props: Object): void;
    BookOpen(unit: Unit, props: Object): void;
    Bookmark(unit: Unit, props: Object): void;
    BookmarkSlash(unit: Unit, props: Object): void;
    BookmarkSquare(unit: Unit, props: Object): void;
    Briefcase(unit: Unit, props: Object): void;
    BugAnt(unit: Unit, props: Object): void;
    BuildingLibrary(unit: Unit, props: Object): void;
    BuildingOffice(unit: Unit, props: Object): void;
    BuildingOffice2(unit: Unit, props: Object): void;
    BuildingStorefront(unit: Unit, props: Object): void;
    Cake(unit: Unit, props: Object): void;
    Calculator(unit: Unit, props: Object): void;
    Calendar(unit: Unit, props: Object): void;
    CalendarDateRange(unit: Unit, props: Object): void;
    CalendarDays(unit: Unit, props: Object): void;
    Camera(unit: Unit, props: Object): void;
    ChartBar(unit: Unit, props: Object): void;
    ChartBarSquare(unit: Unit, props: Object): void;
    ChartPie(unit: Unit, props: Object): void;
    ChatBubbleBottomCenter(unit: Unit, props: Object): void;
    ChatBubbleBottomCenterText(unit: Unit, props: Object): void;
    ChatBubbleLeft(unit: Unit, props: Object): void;
    ChatBubbleLeftEllipsis(unit: Unit, props: Object): void;
    ChatBubbleLeftRight(unit: Unit, props: Object): void;
    ChatBubbleOvalLeft(unit: Unit, props: Object): void;
    ChatBubbleOvalLeftEllipsis(unit: Unit, props: Object): void;
    Check(unit: Unit, props: Object): void;
    CheckBadge(unit: Unit, props: Object): void;
    CheckCircle(unit: Unit, props: Object): void;
    ChevronDoubleDown(unit: Unit, props: Object): void;
    ChevronDoubleLeft(unit: Unit, props: Object): void;
    ChevronDoubleRight(unit: Unit, props: Object): void;
    ChevronDoubleUp(unit: Unit, props: Object): void;
    ChevronDown(unit: Unit, props: Object): void;
    ChevronLeft(unit: Unit, props: Object): void;
    ChevronRight(unit: Unit, props: Object): void;
    ChevronUp(unit: Unit, props: Object): void;
    ChevronUpDown(unit: Unit, props: Object): void;
    CircleStack(unit: Unit, props: Object): void;
    Clipboard(unit: Unit, props: Object): void;
    ClipboardDocument(unit: Unit, props: Object): void;
    ClipboardDocumentCheck(unit: Unit, props: Object): void;
    ClipboardDocumentList(unit: Unit, props: Object): void;
    Clock(unit: Unit, props: Object): void;
    Cloud(unit: Unit, props: Object): void;
    CloudArrowDown(unit: Unit, props: Object): void;
    CloudArrowUp(unit: Unit, props: Object): void;
    CodeBracket(unit: Unit, props: Object): void;
    CodeBracketSquare(unit: Unit, props: Object): void;
    Cog(unit: Unit, props: Object): void;
    Cog6Tooth(unit: Unit, props: Object): void;
    Cog8Tooth(unit: Unit, props: Object): void;
    CommandLine(unit: Unit, props: Object): void;
    ComputerDesktop(unit: Unit, props: Object): void;
    CpuChip(unit: Unit, props: Object): void;
    CreditCard(unit: Unit, props: Object): void;
    Cube(unit: Unit, props: Object): void;
    CubeTransparent(unit: Unit, props: Object): void;
    CurrencyBangladeshi(unit: Unit, props: Object): void;
    CurrencyDollar(unit: Unit, props: Object): void;
    CurrencyEuro(unit: Unit, props: Object): void;
    CurrencyPound(unit: Unit, props: Object): void;
    CurrencyRupee(unit: Unit, props: Object): void;
    CurrencyYen(unit: Unit, props: Object): void;
    CursorArrowRays(unit: Unit, props: Object): void;
    CursorArrowRipple(unit: Unit, props: Object): void;
    DevicePhoneMobile(unit: Unit, props: Object): void;
    DeviceTablet(unit: Unit, props: Object): void;
    Divide(unit: Unit, props: Object): void;
    Document(unit: Unit, props: Object): void;
    DocumentArrowDown(unit: Unit, props: Object): void;
    DocumentArrowUp(unit: Unit, props: Object): void;
    DocumentChartBar(unit: Unit, props: Object): void;
    DocumentCheck(unit: Unit, props: Object): void;
    DocumentCurrencyBangladeshi(unit: Unit, props: Object): void;
    DocumentCurrencyDollar(unit: Unit, props: Object): void;
    DocumentCurrencyEuro(unit: Unit, props: Object): void;
    DocumentCurrencyPound(unit: Unit, props: Object): void;
    DocumentCurrencyRupee(unit: Unit, props: Object): void;
    DocumentCurrencyYen(unit: Unit, props: Object): void;
    DocumentDuplicate(unit: Unit, props: Object): void;
    DocumentMagnifyingGlass(unit: Unit, props: Object): void;
    DocumentMinus(unit: Unit, props: Object): void;
    DocumentPlus(unit: Unit, props: Object): void;
    DocumentText(unit: Unit, props: Object): void;
    EllipsisHorizontal(unit: Unit, props: Object): void;
    EllipsisHorizontalCircle(unit: Unit, props: Object): void;
    EllipsisVertical(unit: Unit, props: Object): void;
    Envelope(unit: Unit, props: Object): void;
    EnvelopeOpen(unit: Unit, props: Object): void;
    Equals(unit: Unit, props: Object): void;
    ExclamationCircle(unit: Unit, props: Object): void;
    ExclamationTriangle(unit: Unit, props: Object): void;
    Eye(unit: Unit, props: Object): void;
    EyeDropper(unit: Unit, props: Object): void;
    EyeSlash(unit: Unit, props: Object): void;
    FaceFrown(unit: Unit, props: Object): void;
    FaceSmile(unit: Unit, props: Object): void;
    Film(unit: Unit, props: Object): void;
    FingerPrint(unit: Unit, props: Object): void;
    Fire(unit: Unit, props: Object): void;
    Flag(unit: Unit, props: Object): void;
    Folder(unit: Unit, props: Object): void;
    FolderArrowDown(unit: Unit, props: Object): void;
    FolderMinus(unit: Unit, props: Object): void;
    FolderOpen(unit: Unit, props: Object): void;
    FolderPlus(unit: Unit, props: Object): void;
    Forward(unit: Unit, props: Object): void;
    Funnel(unit: Unit, props: Object): void;
    Gif(unit: Unit, props: Object): void;
    Gift(unit: Unit, props: Object): void;
    GiftTop(unit: Unit, props: Object): void;
    GlobeAlt(unit: Unit, props: Object): void;
    GlobeAmericas(unit: Unit, props: Object): void;
    GlobeAsiaAustralia(unit: Unit, props: Object): void;
    GlobeEuropeAfrica(unit: Unit, props: Object): void;
    H1(unit: Unit, props: Object): void;
    H2(unit: Unit, props: Object): void;
    H3(unit: Unit, props: Object): void;
    HandRaised(unit: Unit, props: Object): void;
    HandThumbDown(unit: Unit, props: Object): void;
    HandThumbUp(unit: Unit, props: Object): void;
    Hashtag(unit: Unit, props: Object): void;
    Heart(unit: Unit, props: Object): void;
    Home(unit: Unit, props: Object): void;
    HomeModern(unit: Unit, props: Object): void;
    Identification(unit: Unit, props: Object): void;
    Inbox(unit: Unit, props: Object): void;
    InboxArrowDown(unit: Unit, props: Object): void;
    InboxStack(unit: Unit, props: Object): void;
    InformationCircle(unit: Unit, props: Object): void;
    Italic(unit: Unit, props: Object): void;
    Key(unit: Unit, props: Object): void;
    Language(unit: Unit, props: Object): void;
    Lifebuoy(unit: Unit, props: Object): void;
    LightBulb(unit: Unit, props: Object): void;
    Link(unit: Unit, props: Object): void;
    LinkSlash(unit: Unit, props: Object): void;
    ListBullet(unit: Unit, props: Object): void;
    LockClosed(unit: Unit, props: Object): void;
    LockOpen(unit: Unit, props: Object): void;
    MagnifyingGlass(unit: Unit, props: Object): void;
    MagnifyingGlassCircle(unit: Unit, props: Object): void;
    MagnifyingGlassMinus(unit: Unit, props: Object): void;
    MagnifyingGlassPlus(unit: Unit, props: Object): void;
    Map(unit: Unit, props: Object): void;
    MapPin(unit: Unit, props: Object): void;
    Megaphone(unit: Unit, props: Object): void;
    Microphone(unit: Unit, props: Object): void;
    Minus(unit: Unit, props: Object): void;
    MinusCircle(unit: Unit, props: Object): void;
    MinusSmall(unit: Unit, props: Object): void;
    Moon(unit: Unit, props: Object): void;
    MusicalNote(unit: Unit, props: Object): void;
    Newspaper(unit: Unit, props: Object): void;
    NoSymbol(unit: Unit, props: Object): void;
    NumberedList(unit: Unit, props: Object): void;
    PaintBrush(unit: Unit, props: Object): void;
    PaperAirplane(unit: Unit, props: Object): void;
    PaperClip(unit: Unit, props: Object): void;
    Pause(unit: Unit, props: Object): void;
    PauseCircle(unit: Unit, props: Object): void;
    Pencil(unit: Unit, props: Object): void;
    PencilSquare(unit: Unit, props: Object): void;
    PercentBadge(unit: Unit, props: Object): void;
    Phone(unit: Unit, props: Object): void;
    PhoneArrowDownLeft(unit: Unit, props: Object): void;
    PhoneArrowUpRight(unit: Unit, props: Object): void;
    PhoneXMark(unit: Unit, props: Object): void;
    Photo(unit: Unit, props: Object): void;
    Play(unit: Unit, props: Object): void;
    PlayCircle(unit: Unit, props: Object): void;
    PlayPause(unit: Unit, props: Object): void;
    Plus(unit: Unit, props: Object): void;
    PlusCircle(unit: Unit, props: Object): void;
    PlusSmall(unit: Unit, props: Object): void;
    Power(unit: Unit, props: Object): void;
    PresentationChartBar(unit: Unit, props: Object): void;
    PresentationChartLine(unit: Unit, props: Object): void;
    Printer(unit: Unit, props: Object): void;
    PuzzlePiece(unit: Unit, props: Object): void;
    QrCode(unit: Unit, props: Object): void;
    QuestionMarkCircle(unit: Unit, props: Object): void;
    QueueList(unit: Unit, props: Object): void;
    Radio(unit: Unit, props: Object): void;
    ReceiptPercent(unit: Unit, props: Object): void;
    ReceiptRefund(unit: Unit, props: Object): void;
    RectangleGroup(unit: Unit, props: Object): void;
    RectangleStack(unit: Unit, props: Object): void;
    RocketLaunch(unit: Unit, props: Object): void;
    Rss(unit: Unit, props: Object): void;
    Scale(unit: Unit, props: Object): void;
    Scissors(unit: Unit, props: Object): void;
    Server(unit: Unit, props: Object): void;
    ServerStack(unit: Unit, props: Object): void;
    Share(unit: Unit, props: Object): void;
    ShieldCheck(unit: Unit, props: Object): void;
    ShieldExclamation(unit: Unit, props: Object): void;
    ShoppingBag(unit: Unit, props: Object): void;
    ShoppingCart(unit: Unit, props: Object): void;
    Signal(unit: Unit, props: Object): void;
    SignalSlash(unit: Unit, props: Object): void;
    Slash(unit: Unit, props: Object): void;
    Sparkles(unit: Unit, props: Object): void;
    SpeakerWave(unit: Unit, props: Object): void;
    SpeakerXMark(unit: Unit, props: Object): void;
    Square2Stack(unit: Unit, props: Object): void;
    Square3Stack3d(unit: Unit, props: Object): void;
    Squares2x2(unit: Unit, props: Object): void;
    SquaresPlus(unit: Unit, props: Object): void;
    Star(unit: Unit, props: Object): void;
    Stop(unit: Unit, props: Object): void;
    StopCircle(unit: Unit, props: Object): void;
    Strikethrough(unit: Unit, props: Object): void;
    Sun(unit: Unit, props: Object): void;
    Swatch(unit: Unit, props: Object): void;
    TableCells(unit: Unit, props: Object): void;
    Tag(unit: Unit, props: Object): void;
    Ticket(unit: Unit, props: Object): void;
    Trash(unit: Unit, props: Object): void;
    Trophy(unit: Unit, props: Object): void;
    Truck(unit: Unit, props: Object): void;
    Tv(unit: Unit, props: Object): void;
    Underline(unit: Unit, props: Object): void;
    User(unit: Unit, props: Object): void;
    UserCircle(unit: Unit, props: Object): void;
    UserGroup(unit: Unit, props: Object): void;
    UserMinus(unit: Unit, props: Object): void;
    UserPlus(unit: Unit, props: Object): void;
    Users(unit: Unit, props: Object): void;
    Variable(unit: Unit, props: Object): void;
    VideoCamera(unit: Unit, props: Object): void;
    VideoCameraSlash(unit: Unit, props: Object): void;
    ViewColumns(unit: Unit, props: Object): void;
    ViewfinderCircle(unit: Unit, props: Object): void;
    Wallet(unit: Unit, props: Object): void;
    Wifi(unit: Unit, props: Object): void;
    Window(unit: Unit, props: Object): void;
    Wrench(unit: Unit, props: Object): void;
    WrenchScrewdriver(unit: Unit, props: Object): void;
    XCircle(unit: Unit, props: Object): void;
    XMark(unit: Unit, props: Object): void;
};

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
    DragFrame: typeof DragFrame;
    DragTarget: typeof DragTarget;
    AnalogStick: typeof AnalogStick;
    DirectionalPad: typeof DirectionalPad;
    VolumeController: typeof VolumeController;
};
declare namespace xnew {
    type Unit = InstanceType<typeof Unit>;
}
declare const xnew: (typeof xnew$1) & {
    basics: typeof basics;
    icons: typeof icons;
};

export { xnew as default };
