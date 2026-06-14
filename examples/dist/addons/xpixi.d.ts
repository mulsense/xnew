import * as PIXI from 'pixi.js';

declare const _default: {
    initialize({ canvas }: {
        canvas: HTMLCanvasElement;
    }): void;
    nest(object: any): any;
    add(object: any): any;
    load(source: string | string[]): any;
    readonly renderer: any;
    readonly scene: PIXI.Container;
    readonly canvas: HTMLCanvasElement;
};

export { _default as default };
