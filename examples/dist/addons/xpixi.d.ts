import * as PIXI from 'pixi.js';
declare const _default: {
    initialize({ renderer, canvas }?: any): void;
    nest(object: any): any;
    sync(canvas: any): PIXI.Texture<PIXI.TextureSource<any>>;
    connect(canvas: any): PIXI.Sprite;
    readonly renderer: any;
    readonly scene: any;
    readonly canvas: any;
};
export default _default;
