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
        sync(canvas) {
            const texture = PIXI__namespace.Texture.from(canvas);
            xnew(PreUpdate, () => {
                texture.source.update();
            });
            return texture;
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
    function Root(self, { canvas }) {
        const root = {};
        xnew.context('xpixi.root', root);
        root.canvas = canvas;
        const renderer = PIXI__namespace.autoDetectRenderer({
            width: canvas.width, height: canvas.height, view: canvas,
            antialias: true, backgroundAlpha: 0,
        });
        root.renderer = null;
        if (renderer instanceof Promise) {
            xnew.promise(renderer).then((renderer) => root.renderer = renderer);
        }
        else {
            root.renderer = renderer;
        }
        root.updates = [];
        root.scene = new PIXI__namespace.Container();
        xnew.context('xpixi.object', root.scene);
        self.on('update', () => {
            root.updates.forEach((update) => {
                update();
            });
            if (root.renderer && root.scene) {
                root.renderer.render(root.scene);
            }
        });
    }
    function Nest(self, { object }) {
        const parent = xnew.context('xpixi.object');
        xnew.context('xpixi.object', object);
        parent.addChild(object);
        self.on('finalize', () => {
            parent.removeChild(object);
        });
    }
    function PreUpdate(self, callback) {
        const root = xnew.context('xpixi.root');
        root.updates.push(callback);
        self.on('finalize', () => {
            root.updates = root.updates.filter((update) => update !== callback);
        });
    }

    return xpixi;

}));
