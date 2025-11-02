(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@mulsense/xnew'), require('@dimforge/rapier2d-compat')) :
    typeof define === 'function' && define.amd ? define(['@mulsense/xnew', '@dimforge/rapier2d-compat'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xrapier2d = factory(global.xnew, global.RAPIER));
})(this, (function (xnew, RAPIER) { 'use strict';

    var xrapier2d = {
        initialize({ gravity = { x: 0.0, y: 9.81 }, timestep = null } = {}) {
            xnew.extend(Root, { gravity, timestep });
        },
        nest(object) {
            xnew.extend(Nest, object);
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
        xnew.promise(RAPIER.init()).then(() => {
            root.world = new RAPIER.World(gravity);
            if (timestep !== null) {
                root.world.timestep = timestep;
            }
            xnew.extend(Nest, root.world);
        });
        self.on('update', () => {
            if (root.world) {
                root.world.step();
            }
        });
    }
    function Nest(self, object) {
        const parent = xnew.context('xrapier2d.object');
        xnew.context('xrapier2d.object', object);
        if (parent) {
            // Rapier2D objects (RigidBody, Collider, etc.) are already added to the world
            // when created, so we only need to handle removal on finalize
            self.on('finalize', () => {
                try {
                    // Check if object is a RigidBody
                    if (object.translation && typeof object.translation === 'function') {
                        parent.removeRigidBody(object);
                    }
                    // Check if object is a Collider
                    else if (object.shape && typeof object.shape === 'function') {
                        parent.removeCollider(object);
                    }
                    // Check if object is an ImpulseJoint
                    else if (object.impulse !== undefined) {
                        parent.removeImpulseJoint(object);
                    }
                }
                catch (e) {
                    // Object may have already been removed
                }
            });
        }
    }

    return xrapier2d;

}));
