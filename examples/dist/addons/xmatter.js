(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@mulsense/xnew'), require('matter-js')) :
    typeof define === 'function' && define.amd ? define(['@mulsense/xnew', 'matter-js'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xmatter = factory(global.xnew, global.Matter));
})(this, (function (xnew, Matter) { 'use strict';

    var xmatter = {
        initialize({ engine = null } = {}) {
            xnew.extend(Root, { engine });
        },
        nest(object) {
            xnew.extend(Nest, object);
            return object;
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
        xnew.extend(Nest, root.engine.world);
        self.on('update', () => {
            if (root.isActive) {
                Matter.Engine.update(root.engine);
            }
        });
    }
    function Nest(self, object) {
        const parent = xnew.context('xmatter.object');
        xnew.context('xmatter.object', object);
        if (parent) {
            Matter.Composite.add(parent, object);
            self.on('finalize', () => {
                Matter.Composite.remove(parent, object);
            });
        }
    }

    return xmatter;

}));
