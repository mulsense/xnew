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
        initialize({ renderer = null, canvas = null } = {}) {
            xnew.extend(Root, { renderer, canvas });
        },
        nest(object) {
            xnew.extend(Nest, object);
            return object;
        },
        connect(canvas) {
            const texture = PIXI__namespace.Texture.from(canvas);
            const object = new PIXI__namespace.Sprite(texture);
            xnew(Nest, object);
            xnew(PreUpdate, () => {
                object.texture.source.update();
            });
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
    function Root(self, { renderer, canvas }) {
        const root = {};
        xnew.context('xpixi.root', root);
        let data;
        if (renderer !== null) {
            data = renderer;
        }
        else if (canvas !== null) {
            data = PIXI__namespace.autoDetectRenderer({
                width: canvas.width, height: canvas.height, view: canvas,
                antialias: true, backgroundAlpha: 0,
            });
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
        root.updates = [];
        root.scene = new PIXI__namespace.Container();
        xnew.extend(Nest, root.scene);
        self.on('update', () => {
            root.updates.forEach((update) => {
                update();
            });
            if (root.renderer && root.scene) {
                root.renderer.render(root.scene);
            }
        });
    }
    function Nest(self, object) {
        const parent = xnew.context('xpixi.object');
        xnew.context('xpixi.object', object);
        if (parent) {
            parent.addChild(object);
            self.on('finalize', () => {
                parent.removeChild(object);
            });
        }
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
