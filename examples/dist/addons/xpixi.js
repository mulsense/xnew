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
        initialize({ canvas }) {
            xnew.promise(xnew(Root, { canvas }));
        },
        nest(object) {
            xnew(Nest, { object });
            return object;
        },
        add(object) {
            xnew(Add, { object });
            return object;
        },
        remove(object) {
            removeObject(object);
            return object;
        },
        load(source) {
            return xnew.promise(PIXI__namespace.Assets.load(source));
        },
        get renderer() {
            var _a;
            return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.renderer;
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
    function Root(unit, { canvas }) {
        let renderer = null;
        xnew.promise(PIXI__namespace.autoDetectRenderer({
            width: canvas.width, height: canvas.height, view: canvas,
            antialias: true, backgroundAlpha: 0,
        })).then((value) => {
            renderer = value;
        });
        const scene = new PIXI__namespace.Container();
        return {
            get renderer() { return renderer; },
            get scene() { return scene; },
            get canvas() { return canvas; },
        };
    }
    function removeObject(object) {
        if (object.destroyed === true)
            return;
        const parent = object.parent;
        if (parent && parent.destroyed !== true) {
            parent.removeChild(object);
        }
        object.destroy({ children: true });
    }
    function attach(unit, object) {
        var _a, _b;
        const root = xnew.context(Root);
        const parent = (_b = (_a = xnew.context(Nest)) === null || _a === void 0 ? void 0 : _a.pixiObject) !== null && _b !== void 0 ? _b : root.scene;
        parent.addChild(object);
        unit.on('finalize', () => removeObject(object));
    }
    function Nest(unit, { object }) {
        attach(unit, object);
        return {
            get pixiObject() { return object; },
        };
    }
    function Add(unit, { object }) {
        attach(unit, object);
    }

    return xpixi;

}));
