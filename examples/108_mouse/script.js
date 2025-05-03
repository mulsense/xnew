import xnew from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import * as THREE from 'three';

xnew('#main', Main);

function Main(self) {
  xnew(xnew.Screen, { width: 800, height: 400 });
  xthree.initalize();
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 0, +200);
  xthree.scene.rotation.x = -60 / 180 * Math.PI

  xnew(Controller);
  xnew(ThreeMain);
}

function Controller(self) {
  self.on('touchstart contextmenu wheel', (event) => event.preventDefault());

  self.on('+scale', (scale) => {
    xthree.camera.position.z /= scale;
  });
  self.on('+translate', (move) => {
    xthree.camera.position.x += move.x * xthree.camera.position.z * 0.001;
    xthree.camera.position.y += move.y * xthree.camera.position.z * 0.001;
  });
  self.on('+rotate', (move) => {
    xthree.scene.rotation.x += move.y * 0.01;
    xthree.scene.rotation.z += move.x * 0.01;
  });

  const user = xnew(xnew.UserEvent);
  let isActive = false;
  user.on('-gesturestart', () => isActive = true);
  user.on('-gestureend', () => isActive = false);
  user.on('-gesturemove', ({ scale }) => xnew.emit('+scale', scale));
  
  user.on('-dragmove', ({ event, movement }) => {
    if (isActive === true) return;
    if (event.buttons & 1 || !event.buttons) {
      xnew.emit('+rotate', { x: +movement.x, y: +movement.y });
    }
    if (event.buttons & 2) {
      xnew.emit('+translate', { x: -movement.x, y: +movement.y });
    }
  });

  user.on('-wheel', ({ delta }) => xnew.emit('+scale', 1 + 0.001 * delta.y));
}

function ThreeMain(self) {
  xnew(DirectionaLight, { x: 20, y: -50, z: 100 });
  xnew(AmbientLight);

  xnew(Ground, { size: 1000, color: 0xF8F8FF });
  xnew(Dorm, { size: 500 });
  xnew(Cube, { x: 0, y: 0, z: 20, size: 40, color: 0xAAAAFF });
}

function DirectionaLight(self, { x, y, z }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1));
  object.position.set(x, y, z);

  const s = object.position.length();
  object.castShadow = true;
  object.shadow.mapSize.width = 1024;
  object.shadow.mapSize.height = 1024;
  object.shadow.camera.left = -s * 1.0;
  object.shadow.camera.right = +s * 1.0;
  object.shadow.camera.top = -s * 1.0;
  object.shadow.camera.bottom = +s * 1.0;
  object.shadow.camera.near = +s * 0.1;
  object.shadow.camera.far = +s * 10.0;
  object.shadow.camera.updateProjectionMatrix();
}

function AmbientLight(self) {
  const object = xthree.nest(new THREE.AmbientLight(0xFFFFFF, 1));
}

function Dorm(self, { size }) {
  const geometry = new THREE.SphereGeometry(size, 25, 25);
  const material = new THREE.MeshBasicMaterial({ color: 0xEEEEFF, side: THREE.BackSide });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
}

function Ground(self, { size, color }) {
  const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color, transparent: true, });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.receiveShadow = true;
  object.material.opacity = 0.7;
}

function Cube(self, { x, y, z, size, color }) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshLambertMaterial({ color, });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.position.set(x, y, z);
  object.castShadow = true;
}