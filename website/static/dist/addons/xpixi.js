(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('xnew'), require('pixi.js')) :
    typeof define === 'function' && define.amd ? define(['exports', 'xnew', 'pixi.js'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.xpixi = global.xpixi || {}, global.xnew, global.PIXI));
})(this, (function (exports, xnew, PIXI) { 'use strict';

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

    function Root(self, { renderer = null }) {
        const pixi = {};

        pixi.renderer = renderer ?? PIXI__namespace.autoDetectRenderer({});
        pixi.scene = new PIXI__namespace.Container();

        xnew.extend(Connect, pixi.scene);

        return {
            get pixi() {
                return pixi;
            },
            update() {
                pixi.renderer.render(pixi.scene);
            },
        }
    }

    function nest(object) {
        xnew.extend(Connect, object);
        return object;
    }

    function Connect(self, object) {
        const parent = xnew.context('xpixi.Connect');
        xnew.context('xpixi.Connect', object);

        if (parent) {
            parent.addChild(object);
            return {
                finalize() {
                    parent.removeChild(object);
                },
            }
        }
    }

    exports.Connect = Connect;
    exports.Root = Root;
    exports.nest = nest;

}));
