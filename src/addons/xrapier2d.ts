import xnew from 'xnew';
import RAPIER from '@dimforge/rapier2d-compat';

export default {
    initialize ({ engine = null }: any = {}) {
        xnew.extend(Root, { engine });
    },
    nest (object: any) {
        xnew.extend(Nest, object);
        return object;
    },
    get world() {
        return xnew.context('xrapier2d.root')?.world;
    },
};

function Root(self: xnew.Unit, { gravity }: any) {
    const root: { [key: string]: any } = {};
    xnew.context('xrapier2d.root', root);

    xnew.promise(RAPIER.init()).then(() => {
        root.world = new RAPIER.World(gravity);
    });
    
    self.on('update', () => {
    });
}

function Nest(self: xnew.Unit, object: any) {
    const parent = xnew.context('xrapier2d.object');
    xnew.context('xrapier2d.object', object);

    if (parent) {
        
    }
}
