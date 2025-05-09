import xnew from 'xnew';
import * as THREE from 'three';

function xthree() {
}

Object.defineProperty(xthree, 'setup', { enumerable: true, value: setup });
Object.defineProperty(xthree, 'initialize', { enumerable: true, value: initialize });
Object.defineProperty(xthree, 'camera', { enumerable: true, get: camera });
Object.defineProperty(xthree, 'renderer', { enumerable: true, get: renderer });
Object.defineProperty(xthree, 'scene', { enumerable: true, get: scene });
Object.defineProperty(xthree, 'nest', { enumerable: true, value: nest });

function setup({ renderer = null, camera = null } = {}) {
    xnew.extend(Root, { renderer, camera });
}

function initialize({ renderer = null, camera = null } = {}) {
    xnew.extend(Root, { renderer, camera });
}

function camera() {
    return xnew.context('xthree.root')?.camera;
}

function renderer() {
    return xnew.context('xthree.root')?.renderer;
}

function scene() {
    return xnew.context('xthree.root')?.scene;
}

function nest(object) {
    xnew.extend(Connect, object);
    return object;
}

function Root(self, { renderer, camera }) {
    const root = {};
    xnew.context('xthree.root', root);

    if (renderer !== null) {
        root.renderer = renderer;
    } else {
        const screens = xnew.find(xnew.Screen);
        if (screens.length > 0) {
            const screen = screens.slice(-1)[0]; // last screen
            root.renderer = new THREE.WebGLRenderer({ canvas: screen.canvas, alpha: true });
            root.renderer.setClearColor(0x000000, 0);
        } else {
            root.renderer = new THREE.WebGLRenderer({});
        }
    }

    root.camera = camera ?? new THREE.PerspectiveCamera(45, root.renderer.domElement.width / root.renderer.domElement.height);
    root.scene = new THREE.Scene();
    xnew.extend(Connect, root.scene);

    return {
        update() {
            root.renderer.render(root.scene, root.camera);
        },
    }
}

function Connect(self, object) {
    const parent = xnew.context('xthree.object');
    xnew.context('xthree.object', object);

    if (parent) {
        parent?.add(object);
        return {
            finalize() {
                parent?.remove(object);
            },
        }
    }
}

export { xthree as default };
