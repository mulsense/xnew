(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('xnew')) :
    typeof define === 'function' && define.amd ? define(['exports', 'xnew'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.xpixi = global.xpixi || {}, global.xnew));
})(this, (function (exports, xnew) { 'use strict';

    function Main(self, { canvas }) {
        const renderer = PIXI.autoDetectRenderer({ width: canvas.width, height: canvas.height, view: canvas, backgroundColor: '#FFF' });

        const scene = new PIXI.Container();

        xnew.extend(Connect, scene);

        return {
            get scene() {
                return scene;
            },
            update() {
                renderer.render(scene);
            },
        }
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
    exports.Main = Main;

}));
