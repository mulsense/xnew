(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('xnew'), require('three')) :
    typeof define === 'function' && define.amd ? define(['xnew', 'three'], factory) :
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
        return Object.freeze(n);
    }

    var THREE__namespace = /*#__PURE__*/_interopNamespaceDefault(THREE);

    var xthree = {
        initialize({ renderer = null, canvas = null, camera = null } = {}) {
            xnew.extend(Root, { renderer, canvas, camera });
        },
        nest(object) {
            xnew.extend(Connect, object);
            return object;
        },
        get renderer() {
            var _a;
            return (_a = xnew.context('xthree.root')) === null || _a === void 0 ? void 0 : _a.renderer;
        },
        get camera() {
            var _a;
            return (_a = xnew.context('xthree.root')) === null || _a === void 0 ? void 0 : _a.camera;
        },
        get scene() {
            var _a;
            return (_a = xnew.context('xthree.root')) === null || _a === void 0 ? void 0 : _a.scene;
        },
    };
    function Root(self, { renderer, canvas, camera }) {
        const root = {};
        xnew.context('xthree.root', root);
        if (renderer !== null) {
            root.renderer = renderer;
        }
        else if (canvas !== null) {
            root.renderer = new THREE__namespace.WebGLRenderer({ canvas, alpha: true });
            root.renderer.setClearColor(0x000000, 0);
        }
        else {
            const screens = xnew.find(xnew.Screen);
            if (screens.length > 0) {
                const screen = screens.slice(-1)[0]; // last screen
                root.renderer = new THREE__namespace.WebGLRenderer({ canvas: screen.canvas, alpha: true });
                root.renderer.setClearColor(0x000000, 0);
            }
            else {
                root.renderer = new THREE__namespace.WebGLRenderer({});
            }
        }
        root.camera = camera !== null && camera !== void 0 ? camera : new THREE__namespace.PerspectiveCamera(45, root.renderer.domElement.width / root.renderer.domElement.height);
        root.scene = new THREE__namespace.Scene();
        xnew.extend(Connect, root.scene);
        self.on('update', () => {
            root.renderer.render(root.scene, root.camera);
        });
    }
    function Connect(self, object) {
        const parent = xnew.context('xthree.object');
        xnew.context('xthree.object', object);
        if (parent) {
            parent === null || parent === void 0 ? void 0 : parent.add(object);
            self.on('finalize', () => {
                parent === null || parent === void 0 ? void 0 : parent.remove(object);
            });
        }
    }

    return xthree;

}));
