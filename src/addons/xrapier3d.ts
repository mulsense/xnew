import xnew from '@mulsense/xnew';
import RAPIER from '@dimforge/rapier3d-compat';

export default {
    initialize ({ gravity = { x: 0.0, y: 9.81, z: 0.0 } }: any = {}) {
        xnew.extend(Root, { gravity });
    },
    get world() {
        return xnew.context('xrapier3d.root')?.world;
    },
};

function Root(self: xnew.Unit, { gravity }: any) {
    const root: { [key: string]: any } = {};
    xnew.context('xrapier3d.root', root);

    xnew.promise(RAPIER.init()).then(() => {
        root.world = new RAPIER.World(gravity);
    });

    self.on('process', () => {
        root.world.step();
    });
}
