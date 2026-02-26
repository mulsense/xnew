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
        return Object.freeze(n);
    }

    var THREE__namespace = /*#__PURE__*/_interopNamespaceDefault(THREE);

    var xthree = {
        initialize({ canvas = null, camera = null } = {}) {
            xnew.promise(xnew(Root, { canvas, camera }));
        },
        nest(object) {
            xnew(Nest, { object });
            return object;
        },
        get renderer() {
            var _a;
            return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.renderer;
        },
        get camera() {
            var _a;
            return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.camera;
        },
        get scene() {
            var _a;
            return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.scene;
        },
        get canvas() {
            var _a;
            return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.canvas;
        },
    };
    function Root(unit, { canvas, camera }) {
        const renderer = new THREE__namespace.WebGLRenderer({ canvas, alpha: true });
        renderer.setClearColor(0x000000, 0);
        camera = camera !== null && camera !== void 0 ? camera : new THREE__namespace.PerspectiveCamera(45, renderer.domElement.width / renderer.domElement.height);
        const scene = new THREE__namespace.Scene();
        xnew.resolve();
        return {
            get canvas() { return canvas; },
            get camera() { return camera; },
            get renderer() { return renderer; },
            get scene() { return scene; },
        };
    }
    function Nest(unit, { object }) {
        var _a, _b;
        const root = xnew.context(Root);
        const parent = (_b = (_a = xnew.context(Nest)) === null || _a === void 0 ? void 0 : _a.threeObject) !== null && _b !== void 0 ? _b : root.scene;
        parent.add(object);
        unit.on('finalize', () => {
            parent.remove(object);
        });
        return {
            get threeObject() { return object; },
        };
    }

    return xthree;

}));
