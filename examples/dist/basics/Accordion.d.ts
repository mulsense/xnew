export declare function Accordion(self: any, { status, duration, easing }?: {
    status?: string | undefined;
    duration?: number | undefined;
    easing?: string | undefined;
}): {
    readonly status: string;
    open(): void;
    close(): void;
    toggle(): void;
};
