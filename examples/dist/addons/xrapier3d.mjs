import xnew from '@mulsense/xnew';
import RAPIER from '@dimforge/rapier3d-compat';

var xrapier3d = {
    initialize({ gravity = { x: 0.0, y: -9.81, z: 0.0 } } = {}) {
        xnew.promise(xnew(Root, { gravity }));
    },
    get world() {
        var _a;
        return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.world;
    },
    get store() {
        var _a;
        return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.store;
    },
};
function Root(unit, { gravity }) {
    let world = null;
    const store = {};
    xnew.promise(RAPIER.init()).then(() => {
        world = new RAPIER.World(gravity);
    });
    return {
        get world() { return world; },
        get store() { return store; },
    };
}

export { xrapier3d as default };
