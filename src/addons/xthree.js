import xnew from 'xnew';

export function BaseSystem(self, { canvas, camera = null, ...parameters }) {
    const renderer = new THREE.WebGLRenderer({ canvas, ...parameters });

    camera = camera ?? new THREE.PerspectiveCamera(45, canvas.width / canvas.height);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFFFFF);

    xnew.extend(Connect, scene);

    return {
        get renderer() {
            return renderer;
        },
        get scene() {
            return scene;
        },
        get camera() {
            return camera;
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