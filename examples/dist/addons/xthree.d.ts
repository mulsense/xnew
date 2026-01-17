import * as THREE from 'three';

declare const _default: {
    initialize({ renderer, canvas, camera, update }?: {
        renderer?: any;
        canvas?: HTMLCanvasElement | null;
        camera?: THREE.Camera | null;
        update?: boolean;
    }): void;
    nest(object: any): any;
    readonly renderer: any;
    readonly camera: any;
    readonly scene: any;
    readonly canvas: any;
};

export { _default as default };
