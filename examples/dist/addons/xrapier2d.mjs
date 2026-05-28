import xnew from '@mulsense/xnew';
import RAPIER from '@dimforge/rapier2d-compat';

//----------------------------------------------------------------------------------------------------
// xrapier2d — Rapier 2D (compat build) integration
//
// `initialize({ gravity })` mounts a Root Unit that awaits RAPIER.init() (the compat build loads
// its WASM lazily) and then creates a RAPIER.World. Child components read the world through
// xnew.context(Root); until initialization completes the getter returns null.
//
// - default : { initialize, world }
//----------------------------------------------------------------------------------------------------
var xrapier2d = {
    initialize({ gravity = { x: 0.0, y: -9.81 } } = {}) {
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

export { xrapier2d as default };
