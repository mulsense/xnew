import xnew from 'xnew';
import xthree from 'xnew/addons/xthree';
import * as THREE from 'three';

const width = 800, height = 400;
xnew('#main', Main);

function Main(self) {
  xnew(xnew.Screen, { width, height });
  xthree.initialize();
  xthree.camera.position.set(0, 0, +100);

  xnew(Cubes);
}

function Cubes(self) {
  const object = xthree.nest(new THREE.Object3D());

  for (let z = -1; z <= 1; z++) {
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        xnew(Cube, { x: 15 * x, y: 15 * y, z: 15 * z, size: 6 });
      }
    }
  }
  return {
    update() {
      object.rotation.y += 0.01;
      object.rotation.z += 0.01;
    },
  };
}

function Cube(self, { x, y, z, size }) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshNormalMaterial();
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.position.set(x, y, z);

  return {
    update() {
      object.rotation.x += 0.01;
      object.rotation.y += 0.01;
    },
  };
}