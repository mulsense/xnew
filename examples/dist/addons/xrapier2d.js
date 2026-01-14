(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@mulsense/xnew'), require('@dimforge/rapier2d-compat')) :
    typeof define === 'function' && define.amd ? define(['@mulsense/xnew', '@dimforge/rapier2d-compat'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xrapier2d = factory(global.xnew, global.RAPIER));
})(this, (function (xnew, RAPIER) { 'use strict';

    var xrapier2d = {
        initialize({ gravity = { x: 0.0, y: 9.81 } } = {}) {
            xnew.extend(Root, { gravity });
        },
        get world() {
            var _a;
            return (_a = xnew.context('xrapier2d.root')) === null || _a === void 0 ? void 0 : _a.world;
        },
    };
    function Root(self, { gravity }) {
        const root = {};
        xnew.context('xrapier2d.root', root);
        xnew.promise(RAPIER.init()).then(() => {
            root.world = new RAPIER.World(gravity);
        });
        self.on('fixedupdate', () => {
            root.world.step();
        });
    }

    return xrapier2d;

}));
