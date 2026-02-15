import xnew from '@mulsense/xnew';
import * as THREE from 'three';

export default {
    initialize (
        { canvas = null, camera = null }:
        { canvas?: HTMLCanvasElement | null, camera?: THREE.Camera | null } = {}
    ) {
        xnew.extend(Root, { canvas, camera });
    },
    nest (object: any) {
        xnew.extend(Nest, { object });
        return object;
    },
    get renderer() {
        return xnew.context(Root)?.renderer;
    },
    get camera(): THREE.Camera {
        return xnew.context(Root)?.camera;
    },
    get scene(): THREE.Scene {
        return xnew.context(Root)?.scene;
    },
    get canvas(): HTMLCanvasElement {
        return xnew.context(Root)?.canvas;
    },
};

function Root(unit: xnew.Unit, { canvas, camera }: any) {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setClearColor(0x000000, 0);
    
    camera = camera ?? new THREE.PerspectiveCamera(45, renderer.domElement.width / renderer.domElement.height);
    const scene = new THREE.Scene();

    return {
        get canvas() { return canvas; },
        get camera() { return camera; },
        get renderer() { return renderer; },
        get scene() { return scene; },
    }
}

function Nest(unit: xnew.Unit, { object }: { object: any }) {
    const root = xnew.context(Root);
    const parent = xnew.context(Nest)?.threeObject ?? root.scene;

    parent.add(object);
    unit.on('finalize', () => {
        parent.remove(object);
    });
    return {
        get threeObject() { return object; },
    }
}
