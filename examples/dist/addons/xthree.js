(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@mulsense/xnew'), require('three')) :
    typeof define === 'function' && define.amd ? define(['@mulsense/xnew', 'three'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xthree = factory(global.xnew, global.THREE));
})(this, (function (xnew, THREE) { 'use strict';

    function _interopNamespaceDefault(e) {
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n.default = e;
        return n;
    }

    var THREE__namespace = /*#__PURE__*/_interopNamespaceDefault(THREE);

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
            const screens = xnew.find(xnew.parent, xnew.Screen);
            if (screens.length > 0) {
                const screen = screens.slice(-1)[0]; // last screen
                root.renderer = new THREE__namespace.WebGLRenderer({ canvas: screen.canvas, alpha: true });
                root.renderer.setClearColor(0x000000, 0);
            } else {
                root.renderer = new THREE__namespace.WebGLRenderer({});
            }
        }

        root.camera = camera ?? new THREE__namespace.PerspectiveCamera(45, root.renderer.domElement.width / root.renderer.domElement.height);
        root.scene = new THREE__namespace.Scene();
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

    return xthree;

}));
