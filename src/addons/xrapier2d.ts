import xnew from '@mulsense/xnew';
import RAPIER from '@dimforge/rapier2d-compat';

export default {
    initialize ({ gravity = { x: 0.0, y: 9.81 }, timestep = null }: any = {}) {
        xnew.extend(Root, { gravity, timestep });
    },
    nest (object: any) {
        xnew.extend(Nest, object);
        return object;
    },
    get world() {
        return xnew.context('xrapier2d.root')?.world;
    },
};

function Root(self: xnew.Unit, { gravity, timestep }: any) {
    const root: { [key: string]: any } = {};
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

function Nest(self: xnew.Unit, object: any) {
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
            } catch (e) {
                // Object may have already been removed
            }
        });
    }
}
