//----------------------------------------------------------------------------------------------------
// xthree — Three.js integration
//
// `initialize({ canvas, camera })` mounts a Root Unit that owns a WebGLRenderer + Scene + Camera.
// `xthree.nest(object3D)` adds the object to the current Three parent (root scene or nearest
// enclosing nest), exposes it as context for further nests, and on Unit finalize removes it from
// its parent AND traverses descendants disposing geometry / material to release GPU resources.
//
// - default : { initialize, nest, renderer, camera, scene, canvas }
//----------------------------------------------------------------------------------------------------

import xnew from '@mulsense/xnew';
import * as THREE from 'three';

export default {
    initialize (
        { canvas, camera = null }:
        { canvas: HTMLCanvasElement, camera?: THREE.Camera | null }
    ) {
        xnew.promise(xnew(Root, { canvas, camera }));
    },
    nest(object: any) {
        xnew(Nest, { object });
        xnew.extend(() => {
            return {
                get threeObject() { return object; }
            }
        });
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

        object.traverse((obj: any) => {
            if (obj.isMesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) {
                    obj.material.forEach((mat: any) => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
    });

    return {
        get threeObject() { return object; },
    }
}
