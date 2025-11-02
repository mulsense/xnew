import xnew from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import * as THREE from 'three';

xnew('#main', Main);

function Main(unit) {
  const screen = xnew(xnew.basics.Screen, { width: 800, height: 400 });
  xthree.initialize({ canvas: screen.element });
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 0, +20);
  xthree.scene.rotation.x = -60 / 180 * Math.PI

  xnew(Controller);
  xnew(ThreeMain);
}

function Controller(unit) {
  unit.on('touchstart contextmenu wheel', (event) => event.preventDefault());

  unit.on('+scale', (scale) => {
    xthree.camera.position.z /= scale;
  });
  unit.on('+translate', (move) => {
    xthree.camera.position.x += move.x * xthree.camera.position.z * 0.001;
    xthree.camera.position.y += move.y * xthree.camera.position.z * 0.001;
  });
  unit.on('+rotate', (move) => {
    xthree.scene.rotation.x += move.y * 0.01;
    xthree.scene.rotation.z += move.x * 0.01;
  });

  const user = xnew(xnew.basics.UserEvent);
  let isActive = false;
  user.on('-gesturestart', () => isActive = true);
  user.on('-gestureend', () => isActive = false);
  user.on('-gesturemove', ({ scale }) => {
    unit.emit('+scale', scale)
  });
  
  user.on('-dragmove', ({ event, delta }) => {
    if (isActive === true) return;
    if (event.buttons & 1 || !event.buttons) {
      unit.emit('+rotate', { x: +delta.x, y: +delta.y });
    }
    if (event.buttons & 2) {
      unit.emit('+translate', { x: -delta.x, y: +delta.y });
    }
  });

  user.on('-wheel', ({ delta }) => unit.emit('+scale', 1 + 0.001 * delta.y));
}

function ThreeMain(unit) {
  xnew(DirectionaLight, { x: 20, y: -50, z: 100 });
  xnew(AmbientLight);

  xnew(Ground, { size: 100, color: 0xF8F8FF });
  xnew(Dorm, { size: 50 });
  xnew(Cube, { x: 0, y: 0, z: 2, size: 4, color: 0xAAAAFF });
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
  object.material.opacity = 0.7;
}

function Cube(unit, { x, y, z, size, color }) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshLambertMaterial({ color, });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.position.set(x, y, z);
  object.castShadow = true;
}