import xnew from '@mulsense/xnew';
import RAPIER from '@dimforge/rapier2d-compat';

export default {
    initialize ({ gravity = { x: 0.0, y: 9.81 }, timestep = null }: any = {}) {
        xnew.extend(Root, { gravity, timestep });
    },
    connect (type: any, object: any) {
        xnew.extend(Connect, { type, object });
        return object;
    },
    get world() {
        return xnew.context('xrapier2d.root')?.world;
    },
};

function Root(self: xnew.Unit, { gravity, timestep }: any) {
    const root: { [key: string]: any } = {};
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
function Connect(self: xnew.Unit, { type, object }: { type: any, object: any }) {
    const root = xnew.context('xrapier2d.root');
    let temp = count++;
            console.log(temp, type, object)

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
        } catch (e) {
            // Object may have already been removed
        }
    });
}
