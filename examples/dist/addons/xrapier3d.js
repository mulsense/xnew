(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@mulsense/xnew'), require('@dimforge/rapier3d-compat')) :
    typeof define === 'function' && define.amd ? define(['@mulsense/xnew', '@dimforge/rapier3d-compat'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xrapier3d = factory(global.xnew, global.RAPIER));
})(this, (function (xnew, RAPIER) { 'use strict';

    var xrapier3d = {
        initialize({ gravity = { x: 0.0, y: -9.81, z: 0.0 } } = {}) {
            xnew.extend(Root, { gravity });
        },
        get world() {
            var _a;
            return (_a = xnew.context('xrapier3d.root')) === null || _a === void 0 ? void 0 : _a.world;
        },
    };
    function Root(unit, { gravity }) {
        const root = {};
        xnew.context('xrapier3d.root', root);
        xnew.promise(RAPIER.init()).then(() => {
            root.world = new RAPIER.World(gravity);
        });
    }

    return xrapier3d;

}));
