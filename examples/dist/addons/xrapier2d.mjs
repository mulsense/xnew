import xnew from '@mulsense/xnew';
import RAPIER from '@dimforge/rapier2d-compat';

var xrapier2d = {
    initialize({ gravity = { x: 0.0, y: 9.81 } } = {}) {
        xnew.extend(Root, { gravity });
    },
    get world() {
        var _a;
        return (_a = xnew.context('xrapier2d.root')) === null || _a === void 0 ? void 0 : _a.world;
    },
};
function Root(self, { gravity }) {
    const root = {};
    xnew.context('xrapier2d.root', root);
    xnew.promise(RAPIER.init()).then(() => {
        root.world = new RAPIER.World(gravity);
    });
    self.on('fixedupdate', () => {
        root.world.step();
    });
}

export { xrapier2d as default };
