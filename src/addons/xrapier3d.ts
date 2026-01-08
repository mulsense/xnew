import xnew from '@mulsense/xnew';
import RAPIER from '@dimforge/rapier3d-compat';

export default {
    initialize ({ gravity = { x: 0.0, y: 9.81, z: 0.0 }, timestep = null }: any = {}) {
        xnew.extend(Root, { gravity, timestep });
    },
    get world() {
        return xnew.context('xrapier3d.root')?.world;
    },
};

function Root(self: xnew.Unit, { gravity, timestep }: any) {
    const root: { [key: string]: any } = {};
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
