import xnew from '@mulsense/xnew';
import * as THREE from 'three';

var xthree = {
    initialize({ canvas = null, camera = null } = {}) {
        xnew(Root, { canvas, camera });
    },
    nest(object) {
        xnew(Nest, { object });
        return object;
    },
    get renderer() {
        var _a;
        return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.renderer;
    },
    get camera() {
        var _a;
        return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.camera;
    },
    get scene() {
        var _a;
        return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.scene;
    },
    get canvas() {
        var _a;
        return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.canvas;
    },
};
function Root(unit, { canvas, camera }) {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setClearColor(0x000000, 0);
    camera = camera !== null && camera !== void 0 ? camera : new THREE.PerspectiveCamera(45, renderer.domElement.width / renderer.domElement.height);
    const scene = new THREE.Scene();
    return {
        get canvas() { return canvas; },
        get camera() { return camera; },
        get renderer() { return renderer; },
        get scene() { return scene; },
    };
}
function Nest(unit, { object }) {
    var _a, _b;
    const root = xnew.context(Root);
    const parent = (_b = (_a = xnew.context(Nest)) === null || _a === void 0 ? void 0 : _a.threeObject) !== null && _b !== void 0 ? _b : root.scene;
    parent.add(object);
    unit.on('finalize', () => {
        parent.remove(object);
    });
    return {
        get threeObject() { return object; },
    };
}

export { xthree as default };
