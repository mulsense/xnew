import xnew from 'xnew';
import xpixi from 'xnew/addons/xpixi';
import xthree from 'xnew/addons/xthree';
import * as PIXI from 'pixi.js';
import * as THREE from 'three';

const width = 800, height = 400;
xnew('#main', (self) => {
  // three 
  xthree.initialize({ canvas: new OffscreenCanvas(width, height) });
  xthree.camera.position.set(0, 0, +100);

  // pixi
  xnew(xnew.Screen, { width, height });
  xpixi.initialize();
  xpixi.connect(xthree.canvas);

  xnew(Cubes);
  xnew(Boxes);
});

function Boxes(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(width / 2, height / 2);

  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      xnew(Box, { x: 80 * x, y: 80 * y, size: 40, color: 0xEA1E63 });
    }
  }
  self.on('update', () => {
      object.rotation += 0.01;
  });
}

function Box(self, { x, y, size, color }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-size / 2, -size / 2, size, size).fill(color));

  self.on('update', () => {
    object.rotation += 0.01;
  });
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
  self.on('update', () => {
    object.rotation.y += 0.01;
    object.rotation.z += 0.01;
  });
}

function Cube(self, { x, y, z, size }) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshNormalMaterial();
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.position.set(x, y, z);

  self.on('update', () => {
      object.rotation.x += 0.01;
      object.rotation.y += 0.01;
  });
}