import * as PIXI from 'pixi.js';

declare const _default: {
    initialize({ renderer, canvas, update }?: {
        renderer?: any;
        canvas?: HTMLCanvasElement | null;
        update?: boolean;
    }): void;
    nest(object: any): any;
    sync(canvas: any): PIXI.Texture<PIXI.TextureSource<any>>;
    readonly renderer: any;
    readonly scene: any;
    readonly canvas: any;
};

export { _default as default };
