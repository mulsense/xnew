import xnew from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import xrapier3d from '@mulsense/xnew/addons/xrapier3d';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

xnew('#main', Main);

function Main(unit) {
  xnew.extend(xnew.basics.Screen, { width: 800, height: 400 });

  // three setup
  xthree.initialize({ canvas: unit.canvas });
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 50, 100);
  xthree.camera.lookAt(0, 0, 0);
  xrapier3d.initialize({ gravity: { x: 0.0, y: -9.81, z: 0.0 } });

  // Add lighting
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(50, 50, 50);
  directionalLight.castShadow = true;

  // Shadow camera settings for wider shadow coverage
  directionalLight.shadow.camera.left = -100;
  directionalLight.shadow.camera.right = 100;
  directionalLight.shadow.camera.top = 100;
  directionalLight.shadow.camera.bottom = -100;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 200;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;

  xthree.scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0x404040);
  xthree.scene.add(ambientLight);

  xnew.then(() => {
    xrapier3d.world.timestep = 3 / 60;
    xnew(CameraController);
    xnew(Player, { x: 0, y: 30, z: 0 });
    xnew(Ground, { x: 0, y: 0, z: 0, width: 100, height: 2, depth: 100 });

    // Add some obstacles
    xnew(Cube, { x: 20, y: 30, z: 0, size: 10, dynamic: true });
    xnew(Cube, { x: -20, y: 30, z: 20, size: 10, dynamic: true });
  });
}

function CameraController(unit) {
  let targetPosition = { x: 0, y: 0, z: 0 };
  const cameraOffset = { x: 0, y: 20, z: 40 };
  const smoothness = 0.1;

  unit.on('+camera:follow', ({ position }) => {
    targetPosition = position;
  });

  unit.on('update', () => {
    // Smooth camera follow
    const targetCameraPos = {
      x: targetPosition.x + cameraOffset.x,
      y: targetPosition.y + cameraOffset.y,
      z: targetPosition.z + cameraOffset.z
    };

    xthree.camera.position.x += (targetCameraPos.x - xthree.camera.position.x) * smoothness;
    xthree.camera.position.y += (targetCameraPos.y - xthree.camera.position.y) * smoothness;
    xthree.camera.position.z += (targetCameraPos.z - xthree.camera.position.z) * smoothness;

    // Look at the player
    xthree.camera.lookAt(targetPosition.x, targetPosition.y, targetPosition.z);
  });
}

function Player(unit, { x, y, z }) {
  const capsuleHeight = 2;
  const capsuleRadius = 0.5;

  // Create capsule visual
  const geometry = new THREE.CapsuleGeometry(capsuleRadius, capsuleHeight, 8, 16);
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;

  // Create kinematic rigid body
  const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z);
  const rigidBody = xrapier3d.world.createRigidBody(rigidBodyDesc);

  // Create capsule collider
  const colliderDesc = RAPIER.ColliderDesc.capsule(capsuleHeight / 2, capsuleRadius);
  const collider = xrapier3d.world.createCollider(colliderDesc, rigidBody);

  // Create character controller
  const characterController = xrapier3d.world.createCharacterController(0.01);
  characterController.enableAutostep(0.7, 0.3, true);
  characterController.enableSnapToGround(0.5);
  characterController.setApplyImpulsesToDynamicBodies(true);

  // Movement state
  let velocity = { x: 0, y: 0, z: 0 };
  const speed = 15;
  const jumpForce = 8;
  let isGrounded = false;

  unit.on('+move', ({ vector }) => {
    velocity.x = vector.x * speed;
    velocity.z = vector.y * speed;
  });

  unit.on('+jump', () => {
    if (isGrounded) {
      velocity.y = jumpForce;
    }
  });

  unit.on('finalize', () => {
    xrapier3d.world.removeCharacterController(characterController);
    xrapier3d.world.removeCollider(collider);
    xrapier3d.world.removeRigidBody(rigidBody);
  });

  unit.on('logicupdate', () => {
    const dt = 3 / 60;

    // Apply gravity
    velocity.y -= 9.81 * dt;

    // Calculate desired movement
    const desiredTranslation = {
      x: velocity.x * dt,
      y: velocity.y * dt,
      z: velocity.z * dt
    };

    // Compute movement with collision detection
    characterController.computeColliderMovement(collider, desiredTranslation);
    const correctedMovement = characterController.computedMovement();

    // Get current position
    const currentPos = rigidBody.translation();

    // Apply corrected movement
    rigidBody.setNextKinematicTranslation({
      x: currentPos.x + correctedMovement.x,
      y: currentPos.y + correctedMovement.y,
      z: currentPos.z + correctedMovement.z
    });

    // Check if grounded
    isGrounded = characterController.computedGrounded();
    if (isGrounded) {
      velocity.y = 0;
    }
  });
  
  unit.on('update', () => {
    // Update visual
    const position = rigidBody.translation();
    const rotation = rigidBody.rotation();
    object.position.set(position.x, position.y, position.z);
    object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

    // Update camera to follow player
    xnew.emit('+camera:follow', { position });
  });

  // prevent default event
  unit.on('touchstart contextmenu wheel', (event) => event.preventDefault());

  const direct = xnew(xnew.basics.DirectEvent);
  direct.on('-keydown.arrow -keyup.arrow', ({ vector }) => {
    xnew.emit('+move', { vector });
  });
  direct.on('-keydown', ({ code }) => {
    if (code === 'Space') xnew.emit('+jump');
  });

}

function Ground(unit, { x, y, z, width, height, depth }) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.position.set(x, y, z);
  object.receiveShadow = true;

  // Create fixed rigid-body
  const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
  const rigidBody = xrapier3d.world.createRigidBody(rigidBodyDesc);

  // Create cuboid collider
  const colliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2);
  const collider = xrapier3d.world.createCollider(colliderDesc, rigidBody);

  unit.on('finalize', () => {
    xrapier3d.world.removeCollider(collider);
    xrapier3d.world.removeRigidBody(rigidBody);
  });
}

function Cube(unit, { x, y, z, size, dynamic = true }) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;

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