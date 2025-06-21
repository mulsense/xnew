import xnew from 'xnew';
import xpixi from 'xnew/addons/xpixi';
import xthree from 'xnew/addons/xthree';
import * as PIXI from 'pixi.js';
import * as THREE from 'three';

const width = 800, height = 400;
xnew('#main', Main);

function Main(self) {
  const oscanvas = new OffscreenCanvas(width, height);

  // three 
  xnew((self) => {
    const renderer = new THREE.WebGLRenderer({ canvas: oscanvas, alpha: true });
    renderer.setClearColor(0x000000, 0);
    xthree.initialize({ renderer });
    xthree.camera.position.set(0, 0, +100);
    xnew(Cubes);
  });

  // pixi
  xnew((self) => {
    xnew(xnew.Screen, { width, height });
    xpixi.initialize();
    xnew(ThreeTexture, PIXI.Texture.from(oscanvas));
    xnew(Boxes);
  });
}

function ThreeTexture(self, texture) {
  const object = xpixi.nest(new PIXI.Sprite(texture));
  return {
    update() {
          object.texture.source.update()
    },
  };
}

function Boxes(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(width / 2, height / 2);

  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      xnew(Box, { x: 80 * x, y: 80 * y, size: 40, color: 0xEA1E63 });
    }
  }
  return {
    update() {
      object.rotation += 0.01;
    },
  };
}

function Box(self, { x, y, size, color }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-size / 2, -size / 2, size, size).fill(color));

  return {
    update() {
      object.rotation += 0.01;
    },
  };
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