import xnew from 'xnew';
import Matter from 'matter-js';

var xmatter = {
    initialize({ engine = null } = {}) {
        xnew.extend(Root, { engine });
    },
    nest(object) {
        xnew.extend(Connect, object);
        return object;
    },
    start() {
        const root = xnew.context('xmatter.root');
        root.isActive = true;
    },
    stop() {
        const root = xnew.context('xmatter.root');
        root.isActive = false;
    },
    get engine() {
        var _a;
        return (_a = xnew.context('xmatter.root')) === null || _a === void 0 ? void 0 : _a.engine;
    },
};
function Root(self, { engine }) {
    const root = {};
    xnew.context('xmatter.root', root);
    root.isActive = true;
    root.engine = engine !== null && engine !== void 0 ? engine : Matter.Engine.create();
    xnew.extend(Connect, root.engine.world);
    self.on('update', () => {
        if (root.isActive) {
            Matter.Engine.update(root.engine);
        }
    });
}
function Connect(self, object) {
    const parent = xnew.context('xmatter.object');
    xnew.context('xmatter.object', object);
    if (parent) {
        Matter.Composite.add(parent, object);
        self.on('finalize', () => {
            Matter.Composite.remove(parent, object);
        });
    }
}

export { xmatter as default };
