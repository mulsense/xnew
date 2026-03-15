import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';
import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

const CHARACTER_FILES = ['zundamon.vrm', 'kiritan.vrm', 'zunko.vrm', 'itako.vrm'];

xnew(document.querySelector('#main'), Main);

function Main(unit) {
  const [width, height] = [800, 600];
  xnew.extend(xnew.basics.Screen, { width, height });

  xpixi.initialize({ canvas: unit.canvas });
  unit.on('render', () => xpixi.renderer.render(xpixi.scene));

  xnew(Contents);
}

function Contents(unit) {
  const assets = xnew(BakedCharacters);

  xnew.promise(assets).then((texturesList) => {
    xnew(ViewScene, { texturesList });
  });
}

function BakedCharacters(unit) {
  for (const name of CHARACTER_FILES) {
    xnew.promise(xnew(Baking, { url: `../../assets/${name}` })).then((value) => xnew.output({ [name]: value.textures }));
  }
}

function Baking(unit, { url }) {
  const camera = new THREE.OrthographicCamera(-1, +1, +1, -1, 0.1, 10);
  xthree.initialize({ camera, canvas: new OffscreenCanvas(128, 128) });
  xthree.camera.position.set(0, -0.1, 2.5);

  xnew(() => {
    xthree.nest(new THREE.AmbientLight(0xFFFFFF, 1.2));
  });
  xnew(() => {
    const dirLight = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1.7));
    dirLight.position.set(2, 5, 10);
  });

  const model = xnew(Model, { url });
  const textures = [];
  let frameIndex = 0;

  const { resolve } = xnew.resolvers();

  unit.on('render', () => {
    if (model.vrm === null) return;

    const BAKE_FRAMES = 600;
    const batch = 30; // Number of frames to bake per render
    for (let i = frameIndex; i < Math.min(frameIndex + batch, BAKE_FRAMES); i++) {
      const t = i * (Math.PI / BAKE_FRAMES * 3);

      model.threeObject.rotation.y = t * 4 / 3;
      model.threeObject.rotation.z = t * 2 / 3;
      const g = (name) => model.vrm.humanoid.getNormalizedBoneNode(name);
      g('neck').rotation.x          = Math.sin(t * 8)  *  0.02;
      g('chest').rotation.x         = Math.sin(t * 12) *  0.05;
      g('hips').position.z          = Math.sin(t * 12) *  0.05;
      g('leftUpperArm').rotation.z  = Math.sin(t * 12) *  0.7;
      g('leftUpperArm').rotation.x  = Math.sin(t * 6)  *  0.8;
      g('rightUpperArm').rotation.z = Math.sin(t * 12) * -0.7;
      g('rightUpperArm').rotation.x = Math.sin(t * 6)  *  0.8;
      g('leftUpperLeg').rotation.z  = Math.sin(t * 8)  *  0.2;
      g('leftUpperLeg').rotation.x  = Math.sin(t * 12) *  0.7;
      g('rightUpperLeg').rotation.z = Math.sin(t * 8)  * -0.2;
      g('rightUpperLeg').rotation.x = Math.sin(t * 12) * -0.7;
      model.vrm.update(t);

      xthree.renderer.render(xthree.scene, xthree.camera);
      textures.push(PIXI.Texture.from(xthree.canvas.transferToImageBitmap()));
    }
    frameIndex += batch;

    if (frameIndex >= BAKE_FRAMES) {
      xnew.output({ textures });
      resolve();
      unit.finalize();
    }
  });
}

function Model(unit, { url }) {
  const object = xthree.nest(new THREE.Object3D());
  const { resolve } = xnew.resolvers();

  let vrm = null;
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  loader.load(url, (gltf) => {
    vrm = gltf.userData.vrm;
    vrm.scene.scale.set(0.7, 0.7, 0.7);
    vrm.scene.position.y = -0.7;
    vrm.scene.rotation.x = +Math.PI * 20 / 180;
    object.add(vrm.scene);
    resolve();
  });
  return {
    get vrm() { return vrm; },
  }
}

function ViewScene(unit, { texturesList }) {
  const cols = 4;
  const rows = 1;
  const cellW = 800 / cols;
  const cellH = 600 / rows;

  for (let i = 0; i < Object.keys(texturesList).length; i++) {
    const key = Object.keys(texturesList)[i];
    const textures = texturesList[key];

    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = cellW * (col + 0.5);
    const y = cellH * row + cellH * 0.4;

    xnew(() => {
      const sprite = xpixi.nest(new PIXI.AnimatedSprite(textures));
      sprite.position.set(x, y);
      sprite.anchor.set(0.5);
      sprite.scale.set(1.5);
      sprite.play();
    });
  }
}
