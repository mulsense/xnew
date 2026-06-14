//----------------------------------------------------------------------------------------------------
// xthree — Three.js integration
//
// `initialize({ canvas, camera })` mounts a Root Unit that owns a WebGLRenderer + Scene + Camera.
// Two ways to attach a THREE object to the current Three parent (root scene or nearest enclosing nest):
//   - `nest(object3D)` : attach AND make this object the current parent — subsequent nests in
//                        descendant units (and later nests in the same unit) go *inside* it.
//   - `add(object3D)`  : attach only; does NOT change the current parent (use to place siblings).
// Both remove the object from its parent on Unit finalize and traverse descendants disposing
// geometry / material to release GPU resources. `remove(object3D)` does that same detach + dispose
// on demand (e.g. swapping a model out of a bake rig before its Unit finalizes).
//
// Caveat: `nest` is stateful — two `nest` calls in the same unit produce two nesting levels.
// Reach for `add` when you just want several objects under the same parent.
//
// - default : { initialize, nest, add, remove, renderer, camera, scene, canvas }
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
        return object;
    },
    add(object: any) {
        xnew(Add, { object });
        return object;
    },
    remove(object: any) {
        object.parent?.remove(object);
        disposeObject(object);
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

// object 配下の geometry / material / texture を辿って dispose し、GPU リソースを解放する。
function disposeObject(object: any): void {
    object.traverse((obj: any) => {
        if (!obj.isMesh) return;
        obj.geometry?.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const material of materials) {
            if (!material) continue;
            // material が参照する texture も解放する
            for (const key in material) {
                const value = material[key];
                if (value && value.isTexture) value.dispose();
            }
            material.dispose();
        }
    });
}

// 現在の THREE 親（root scene か最も近い enclosing nest）へ object を追加し、finalize 時に
// 親から外して配下の geometry / material を dispose する。nest / add の共有処理。
function attach(unit: xnew.Unit, object: any): void {
    const root = xnew.context(Root);
    const parent = xnew.context(Nest)?.threeObject ?? root.scene;

    parent.add(object);
    unit.on('finalize', () => {
        parent.remove(object);
        disposeObject(object);
    });
}

// nest: attach に加えて自身を threeObject として公開する。これにより子孫ユニット（および同一
// ユニットの後続 nest）の `xnew.context(Nest)?.threeObject` がこの object を解決し、親になる。
function Nest(unit: xnew.Unit, { object }: { object: any }) {
    attach(unit, object);
    return {
        get threeObject() { return object; }
    };
}

// add: attach のみ。threeObject を公開せず、context(Nest) のキーにも乗らない（Add で登録される）
// ため、現在の親を変えない。複数オブジェクトを同じ親へ兄弟として並べたいときに使う。
function Add(unit: xnew.Unit, { object }: { object: any }) {
    attach(unit, object);
}
