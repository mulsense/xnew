import * as PIXI from 'pixi.js';

declare const xpixi: {
    initialize({ canvas }: {
        canvas: HTMLCanvasElement;
    }): void;
    nest(object: any): any;
    add(object: any): any;
    remove(object: any): void;
    load(source: string | string[]): any;
    finalize(): void;
    readonly renderer: any;
    readonly scene: PIXI.Container;
    readonly canvas: HTMLCanvasElement;
};

export { xpixi };
