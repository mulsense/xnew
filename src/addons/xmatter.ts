import xnew from 'xnew';
import Matter from 'matter-js';

export default {
    initialize ({ engine = null }: any = {}) {
        xnew.extend(Root, { engine });
    },
    nest (object: any) {
        xnew.extend(Connect, object);
        return object;
    },
    start() {
        const root = xnew.context('xmatter.root');
        root!.isActive = true;
    },
    stop() {
        const root = xnew.context('xmatter.root');
        root!.isActive = false;
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
    xnew.extend(Connect, root.engine.world);
    self.on('update', () => {
        if (root.isActive) {
            Matter.Engine.update(root.engine);
        }
    });
}

function Connect(self: xnew.Unit, object: any) {
    const parent = xnew.context('xmatter.object');
    xnew.context('xmatter.object', object);

    if (parent) {
        Matter.Composite.add(parent, object);
        self.on('finalize', () => {
            Matter.Composite.remove(parent, object);
        });
    }
}
