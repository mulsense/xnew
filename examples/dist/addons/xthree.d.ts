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
    readonly camera: THREE.Camera;
    readonly scene: THREE.Scene;
    readonly canvas: HTMLCanvasElement;
};

export { _default as default };
