import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';

const CHARACTER_FILES = ['zundamon.vrm', 'usagi.vrm', 'kiritan.vrm', 'metan.vrm', 'zunko.vrm', 'sora.vrm', 'itako.vrm'];
const BAKE_FRAMES = 30;
const BAKE_SIZE = 128;

xnew(document.querySelector('#main'), Main);

function Main(unit) {
  const [width, height] = [800, 600];
  xnew.extend(xnew.basics.Screen, { aspect: width / height, fit: 'contain' });
  const canvas = xnew(`<canvas width="${width}" height="${height}" class="size-full align-bottom">`);
  xpixi.initialize({ canvas: canvas.element });
  unit.on('render', () => xpixi.renderer.render(xpixi.scene));
  xnew(Contents);
}

function Contents(unit) {
  const assets = xnew(BakedCharacters);
  let scene = xnew(LoadingScene);

  xnew.promise(assets).then(() => {
    scene.finalize();
    scene = xnew(TitleScene);
  });

  unit.on('+scenechange', ({ NextScene, props }) => {
    scene.finalize();
    scene = xnew(NextScene, props);
  });
}

// ---- Baking ----

function BakedCharacters(_unit) {
  let texturesList = null;
  xnew.promise(xnew(Baking)).then((value) => { texturesList = value; });
  xnew.then(() => xnew.resolve());
  return { get texturesList() { return texturesList; } };
}

function Baking(unit) {
  xthree.initialize({ canvas: new OffscreenCanvas(BAKE_SIZE, BAKE_SIZE) });
  xthree.camera.position.set(0, 0.2, 2.5);
  if (xthree.camera.isPerspectiveCamera) {
    xthree.camera.fov = 40;
    xthree.camera.updateProjectionMatrix();
  }

  xnew(() => {
    xthree.nest(new THREE.AmbientLight(0xFFFFFF, 1.2));
    const dirLight = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1.7));
    dirLight.position.set(2, 5, 10);
  });

  // VRMシーンを入れるGroupをnestで作成 → 非同期コールバックからはGroup.add/removeで操作
  const vrmGroup = new THREE.Group();
  xthree.scene.add(vrmGroup);
  
  const allTexturesList = [];
  let currentChar = -1;
  let currentVRM = null;
  let frameIndex = 0;
  let currentTextures = [];
  let animCount = 0;

  function loadNext() {
    currentChar++;
    if (currentChar >= CHARACTER_FILES.length) {
      xnew.resolve(allTexturesList);
      unit.finalize();
      return;
    }
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(`../../assets/${CHARACTER_FILES[currentChar]}`, (gltf) => {
      const vrm = gltf.userData.vrm;
      vrm.scene.scale.set(1, 1, 1);
      vrm.scene.position.y = -1;
      vrmGroup.add(vrm.scene); // Three.jsのGroup.add（xnewコンテキスト不要）
      currentVRM = vrm;
      frameIndex = 0;
      currentTextures = [];
      animCount = 0;
    });
  }

  loadNext();

  unit.on('render', () => {
    if (!currentVRM) return;

    // t = 0 ~ π で1ループ（全周波数6,8,12がちょうど整数サイクル完結）
    const t = animCount * (Math.PI / BAKE_FRAMES);
    bakingAnimateVRM(currentVRM, t);
    animCount++;

    xthree.renderer.render(xthree.scene, xthree.camera);
    const bitmap = xthree.canvas.transferToImageBitmap();
    currentTextures.push(PIXI.Texture.from(bitmap));
    frameIndex++;

    if (frameIndex >= BAKE_FRAMES) {
      allTexturesList.push([...currentTextures]);
      vrmGroup.remove(currentVRM.scene); // Group.remove（xnewコンテキスト不要）
      currentVRM = null;
      loadNext();
    }
  });
}

function bakingAnimateVRM(vrm, t) {
  const g = (name) => vrm.humanoid.getNormalizedBoneNode(name);
  g('neck').rotation.x          = Math.sin(t * 6)  *  0.1;
  g('chest').rotation.x         = Math.sin(t * 12) *  0.1;
  g('hips').position.z          = Math.sin(t * 12) *  0.1;
  g('leftUpperArm').rotation.z  = Math.sin(t * 12) *  0.7;
  g('leftUpperArm').rotation.x  = Math.sin(t * 6)  *  0.8;
  g('rightUpperArm').rotation.z = Math.sin(t * 12) * -0.7;
  g('rightUpperArm').rotation.x = Math.sin(t * 6)  *  0.8;
  g('leftUpperLeg').rotation.z  = Math.sin(t * 8)  *  0.2;
  g('leftUpperLeg').rotation.x  = Math.sin(t * 12) *  0.7;
  g('rightUpperLeg').rotation.z = Math.sin(t * 8)  * -0.2;
  g('rightUpperLeg').rotation.x = Math.sin(t * 12) * -0.7;
  vrm.update(t);
}

// ---- Scenes ----

function LoadingScene(unit) {
  xnew.nest('<div class="absolute w-full top-[40cqw] text-[6cqw] text-center text-blue-400 font-bold">');
  unit.element.textContent = 'Loading...';
  let count = 0;
  unit.on('update', () => unit.element.style.opacity = 0.6 + Math.sin(count++ * 0.08) * 0.4);
}

function TitleScene(unit) {
  // ★テスト表示（後で消す）
  const names = ['zundamon', 'usagi', 'kiritan', 'metan', 'zunko', 'sora', 'itako'];
  const tl = xnew.context(BakedCharacters).texturesList;
  console.log(tl)
  // 黒背景
  xpixi.nest(new PIXI.Graphics().rect(0, 0, 800, 600).fill(0x111111));

  for (let i = 0; i < tl.length; i++) {
    const x = 55 + i * 100;

    // アニメーションスプライト
    xnew((unit) => {
      const sprite = xpixi.nest(new PIXI.AnimatedSprite(tl[i]));
      sprite.position.set(x, 280);
      sprite.anchor.set(0.5);
      sprite.animationSpeed = 0.2;
      sprite.scale.set(1.2);
      sprite.play();
    });

    // キャラ名ラベル
    xnew((unit) => {
      const label = xpixi.nest(new PIXI.Text({ text: names[i], style: { fontSize: 11, fill: 0xFFFFFF } }));
      label.position.set(x, 348);
      label.anchor.set(0.5);

    });
  }

  xnew(TitleText);
  xnew(TouchMessage);
  unit.on('pointerdown', () => xnew.emit('+scenechange', { NextScene: GameScene }));
}

function GameScene(unit) {
  // Step 2以降で実装
}

// ---- UI Helpers ----

function TitleText(unit) {
  xnew.nest('<div class="absolute w-full top-[16cqw] text-[10cqw] text-center text-blue-600 font-bold">');
  xnew(StrokeText, { text: 'とーほくショット' });
}

function TouchMessage(unit) {
  xnew.nest('<div class="absolute w-full top-[30cqw] text-[6cqw] text-center text-blue-600 font-bold">');
  xnew(StrokeText, { text: 'touch start' });
  let count = 0;
  unit.on('update', () => unit.element.style.opacity = 0.6 + Math.sin(count++ * 0.08) * 0.4);
}

function StrokeText(unit, { text }) {
  const [sw, sc] = ['0.2cqw', '#EEEEEE'];
  xnew.nest(`<div style="text-shadow: -${sw} -${sw} 1px ${sc}, ${sw} -${sw} 1px ${sc}, -${sw} ${sw} 1px ${sc}, ${sw} ${sw} 1px ${sc};">`);
  unit.element.textContent = text;
}
