(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@mulsense/xnew'), require('pixi.js')) :
    typeof define === 'function' && define.amd ? define(['@mulsense/xnew', 'pixi.js'], factory) :
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
        initialize({ renderer = null, canvas = null } = {}) {
            xnew.extend(Root, { renderer, canvas });
        },
        nest(object) {
            xnew.extend(Nest, { object });
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
        get canvas() {
            var _a;
            return (_a = xnew.context('xpixi.root')) === null || _a === void 0 ? void 0 : _a.canvas;
        },
    };
    function Root(unit, { canvas }) {
        const root = {};
        xnew.context('xpixi.root', root);
        root.canvas = canvas;
        root.renderer = null;
        xnew.promise(PIXI__namespace.autoDetectRenderer({
            width: canvas.width, height: canvas.height, view: canvas,
            antialias: true, backgroundAlpha: 0,
        })).then((renderer) => root.renderer = renderer);
        root.scene = new PIXI__namespace.Container();
        xnew.context('xpixi.object', root.scene);
    }
    function Nest(unit, { object }) {
        const parent = xnew.context('xpixi.object');
        xnew.context('xpixi.object', object);
        parent.addChild(object);
        unit.on('finalize', () => {
            parent.removeChild(object);
        });
        return {
            pixiObject: object,
        };
    }

    return xpixi;

}));
