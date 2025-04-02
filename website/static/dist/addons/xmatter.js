(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('xnew'), require('matter-js')) :
    typeof define === 'function' && define.amd ? define(['exports', 'xnew', 'matter-js'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.xmatter = global.xmatter || {}, global.xnew, global.Matter));
})(this, (function (exports, xnew, matterJs) { 'use strict';

    function Root(self, { engine = null, render = null }) {
        const matter = {};

        matter.engine = engine ?? render?.engine ?? matterJs.Engine.create();
        matter.render = render;

        xnew.extend(Connect, matter.engine.world);

        return {
            get matter() {
                return matter;
            },
            update() {
                matterJs.Engine.update(matter.engine);
                if (matter.render !== null) {
                    matterJs.Render.world(matter.render);
                }
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

    exports.Connect = Connect;
    exports.Root = Root;

}));
