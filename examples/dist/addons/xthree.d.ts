import * as THREE from 'three';

declare const _default: {
    initialize({ canvas, camera }?: {
        canvas?: HTMLCanvasElement | null;
        camera?: THREE.Camera | null;
    }): void;
    nest(object: any): any;
    readonly renderer: any;
    readonly camera: THREE.Camera;
    readonly scene: THREE.Scene;
    readonly canvas: HTMLCanvasElement;
};

export { _default as default };
