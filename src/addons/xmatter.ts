import xnew from '@mulsense/xnew';
import Matter from 'matter-js';

export default {
    initialize ({ engine = null }: any = {}) {
        xnew.extend(Root, { engine });
    },
    get engine() {
        return xnew.context('xmatter.root')?.engine;
    },
    get world() {
        return xnew.context('xmatter.root')?.engine.world;
    },
};

function Root(unit: xnew.Unit, { engine }: any) {
    const root: { [key: string]: any } = {};
    xnew.context('xmatter.root', root);

    root.engine = engine ?? Matter.Engine.create();

    unit.on('process', () => {
        Matter.Engine.update(root.engine);
    });
}
