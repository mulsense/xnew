import xnew from 'xnew';
import xthree from 'xnew/addons/xthree';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

export function Model(self, path) {
  const object = xthree.nest(new THREE.Object3D());

  let vrm = null;
  xnew.promise((resolve) => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(path, (gltf) => resolve(gltf));
  }).then((gltf) => {
    vrm = gltf.userData.vrm;
    vrm.scene.traverse((object) => {
      if (object.isMesh) object.castShadow = true;
      if (object.isMesh) object.receiveShadow = true;
    });
    object.add(vrm.scene);
  });

  const offset = Math.random() * 10;

  self.on('update', (count) => {
    const neck = vrm.humanoid.getNormalizedBoneNode('neck');
    const chest = vrm.humanoid.getNormalizedBoneNode('chest');
    const hips = vrm.humanoid.getNormalizedBoneNode('hips');
    const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
    const leftUpperLeg = vrm.humanoid.getNormalizedBoneNode('leftUpperLeg');
    const rightUpperLeg = vrm.humanoid.getNormalizedBoneNode('rightUpperLeg');
    const t = (count + offset) * 0.03;
    neck.rotation.x = Math.sin(t * 6) * +0.1;
    chest.rotation.x = Math.sin(t * 12) * +0.1;
    hips.position.z = Math.sin(t * 12) * 0.1;
    leftUpperArm.rotation.z = Math.sin(t * 12 + offset) * +0.7;
    leftUpperArm.rotation.x = Math.sin(t * 6 + offset) * +0.8;
    rightUpperArm.rotation.z = Math.sin(t * 12) * -0.7;
    rightUpperArm.rotation.x = Math.sin(t * 6) * +0.8;
    leftUpperLeg.rotation.z = Math.sin(t * 8) * +0.2;
    leftUpperLeg.rotation.x = Math.sin(t * 12) * +0.7;
    rightUpperLeg.rotation.z = Math.sin(t * 8) * -0.2;
    rightUpperLeg.rotation.x = Math.sin(t * 12) * -0.7;
    vrm.update(t);
  });

  return {
    object
  };
}
