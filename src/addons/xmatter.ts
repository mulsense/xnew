import xnew from '@mulsense/xnew';
import Matter from 'matter-js';

export default {
    initialize ({ engine = null }: any = {}) {
        xnew.extend(Root, { engine });
    },
    nest (object: any) {
        xnew.extend(Nest, { object });
        return object;
    },
    get engine() {
        return xnew.context('xmatter.root')?.engine;
    },
};

function Root(self: xnew.Unit, { engine }: any) {
    const root: { [key: string]: any } = {};
    xnew.context('xmatter.root', root);

    root.isActive = true;
    root.engine = engine ?? Matter.Engine.create();
    xnew.context('xmatter.object', root.engine.world);

    self.on('-update', () => {
        if (root.isActive) {
            Matter.Engine.update(root.engine);
        }
    });
}

function Nest(self: xnew.Unit, { object }: { object: any }) {
    const parent = xnew.context('xmatter.object');
    xnew.context('xmatter.object', object);

    Matter.Composite.add(parent, object);
    self.on('-finalize', () => {
        Matter.Composite.remove(parent, object);
    });
}
