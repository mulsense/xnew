import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import xnew from 'xnew';
import xthree from 'xnew/addons/xthree';

const width = 800, height = 600;

xnew('#main', Main);

function Main(self) {

  // three 
  xnew(xnew.Screen, { width, height });
  xthree.initialize();
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 0, +10);
  xthree.scene.rotation.x = -0 / 180 * Math.PI
  xnew(ThreeMain);
}

function ThreeMain(self) {
  xnew(DirectionaLight, { x: 2, y: 5, z: 10 });
  xnew(AmbientLight);

  xnew(Model, { x: 0, y: 0, r: 0.0, size: 2, scale: 1.0 });
}

function Model(self, { r = 0.0, size = 1, scale = 1.0 }) {
  const object = xthree.nest(new THREE.Object3D());
  object.rotation.z = -r;

  let path = './zundamon.vrm';

  let vrm = null;
  xnew.promise((resolve) => {
    const loader = new GLTFLoader();
    loader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });
    loader.load(path, (gltf) => resolve(gltf));
  }).then((gltf) => {
    vrm = gltf.userData.vrm;
    vrm.scene.traverse((object) => {
      if (object.isMesh) object.castShadow = true;
      if (object.isMesh) object.receiveShadow = true;
    });
    vrm.scene.position.y = -scale * 0.5;
    vrm.scene.scale.set(scale * 0.5, scale * 0.5, scale * 0.5);
    object.add(vrm.scene);
  });

  return {
    object,
    update(counter) {
      const neck = vrm.humanoid.getNormalizedBoneNode('neck');
      const chest = vrm.humanoid.getNormalizedBoneNode('chest');
      const hips = vrm.humanoid.getNormalizedBoneNode('hips');
      const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
      const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
      const leftUpperLeg = vrm.humanoid.getNormalizedBoneNode('leftUpperLeg');
      const rightUpperLeg = vrm.humanoid.getNormalizedBoneNode('rightUpperLeg');
      const t = counter * 0.03;
      neck.rotation.x = Math.sin(t * 6) * +0.1;
      chest.rotation.x = Math.sin(t * 12) * +0.1;
      hips.position.z = Math.sin(t * 12) * 0.1;
      leftUpperArm.rotation.z = Math.sin(t * 12) * +0.7;
      leftUpperArm.rotation.x = Math.sin(t * 6) * +0.8;
      rightUpperArm.rotation.z = Math.sin(t * 12) * -0.7;
      rightUpperArm.rotation.x = Math.sin(t * 6) * +0.8;
      leftUpperLeg.rotation.z = Math.sin(t * 8) * +0.2;
      leftUpperLeg.rotation.x = Math.sin(t * 12) * +0.8;
      rightUpperLeg.rotation.z = Math.sin(t * 8) * -0.2;
      rightUpperLeg.rotation.x = Math.sin(t * 12) * -0.8;
      vrm.update(t);
    },
    setPosition(x, y, r) {
      const cx = width / 2;
      const cy = height / 2;
      const X = (x - cx) / 70;
      const Y = - (y - cy) / 70;
      object.position.set(X, Y, 0);
      object.rotation.z = -r;
    },
  }
}

function DirectionaLight(self, { x, y, z }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 2));
  object.position.set(x, y, z);

  const s = object.position.length();
  object.castShadow = true;
  object.shadow.mapSize.width = 1024;
  object.shadow.mapSize.height = 1024;
  object.shadow.camera.left = -s * 1;
  object.shadow.camera.right = +s * 1;
  object.shadow.camera.top = -s * 1;
  object.shadow.camera.bottom = +s * 1;
  object.shadow.camera.near = +s * 0.1;
  object.shadow.camera.far = +s * 10.0;
  object.shadow.camera.updateProjectionMatrix();
}

function AmbientLight(self) {
  const object = xthree.nest(new THREE.AmbientLight(0xFFFFFF, 2));
}
