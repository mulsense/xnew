import xnew from '@mulsense/xnew';
import Matter from 'matter-js';

var xmatter = {
    initialize({ engine = null } = {}) {
        xnew.extend(Root, { engine });
    },
    get engine() {
        var _a;
        return (_a = xnew.context('xmatter.root')) === null || _a === void 0 ? void 0 : _a.engine;
    },
    get world() {
        var _a;
        return (_a = xnew.context('xmatter.root')) === null || _a === void 0 ? void 0 : _a.engine.world;
    },
};
function Root(unit, { engine }) {
    const root = {};
    xnew.context('xmatter.root', root);
    root.engine = engine !== null && engine !== void 0 ? engine : Matter.Engine.create();
    unit.on('process', () => {
        Matter.Engine.update(root.engine);
    });
}

export { xmatter as default };
