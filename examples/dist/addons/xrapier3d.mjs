import xnew from '@mulsense/xnew';
import RAPIER from '@dimforge/rapier3d-compat';

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

export { xrapier3d as default };
