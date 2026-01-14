import xnew from '@mulsense/xnew';
import RAPIER from '@dimforge/rapier3d-compat';

var xrapier3d = {
    initialize({ gravity = { x: 0.0, y: 9.81, z: 0.0 } } = {}) {
        xnew.extend(Root, { gravity });
    },
    get world() {
        var _a;
        return (_a = xnew.context('xrapier3d.root')) === null || _a === void 0 ? void 0 : _a.world;
    },
};
function Root(self, { gravity }) {
    const root = {};
    xnew.context('xrapier3d.root', root);
    xnew.promise(RAPIER.init()).then(() => {
        root.world = new RAPIER.World(gravity);
    });
    self.on('logicupdate', () => {
        root.world.step();
    });
}

export { xrapier3d as default };
