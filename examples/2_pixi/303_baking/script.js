import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';
import * as PIXI from 'pixi.js';
import * as THREE from 'three';

xnew(document.querySelector('#main'), Main);

function Main(unit) {
  const [width, height] = [800, 600];
  xnew.extend(xnew.basics.Screen, { aspect: width / height, fit: 'contain' });

  const canvas = xnew(`<canvas width="${width}" height="${height}" class="size-full align-bottom">`);

  // pixi setup
  xpixi.initialize({ canvas: canvas.element });
  unit.on('render', () => {
    xpixi.renderer.render(xpixi.scene);
  });

  xnew(Assets);
  xnew(Contents);
}

function Contents(unit) {
  const assets = xnew.context(Assets);
  xnew.promise(assets).then(() => {
    const sprite = xpixi.nest(new PIXI.AnimatedSprite(assets.textures));
    sprite.position.set(xpixi.canvas.width / 2, xpixi.canvas.height / 2); // center
    sprite.anchor.set(0.5);
    sprite.animationSpeed = 1;
    sprite.play();
  });
}

function Assets(unit) {
  let textures = null;
  xnew.promise(xnew(Baking)).then((value) => {
    textures = value;
  });

  xnew.then(() => xnew.resolve());
  return {
    get textures() { return textures; }
  }
}

function Baking(unit) {
  const [width, height] = [256, 256];

  // three setup
  xthree.initialize({ canvas: new OffscreenCanvas(width, height) });
  xthree.camera.position.set(0, 0, +100);

  xnew(Cubes);

  let textures = [];
  unit.on('render', () => {
    xthree.renderer.render(xthree.scene, xthree.camera);
    const bitmap = xthree.canvas.transferToImageBitmap();
    textures.push(PIXI.Texture.from(bitmap));
    if (textures.length === 60) {
      xnew.resolve(textures);
      unit.finalize();
    }
  });
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