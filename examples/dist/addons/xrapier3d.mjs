import xnew from '@mulsense/xnew';
import RAPIER from '@dimforge/rapier3d-compat';

var xrapier3d = {
    initialize({ gravity = { x: 0.0, y: 9.81, z: 0.0 }, timestep = null } = {}) {
        xnew.extend(Root, { gravity, timestep });
    },
    get world() {
        var _a;
        return (_a = xnew.context('xrapier3d.root')) === null || _a === void 0 ? void 0 : _a.world;
    },
};
function Root(self, { gravity, timestep }) {
    const root = {};
    xnew.context('xrapier3d.root', root);
    xnew.promise(RAPIER.init(), false).then(() => {
        root.world = new RAPIER.World(gravity);
        if (timestep !== null) {
            root.world.timestep = timestep;
        }
    });
    self.on('update', () => {
        if (root.world) {
            root.world.step();
        }
    });
}

export { xrapier3d as default };
