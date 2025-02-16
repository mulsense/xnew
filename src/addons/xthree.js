import xnew from 'xnew';

export function Main(self, { canvas, camera }) {
    const renderer = new THREE.WebGLRenderer({ canvas });

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFFFFF);

    xnew.extend(Connect, scene);

    return {
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