import xnew from 'xnew';
import * as THREE from 'three';

export default {
    initialize ({ renderer = null, canvas = null, camera = null }: any = {}) {
        xnew.extend(Root, { renderer, canvas, camera });
    },
    nest (object: any) {
        xnew.extend(Connect, object);
        return object;
    },
    get renderer() {
        return xnew.context('xthree.root')?.renderer;
    },
    get camera() {
        return xnew.context('xthree.root')?.camera;
    },
    get scene() {
        return xnew.context('xthree.root')?.scene;
    },
};

function Root(self: xnew.Unit, { renderer, canvas, camera }: any) {
    const root: { [key: string]: any } = {};
    xnew.context('xthree.root', root);

    if (renderer !== null) {
        root.renderer = renderer;
    } else if (canvas !== null) {
        root.renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
        root.renderer.setClearColor(0x000000, 0);
    } else {
        const screens = xnew.find(null, xnew.Screen);
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
    self.on('update', () => {
        root.renderer.render(root.scene, root.camera);
    });
}

function Connect(self: xnew.Unit, object: any) {
    const parent = xnew.context('xthree.object');
    xnew.context('xthree.object', object);

    if (parent) {
        parent?.add(object);
        self.on('finalize', () => {
            parent?.remove(object);
        });
    }
}
