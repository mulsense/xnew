import xnew from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import xrapier3d from '@mulsense/xnew/addons/xrapier3d';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

xnew('#main', Main);

function Main(main) {
  xnew.extend(xnew.basics.Screen, { width: 800, height: 400 });

  // three setup
  xthree.initialize({ canvas: main.canvas });
  xthree.camera.position.set(0, 0, +100);
  xrapier3d.initialize({ gravity: { x: 0.0, y: -9.81, z: 0.0 } });

  xnew.then(() => {
    xrapier3d.world.timestep = 3 / 60;
    xnew(Cube, { x: 0, y: 20, z: 0, size: 20 });
    xnew(Cube, { x: 0, y: -40, z: 0, size: 20, dynamic: false }); // Ground
  });
}

function Cube(unit, { x, y, z, size, dynamic = true }) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshNormalMaterial();
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.position.set(x, y, z);

  // Create a dynamic rigid-body using xrapier3d
  const rigidBodyDesc = dynamic
    ? RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z)
    : RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
  const rigidBody = xrapier3d.world.createRigidBody(rigidBodyDesc);

  // Create a cuboid collider attached to the rigid body
  const colliderDesc = RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2);
  const collider = xrapier3d.world.createCollider(colliderDesc, rigidBody);

  unit.on('finalize', () => {
    xrapier3d.world.removeCollider(collider);
    xrapier3d.world.removeRigidBody(rigidBody);
  });

  unit.on('update', () => {
    const position = rigidBody.translation();
    const rotation = rigidBody.rotation();
    object.position.set(position.x, position.y, position.z);
    object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  });
}