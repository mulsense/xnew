import xnew from 'xnew';
import * as THREE from 'three'

export function Root(self, { renderer = null, camera = null }) {
    const three = {};

    three.renderer = renderer ?? new THREE.WebGLRenderer({});
    three.camera = camera ?? new THREE.PerspectiveCamera(45, three.renderer.domElement.width / three.renderer.domElement.height);
    three.scene = new THREE.Scene();

    xnew.extend(Connect, three.scene);

    return {
        get three() {
            return three;
        },
        update() {
            three.renderer.render(three.scene, three.camera);
        },
    }
}

export function nest(object) {
    xnew.extend(Connect, object);
    return object;
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