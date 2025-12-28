(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@mulsense/xnew'), require('@dimforge/rapier2d-compat')) :
    typeof define === 'function' && define.amd ? define(['@mulsense/xnew', '@dimforge/rapier2d-compat'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xrapier2d = factory(global.xnew, global.RAPIER));
})(this, (function (xnew, RAPIER) { 'use strict';

    var xrapier2d = {
        initialize({ gravity = { x: 0.0, y: 9.81 }, timestep = null } = {}) {
            xnew.extend(Root, { gravity, timestep });
        },
        connect(type, object) {
            xnew.extend(Connect, { type, object });
            return object;
        },
        get world() {
            var _a;
            return (_a = xnew.context('xrapier2d.root')) === null || _a === void 0 ? void 0 : _a.world;
        },
    };
    function Root(self, { gravity, timestep }) {
        const root = {};
        xnew.context('xrapier2d.root', root);
        xnew.promise(RAPIER.init(), false).then(() => {
            root.world = new RAPIER.World(gravity);
            if (timestep !== null) {
                root.world.timestep = timestep;
            }
            // xnew.extend(Nest, root.world);
        });
        self.on('update', () => {
            if (root.world) {
                root.world.step();
            }
        });
    }
    let count = 0;
    function Connect(self, { type, object }) {
        const root = xnew.context('xrapier2d.root');
        let temp = count++;
        console.log(temp, type, object);
        // Rapier2D objects (RigidBody, Collider, etc.) are already added to the world
        // when created, so we only need to handle removal on finalize
        self.on('finalize', () => {
            try {
                // Check if object is a RigidBody
                if (type === 'rigidBody') {
                    console.log('Removing RigidBody');
                    root.world.removeRigidBody(object);
                }
                // Check if object is a Collider
                else if (type === 'collider') {
                    console.log('Removing Collider');
                    root.world.removeCollider(object);
                }
                // Check if object is an ImpulseJoint
                else if (type === 'impulseJoint') {
                    console.log('Removing ImpulseJoint');
                    root.world.removeImpulseJoint(object);
                }
            }
            catch (e) {
                // Object may have already been removed
            }
        });
    }

    return xrapier2d;

}));
