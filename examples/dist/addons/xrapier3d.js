(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@mulsense/xnew'), require('@dimforge/rapier3d-compat')) :
    typeof define === 'function' && define.amd ? define(['@mulsense/xnew', '@dimforge/rapier3d-compat'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xrapier3d = factory(global.xnew, global.RAPIER));
})(this, (function (xnew, RAPIER) { 'use strict';

    //----------------------------------------------------------------------------------------------------
    // xrapier3d — Rapier 3D (compat build) integration
    //
    // Same shape as xrapier2d but with a 3D gravity vector. `initialize({ gravity })` mounts a Root
    // Unit that awaits RAPIER.init() (WASM is lazy-loaded) and creates a RAPIER.World; child
    // components read the world through xnew.context(Root).
    //
    // - default : { initialize, world }
    //----------------------------------------------------------------------------------------------------
    var xrapier3d = {
        initialize({ gravity = { x: 0.0, y: -9.81, z: 0.0 } } = {}) {
            xnew.promise(xnew(Root, { gravity }));
        },
        get world() {
            var _a;
            return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.world;
        },
    };
    function Root(unit, { gravity }) {
        let world = null;
        xnew.promise(RAPIER.init()).then(() => {
            world = new RAPIER.World(gravity);
        });
        return {
            get world() { return world; },
        };
    }

    return xrapier3d;

}));
