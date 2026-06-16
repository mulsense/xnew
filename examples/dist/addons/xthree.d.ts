import * as THREE from 'three';

declare const _default: {
    initialize({ canvas, camera }: {
        canvas: HTMLCanvasElement;
        camera?: THREE.Camera | null;
    }): void;
    nest(object: any): any;
    add(object: any): any;
    remove(object: any): void;
    dispose(object: any): void;
    finalize(): void;
    readonly renderer: any;
    readonly camera: THREE.Camera;
    readonly scene: THREE.Scene;
    readonly canvas: HTMLCanvasElement;
};

export { _default as default };
