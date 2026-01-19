import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';
import * as PIXI from 'pixi.js';
import * as THREE from 'three';

xnew('#main', Main);

function Main(unit) {
  xnew.extend(xnew.basics.Screen, { width: 800, height: 400 });
 
  // three setup
  xthree.initialize({ canvas: new OffscreenCanvas(unit.canvas.width, unit.canvas.height) });
  xthree.camera.position.set(0, 0, +100);
  const threeTexture = PIXI.Texture.from(xthree.canvas);
  unit.on('render', () => {
    xthree.renderer.render(xthree.scene, xthree.camera);
    threeTexture.source.update();
  });

  // pixi setup
  xpixi.initialize({ canvas: unit.canvas });
  unit.on('render', () => {
    xpixi.renderer.render(xpixi.scene);
  });

  xnew(Cubes);
  
  xnew(Texture, { texture: threeTexture });
  xnew(Boxes);
}

function Texture(unit, { texture } = {}) {
  const object = xpixi.nest(new PIXI.Sprite(texture));
}

function Boxes(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(xpixi.canvas.width / 2, xpixi.canvas.height / 2); // center

  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      xnew(Box, { x: 80 * x, y: 80 * y, size: 40, color: 0xEA1E63 });
    }
  }
  self.on('update', () => object.rotation += 0.01);
}

function Box(self, { x, y, size, color }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-size / 2, -size / 2, size, size).fill(color));

  self.on('update', () => object.rotation += 0.01);
}

function Cubes(unit) {
  const object = xthree.nest(new THREE.Object3D());

  for (let z = -1; z <= 1; z++) {
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        xnew(Cube, { x: 15 * x, y: 15 * y, z: 15 * z, size: 6 });
      }
    }
  }
  unit.on('update', () => {
    object.rotation.y += 0.01;
    object.rotation.z += 0.01;
  });
}

function Cube(unit, { x, y, z, size }) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshNormalMaterial();
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.position.set(x, y, z);

  unit.on('update', () => {
      object.rotation.x += 0.01;
      object.rotation.y += 0.01;
  });
}