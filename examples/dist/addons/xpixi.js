(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('xnew'), require('pixi.js')) :
    typeof define === 'function' && define.amd ? define(['xnew', 'pixi.js'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xpixi = factory(global.xnew, global.PIXI));
})(this, (function (xnew, PIXI) { 'use strict';

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

    var PIXI__namespace = /*#__PURE__*/_interopNamespaceDefault(PIXI);

    var xpixi = {
        initialize({ renderer = null } = {}) {
            xnew.extend(Root, { renderer });
        },
        nest(object) {
            xnew.extend(Connect, object);
            return object;
        },
        get renderer() {
            var _a;
            return (_a = xnew.context('xpixi.root')) === null || _a === void 0 ? void 0 : _a.renderer;
        },
        get scene() {
            var _a;
            return (_a = xnew.context('xpixi.root')) === null || _a === void 0 ? void 0 : _a.scene;
        },
    };
    function Root(self, { renderer = null }) {
        const root = {};
        xnew.context('xpixi.root', root);
        let data;
        if (renderer !== null) {
            data = renderer;
        }
        else {
            const screens = xnew.find(xnew.Screen);
            if (screens.length > 0) {
                const screen = screens.slice(-1)[0]; // last screen
                data = PIXI__namespace.autoDetectRenderer({
                    width: screen.canvas.width, height: screen.canvas.height, view: screen.canvas,
                    antialias: true, backgroundAlpha: 0,
                });
            }
            else {
                data = PIXI__namespace.autoDetectRenderer({});
            }
        }
        root.renderer = null;
        if (data instanceof Promise) {
            xnew.promise(data).then((renderer) => root.renderer = renderer);
        }
        else if ((PIXI__namespace.WebGPURenderer && data instanceof PIXI__namespace.WebGPURenderer) ||
            (PIXI__namespace.WebGLRenderer && data instanceof PIXI__namespace.WebGLRenderer)) {
            root.renderer = data;
        }
        root.scene = new PIXI__namespace.Container();
        xnew.extend(Connect, root.scene);
        return {
            update() {
                if (root.renderer && root.scene) {
                    root.renderer.render(root.scene);
                }
            },
        };
    }
    function Connect(self, object) {
        const parent = xnew.context('xpixi.object');
        xnew.context('xpixi.object', object);
        if (parent) {
            parent.addChild(object);
            return {
                finalize() {
                    parent.removeChild(object);
                },
            };
        }
    }

    return xpixi;

}));
