import xnew from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import * as THREE from 'three';

xnew(document.querySelector('#main'), Main);

function Main(unit) {
  const [width, height] = [800, 600];
  xnew.extend(xnew.basics.Screen, { aspect: width / height, fit: 'contain' });

  const canvas = xnew(`<canvas width="${width}" height="${height}" class="size-full align-bottom">`);

  // three setup
  xthree.initialize({ canvas: canvas.element });
  xthree.renderer.shadowMap.enabled = true;
  unit.on('render', () => {
    xthree.renderer.render(xthree.scene, xthree.camera);
  });

  xnew(Contents);
}

function Contents(unit) {
  xthree.camera.position.set(0, 0, +20);
  xthree.scene.rotation.x = -60 / 180 * Math.PI

  xnew(DirectionaLight, { x: 20, y: -50, z: 100 });
  xnew(AmbientLight);
  xnew(Ground, { size: 100, color: 0xF8F8FF });
  xnew(Dorm, { size: 50 });
  xnew(Cube, { x: 0, y: 0, z: 2, size: 4, color: 0xAAAAFF });

  xnew(Controller);
}

function DirectionaLight(unit, { x, y, z }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1));
  object.position.set(x, y, z);
  object.castShadow = true;
}

function AmbientLight(unit) {
  const object = xthree.nest(new THREE.AmbientLight(0xFFFFFF, 1));
}

function Dorm(unit, { size }) {
  const geometry = new THREE.SphereGeometry(size, 25, 25);
  const material = new THREE.MeshBasicMaterial({ color: 0xEEEEFF, side: THREE.BackSide });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
}

function Ground(unit, { size, color }) {
  const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color, transparent: true, });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.receiveShadow = true;
}

function Cube(unit, { x, y, z, size, color }) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshLambertMaterial({ color, });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.position.set(x, y, z);
  object.castShadow = true;
}

function Controller(unit) {
  unit.on('touchstart contextmenu wheel', ({ event }) => event.preventDefault());

  unit.on('dragmove', ({ event, delta }) => {
    if (event.buttons & 1 || !event.buttons) {
      // rotate
      xthree.scene.rotation.x += delta.y * 0.01;
      xthree.scene.rotation.z += delta.x * 0.01;
    } else if (event.buttons & 2) {
      // translate
      xthree.camera.position.x += -delta.x * xthree.camera.position.z * 0.001;
      xthree.camera.position.y += +delta.y * xthree.camera.position.z * 0.001;
    }
  });
  unit.on('wheel', ({ event, delta }) => {
    // scale
    xthree.camera.position.z /= 1 + 0.001 * delta.y;
  });
}
