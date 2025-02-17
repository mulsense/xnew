(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('xnew'), require('matter-js')) :
    typeof define === 'function' && define.amd ? define(['exports', 'xnew', 'matter-js'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.xmatter = global.xmatter || {}, global.xnew, global.Matter));
})(this, (function (exports, xnew, matterJs) { 'use strict';

    function BaseSystem(self, { canvas, ...options }) {
        const engine = matterJs.Engine.create();
        const render = matterJs.Render.create({
            canvas,
            engine,
            options: Object.assign({
                width: canvas.width,
                height: canvas.height,
                background: 'rgb(255,255,255)'
            }, options)
        });
        
        xnew.extend(Connect, engine.world);

        return {
            get engine() {
                return engine;
            },
            get render() {
                return render;
            },
            update() {
                matterJs.Engine.update(engine);
                matterJs.Render.world(render);
            },
        }
    }

    function Connect(self, object) {
        const parent = xnew.context('xmatter.Connect');
        xnew.context('xmatter.Connect', object);

        if (parent) {
            matterJs.Composite.add(parent, object);
            return {
                finalize() {
                    matterJs.Composite.remove(parent, object);
                },
            }
        }
    }

    exports.BaseSystem = BaseSystem;
    exports.Connect = Connect;

}));
