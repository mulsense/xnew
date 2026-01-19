import xnew from '@mulsense/xnew';
import RAPIER from '@dimforge/rapier2d-compat';

export default {
    initialize ({ gravity = { x: 0.0, y: 9.81 } }: any = {}) {
        xnew.extend(Root, { gravity });
    },
    get world() {
        return xnew.context('xrapier2d.root')?.world;
    },
};

function Root(unit: xnew.Unit, { gravity }: any) {
    const root: { [key: string]: any } = {};
    xnew.context('xrapier2d.root', root);

    xnew.promise(RAPIER.init()).then(() => {
        root.world = new RAPIER.World(gravity);
    });
}
