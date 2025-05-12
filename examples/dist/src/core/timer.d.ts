export declare class Timer {
    private timeout;
    private delay;
    private loop;
    private id;
    private time;
    private offset;
    private status;
    private visibilitychange?;
    constructor(timeout: Function, delay: number, loop?: boolean);
    clear(): void;
    elapsed(): number;
    start(): void;
    stop(): void;
    private _start;
    private _stop;
}
