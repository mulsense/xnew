(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@mulsense/xnew'), require('matter-js')) :
    typeof define === 'function' && define.amd ? define(['@mulsense/xnew', 'matter-js'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xmatter = factory(global.xnew, global.Matter));
})(this, (function (xnew, Matter) { 'use strict';

    var xmatter = {
        initialize({ engine = null } = {}) {
            xnew.extend(Root, { engine });
        },
        get engine() {
            var _a;
            return (_a = xnew.context('xmatter.root')) === null || _a === void 0 ? void 0 : _a.engine;
        },
        get world() {
            var _a;
            return (_a = xnew.context('xmatter.root')) === null || _a === void 0 ? void 0 : _a.engine.world;
        },
    };
    function Root(unit, { engine }) {
        const root = {};
        xnew.context('xmatter.root', root);
        root.engine = engine !== null && engine !== void 0 ? engine : Matter.Engine.create();
        unit.on('update', () => {
            Matter.Engine.update(root.engine);
        });
    }

    return xmatter;

}));
