import xnew from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import * as THREE from 'three';
import { Stage } from 'model';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { mog3d } from './mog3d.js';
let testpromise;

xnew('#main', Main);

function Main(main) {
  xnew.extend(xnew.basics.Screen, { width: 600, height: 600 });

  // three setup
  xthree.initialize({ canvas: main.canvas });
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 0, +2);
  xthree.scene.rotation.x = -60 / 180 * Math.PI

  xthree.camera.position.set(0, 0.4, +2);
  xthree.scene.rotation.x = -60 / 180 * Math.PI
  xthree.scene.rotation.z = -20 / 180 * Math.PI

  const composer = new EffectComposer(xthree.renderer);
  composer.addPass(new RenderPass(xthree.scene, xthree.camera));
  const ssaoPass = new SSAOPass(xthree.scene, xthree.camera, xthree.canvas.width, xthree.canvas.height);
  ssaoPass.kernelRadius = 0.3;      // サンプリング半径
  ssaoPass.minDistance = 0.000001;   // 最小距離
  ssaoPass.maxDistance = 0.0001;     // 最大距離
  composer.addPass(ssaoPass);
  composer.addPass(new OutputPass());

  main.off('-update');
  main.on('-update', () => { 
    composer.render();
  });

  xnew(ThreeMain);
  xnew(Controller);
}

function ThreeMain(unit) {
  xnew(DirectionaLight, { x: 1, y: -1, z: 2 });
  xnew(AmbientLight);
  xnew(Ground, { size: 100, color: 0xF8F8FF });
  xnew(Dorm, { size: 50 });
  // xnew(Cube, { x: 0, y: 0, z: 2, size: 4, color: 0xAAAAFF });

  xnew(Test, { id: 0, position: { x: 0, y: 0, z: 0 } });
  for (let i = 0; i < 0; i++) {
    const x = Math.random() * 6 - 3;
    const y = Math.random() * 6 - 3;
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
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1.25));
  object.position.set(x, y, z);
  object.castShadow = true;

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
  // object.shadow.camera.updateProjectionMatrix();
}

function AmbientLight(unit) {
  const object = xthree.nest(new THREE.AmbientLight(0xFFFFFF, 1.5));
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

function Test(unit, { position }) {
  const object = xthree.nest(new THREE.Object3D());
  if (testpromise === undefined) {
    testpromise = mog3d.load('./アルマちゃん.mog').then((mogdata) => mogdata.convertVRM())
  }
  
  xnew.promise(testpromise).then((arrayBuffer) => {
    console.log('VRM URL created:', arrayBuffer);
    xnew.promise(new Promise((resolve) => {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      loader.parse(arrayBuffer.buffer, '', (gltf) => {
        resolve(gltf);
      }, (error) => {
        console.error('Failed to load VRM:', error);
      });
    })).then((gltf) => {
      const vrm = gltf.userData.vrm;
      vrm.scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      const scene = vrm.scene;
      scene.rotation.x = Math.PI / 2;
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
      let count = 8;
      unit.on('-update', () => {
        const t = (count + random) * 0.03;
        neck.rotation.x = Math.sin(t * 6) * +0.1;
        chest.rotation.x = Math.sin(t * 12) * +0.1;
        hips.position.z = Math.sin(t * 12) * 0.02;
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

