import xnew from 'xnew';

export function BaseSystem(self, { renderer = null, camera = null }) {
    renderer = renderer ?? new THREE.WebGLRenderer({});
    camera = camera ?? new THREE.PerspectiveCamera(45, renderer.domElement.width / renderer.domElement.height);

    const scene = new THREE.Scene();

    xnew.extend(Connect, scene);

    return {
        get renderer() {
            return renderer;
        },
        get camera() {
            return camera;
        },
        get scene() {
            return scene;
        },
        update() {
            renderer.render(scene, camera);
        },
    }
}

export function Connect(self, object) {
    const parent = xnew.context('xthree.Connect');
    xnew.context('xthree.Connect', object);

    if (parent) {
        parent?.add(object);
        return {
            finalize() {
                parent?.remove(object);
            },
        }
    }
}