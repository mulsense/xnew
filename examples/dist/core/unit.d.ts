export declare class Unit {
    _: {
        [key: string]: any;
    };
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
