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
        return n;
    }

    var PIXI__namespace = /*#__PURE__*/_interopNamespaceDefault(PIXI);

    function xpixi() {
    }

    Object.defineProperty(xpixi, 'setup', { enumerable: true, value: setup });
    Object.defineProperty(xpixi, 'renderer', { enumerable: true, get: renderer });
    Object.defineProperty(xpixi, 'scene', { enumerable: true, get: scene });
    Object.defineProperty(xpixi, 'nest', { enumerable: true, value: nest });

    function setup({ renderer = null } = {}) {
        xnew.extend(Root, { renderer });
    }

    function renderer() {
        return xnew.context('xpixi.root')?.renderer;
    }

    function scene() {
        return xnew.context('xpixi.root')?.scene;
    }

    function nest(object) {
        xnew.extend(Connect, object);
        return object;
    }

    function Root(self, { renderer }) {
        const root = {};
        xnew.context('xpixi.root', root);
        
        if (renderer === null) {
            const screens = xnew.find(xnew.root, xnew.Screen);
            if (screens.length > 0) {
                const screen = screens.slice(-1)[0]; // last screen
                renderer = PIXI__namespace.autoDetectRenderer({
                    width: screen.canvas.width, height: screen.canvas.height, view: screen.canvas,
                    backgroundAlpha: 0.0, antialias: true,
                });
            } else {
                renderer = PIXI__namespace.autoDetectRenderer({});
            }
        }
        root.renderer = null;

        if (renderer instanceof Promise) {
            xnew.promise(renderer).then((renderer) => root.renderer = renderer);
        }

        root.scene = new PIXI__namespace.Container();
        xnew.extend(Connect, root.scene);
        return {
            update() {
                root.renderer.render(root.scene);
            },
        }
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
            }
        }
    }

    return xpixi;

}));
