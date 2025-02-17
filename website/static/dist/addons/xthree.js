(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('xnew')) :
    typeof define === 'function' && define.amd ? define(['exports', 'xnew'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.xthree = global.xthree || {}, global.xnew));
})(this, (function (exports, xnew) { 'use strict';

    function BaseSystem(self, { canvas, camera = null, ...parameters }) {
        const renderer = new THREE.WebGLRenderer({ canvas, ...parameters });

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xFFFFFF);

        camera = camera ?? new THREE.PerspectiveCamera(45, canvas.width / canvas.height);

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

    function Connect(self, object) {
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

    exports.BaseSystem = BaseSystem;
    exports.Connect = Connect;

}));
