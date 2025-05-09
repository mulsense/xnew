import xnew from 'xnew';
import xthree from 'xnew/addons/xthree';
import * as THREE from 'three';

xnew('#main', Main);

function Main(self) {
  xnew(xnew.Screen, { width: 800, height: 400 });
  xthree.initialize();
  xthree.camera.position.set(0, 0, +100);

  xnew(Light);
  xnew.interval(() => xnew(Cube), 100);
}

function Light(self) {
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1));
  object.position.set(0, 0, 1);
}

function Cube(self) {
  const size = 10 * Math.random() + 5;

  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshLambertMaterial({ color: 0xFFFFFF * Math.random() });
  const object = xthree.nest(new THREE.Mesh(geometry, material));

  object.position.x = 100 * (Math.random() - 0.5);
  object.position.y = 100 * (Math.random() - 0.5);
  object.position.z = 100 * (Math.random() - 0.5);

  const velocity = {};
  velocity.x = Math.random() - 0.5;
  velocity.y = Math.random() - 0.5;
  velocity.z = Math.random() - 0.5;

  // finalize after 5000ms
  xnew.timer(() => self.finalize(), 5000);

  return {
    update() {
      object.position.x += velocity.x;
      object.position.y += velocity.y;
      object.position.z += velocity.z;
      object.rotation.y += 0.01;
      object.rotation.x += 0.01;
    },
  };
}