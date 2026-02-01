import * as PIXI from 'pixi.js';

declare const _default: {
    initialize({ renderer, canvas }?: {
        renderer?: any;
        canvas?: HTMLCanvasElement | null;
    }): void;
    nest(object: any): any;
    readonly renderer: any;
    readonly scene: PIXI.Container;
    readonly canvas: HTMLCanvasElement;
};

export { _default as default };
