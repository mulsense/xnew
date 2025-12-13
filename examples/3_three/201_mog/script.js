import xnew from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import * as THREE from 'three';
import { Stage } from 'model';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { mog3d } from './mog3d.js';
let testpromise;

xnew('#main', Main);

function Main(main) {
  xnew.extend(xnew.basics.Screen, { width: 800, height: 400 });

  // three setup
  xthree.initialize({ canvas: main.canvas });
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 0, +20);
  xthree.scene.rotation.x = -60 / 180 * Math.PI

  xnew(ThreeMain);
  xnew(Controller);
}

function ThreeMain(unit) {
  xnew(DirectionaLight, { x: 20, y: -50, z: 100 });
  xnew(AmbientLight);
  xnew(Ground, { size: 100, color: 0xF8F8FF });
  xnew(Dorm, { size: 50 });
  // xnew(Cube, { x: 0, y: 0, z: 2, size: 4, color: 0xAAAAFF });

  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 60 - 30;
    const y = Math.random() * 60 - 30;
    xnew(Test, { id: i, position: { x: x, y: y, z: 0 } });

  }

  // xnew(Stage, { path: 'model.mog' });

  unit.on('+scale', ({ scale }) => {
    xthree.camera.position.z /= scale;
  });
  unit.on('+translate', ({ move }) => {
    xthree.camera.position.x += move.x * xthree.camera.position.z * 0.001;
    xthree.camera.position.y += move.y * xthree.camera.position.z * 0.001;
  });
  unit.on('+rotate', ({ move }) => {
    xthree.scene.rotation.x += move.y * 0.01;
    xthree.scene.rotation.z += move.x * 0.01;
  });
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
  unit.on('touchstart contextmenu wheel', (event) => event.preventDefault());

  const pointer = xnew(xnew.basics.PointerEvent);
  let isActive = false;
  pointer.on('-gesturestart', () => isActive = true);
  pointer.on('-gestureend', () => isActive = false);
  pointer.on('-gesturemove', ({ scale }) => {
    unit.emit('+scale', { scale })
  });

  pointer.on('-dragmove', ({ event, delta }) => {
    if (isActive === true) return;
    if (event.buttons & 1 || !event.buttons) {
      unit.emit('+rotate', { move: { x: +delta.x, y: +delta.y } });
    }
    if (event.buttons & 2) {
      unit.emit('+translate', { move: { x: -delta.x, y: +delta.y } });
    }
  });
  pointer.on('-wheel', ({ delta }) => unit.emit('+scale', { scale: 1 + 0.001 * delta.y }));
}

function Test(unit, { id, position }) {
  const object = xthree.nest(new THREE.Object3D());
  if (testpromise === undefined) {
    testpromise = mog3d.load('./model.mog').then((mogdata) => mogdata.convertVRM(0.1))
  }
  
  xnew.promise(testpromise).then((vrmUrl) => {
    xnew.promise(new Promise((resolve) => {
      console.log(vrmUrl);
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      loader.load(vrmUrl, (gltf) => {
        resolve(gltf);
      }, undefined, (error) => {
        console.error('Failed to load VRM:', error);
      });
    })).then((gltf) => {
      console.log('VRM loaded:', gltf);
      const vrm = gltf.userData.vrm;
      vrm.scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      const scene = vrm.scene;
      scene.rotation.x = Math.PI / 2;
      scene.scale.setScalar(0.1);
      scene.position.set(position.x, position.y, position.z);
      object.add(scene);
      const random = Math.random() * 10;
      const neck = vrm.humanoid.getNormalizedBoneNode('neck');
      const chest = vrm.humanoid.getNormalizedBoneNode('chest');
      const hips = vrm.humanoid.getNormalizedBoneNode('hips');
      const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
      const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
      const leftUpperLeg = vrm.humanoid.getNormalizedBoneNode('leftUpperLeg');
      const rightUpperLeg = vrm.humanoid.getNormalizedBoneNode('rightUpperLeg');

      // if (id % 100 > 0) return;
      let count = 0;
      unit.on('-update', () => {
        const t = (count + random) * 0.03;
        neck.rotation.x = Math.sin(t * 6) * +0.1;
        chest.rotation.x = Math.sin(t * 12) * +0.1;
        hips.position.z = Math.sin(t * 12) * 0.1;
        leftUpperArm.rotation.z = Math.sin(t * 12 + random) * +0.7;
        leftUpperArm.rotation.x = Math.sin(t * 6 + random) * +0.8;
        rightUpperArm.rotation.z = Math.sin(t * 12) * -0.7;
        rightUpperArm.rotation.x = Math.sin(t * 6) * +0.8;
        leftUpperLeg.rotation.z = Math.sin(t * 8) * +0.2;
        leftUpperLeg.rotation.x = Math.sin(t * 12) * +0.7;
        rightUpperLeg.rotation.z = Math.sin(t * 8) * -0.2;
        rightUpperLeg.rotation.x = Math.sin(t * 12) * -0.7;
        vrm.update(t);
        count += 0.5;
      });
    });
  });

}
