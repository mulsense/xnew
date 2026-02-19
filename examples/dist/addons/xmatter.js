(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@mulsense/xnew'), require('matter-js')) :
    typeof define === 'function' && define.amd ? define(['@mulsense/xnew', 'matter-js'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xmatter = factory(global.xnew, global.Matter));
})(this, (function (xnew, Matter) { 'use strict';

    var xmatter = {
        initialize({} = {}) {
            xnew(Root, {});
        },
        get engine() {
            var _a;
            return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.engine;
        },
        get world() {
            var _a;
            return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.engine.world;
        },
    };
    function Root(unit, {}) {
        const engine = Matter.Engine.create();
        return {
            get engine() { return engine; },
        };
    }

    return xmatter;

}));
