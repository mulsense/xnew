import xnew from '@mulsense/xnew';
import * as THREE from 'three';

export default {
    initialize ({ renderer = null, canvas = null, camera = null }: any = {}) {
        xnew.extend(Root, { renderer, canvas, camera });
    },
    nest (object: any) {
        xnew.extend(Nest, { object });
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
    get canvas() {
        return xnew.context('xthree.root')?.canvas;
    }
};

function Root(self: xnew.Unit, { canvas, camera }: any) {
    const root: { [key: string]: any } = {};
    xnew.context('xthree.root', root);
    root.canvas = canvas;

    root.renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    root.renderer.setClearColor(0x000000, 0);
    
    root.camera = camera ?? new THREE.PerspectiveCamera(45, root.renderer.domElement.width / root.renderer.domElement.height);
    root.scene = new THREE.Scene();
    xnew.context('xthree.object', root.scene);
    self.on('-update', () => {
        root.renderer.render(root.scene, root.camera);
    });
}

function Nest(self: xnew.Unit, { object }: { object: any }) {
    const parent = xnew.context('xthree.object');
    xnew.context('xthree.object', object);

    if (parent) {
        parent?.add(object);
        self.on('-finalize', () => {
            parent?.remove(object);
        });
    }
}
