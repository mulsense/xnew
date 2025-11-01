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
    
    xnew.extend(Nest, root.engine.world);
    self.on('update', () => {
        root.world.step();
    });
}

function Nest(self: xnew.Unit, object: any) {
    const parent = xnew.context('xmatter.object');
    xnew.context('xmatter.object', object);

    if (parent) {
        Matter.Composite.add(parent, object);
        self.on('finalize', () => {
            Matter.Composite.remove(parent, object);
        });
    }
}
