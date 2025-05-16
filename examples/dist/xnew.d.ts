declare class Unit {
    _: {
        [key: string]: any;
    };
    [key: string]: any;
    static autoincrement: number;
    constructor(parent: Unit | null, target: Element | Window | Document | null, component?: Function | string, ...args: any[]);
    get element(): Element | null;
    start(): void;
    stop(): void;
    finalize(): void;
    reboot(): void;
    on(type: string, listener: EventListener, options?: boolean | AddEventListenerOptions): void;
    off(type?: string, listener?: EventListener): void;
    static roots: Set<Unit>;
    static initialize(unit: Unit, component?: Function | string, ...args: any[]): void;
    static extend(unit: Unit, component: Function | any, ...args: any[]): void;
    static start(unit: Unit, time: number): void;
    static stop(unit: Unit): void;
    static update(unit: Unit, time: number): void;
    static finalize(unit: Unit): void;
    static animation: number | null;
    static ticker: (() => void) | null;
    static previous: number;
    static reset(): void;
}

interface xnewtype$1 extends Function {
    [key: string]: any;
    readonly root?: HTMLElement | null;
    readonly parent?: HTMLElement | null;
    readonly current?: HTMLElement | null;
    nest(attributes: object): Unit | undefined;
    extend(component: Function, ...args: any[]): Unit | undefined;
}

interface xnewtype extends xnewtype$1 {
    Screen: Function;
    UserEvent: Function;
    ResizeEvent: Function;
}
declare namespace xnew {
    type Unit = InstanceType<typeof Unit>;
}
declare const xnew: xnewtype;

export { xnew as default };
