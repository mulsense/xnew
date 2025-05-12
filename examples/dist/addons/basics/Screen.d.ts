export declare function Screen(self: any, { width, height, fit }?: {
    width?: number | undefined;
    height?: number | undefined;
    fit?: string | undefined;
}): {
    readonly canvas: any;
    resize(width: number, height: number): void;
    readonly scale: {
        x: number;
        y: number;
    };
};
