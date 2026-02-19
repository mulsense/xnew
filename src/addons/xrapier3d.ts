import xnew from '@mulsense/xnew';
import RAPIER from '@dimforge/rapier3d-compat';

export default {
    initialize ({ gravity = { x: 0.0, y: -9.81, z: 0.0 } }: any = {}) {
        xnew(Root, { gravity });
    },
    get world() {
        return xnew.context(Root)?.world;
    },
};

function Root(unit: xnew.Unit, { gravity }: any) {
    let world: RAPIER.World | null = null;

    xnew.promise(RAPIER.init()).then(() => {
        world = new RAPIER.World(gravity);
    });
    return {
        get world() { return world; },
    };  
}
