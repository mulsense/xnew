declare const LIFECYCLE_EVENTS: readonly ["start", "update", "stop", "finalize"];
type LifecycleEvent = typeof LIFECYCLE_EVENTS[number];
interface UnitInternal {
    root: Unit;
    peers: Unit[];
    inputs: {
        parent: Unit | null;
        target: Object | null;
        component?: Function | string;
        props?: Object;
    };
    nextElementSibling: HTMLElement | SVGElement | null;
    baseElement: HTMLElement | SVGElement;
    baseContext: Context | null;
    children: Unit[];
    state: string;
    tostart: boolean;
    currentElement: HTMLElement | SVGElement;
    upcount: number;
    resolved: boolean;
    defines: Record<string, any>;
    system: Record<LifecycleEvent, Function[]>;
}
interface Context {
    stack: Context | null;
    key: string;
    value: any;
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
    on(type: string, listener: Function, options?: boolean | AddEventListenerOptions): Unit;
    off(type?: string, listener?: Function): Unit;
    static initialize(unit: Unit): void;
    static finalize(unit: Unit): void;
    static nest(unit: Unit, tag: string, ...args: any[]): HTMLElement | SVGElement | null;
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

interface xnewtype extends xnewtype$1 {
    Screen: Function;
    UserEvent: Function;
    ResizeEvent: Function;
    ModalFrame: Function;
    ModalContent: Function;
    AccordionFrame: Function;
    AccordionButton: Function;
    AccordionContent: Function;
    TabFrame: Function;
    TabButton: Function;
    TabContent: Function;
    PanelFrame: Function;
    PanelGroup: Function;
    InputUnit: Function;
}
declare namespace xnew {
    type Unit = InstanceType<typeof Unit>;
}
declare const xnew: xnewtype;

export { xnew as default };
