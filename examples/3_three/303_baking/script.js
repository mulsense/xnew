import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';
import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';

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


  const composer = new EffectComposer(xthree.renderer);
  //composer.addPass(new RenderPass(xthree.scene, xthree.camera));
  const rpp = new RenderPixelatedPass(2, xthree.scene, xthree.camera);
  composer.addPass(rpp);
  rpp.normalEdgeStrength = 0.0;
  rpp.depthEdgeStrength = 1.0;

  // 2. 内部の FullScreenQuad に適用されているマテリアルを取得
const passMaterial = rpp.pixelatedMaterial;

// 3. 好きな色を Uniforms（シェーダーへの変数）として追加（例として赤色：0xff0000）
passMaterial.uniforms.customEdgeColor = {
    value: new THREE.Color( 0xff0000 )
};

// 4. フラグメントシェーダーをテキストとして取得
let shader = passMaterial.fragmentShader;

// 2. 変数 customEdgeColor をシェーダーの冒頭に定義（まだ無い場合のみ追加）
if (!shader.includes('uniform vec3 customEdgeColor;')) {
    shader = shader.replace(
        'void main()',
        'uniform vec3 customEdgeColor;\nvoid main()'
    );
}

// 3. 掛け算で明るさを変えている部分を、指定色（customEdgeColor）で上塗りする処理に書き換える
shader = shader.replace(
    /float Strength = dei > 0\.0 \? \(1\.0 - depthEdgeStrength \* dei\) : \(1\.0 \+ normalEdgeStrength \* nei\);\s*gl_FragColor = texel \* Strength;/g,
    `float edgeAmount = dei > 0.0 ? (depthEdgeStrength * dei) : (normalEdgeStrength * nei);
    gl_FragColor = vec4( mix( texel.rgb, customEdgeColor, clamp(edgeAmount, 0.0, 1.0) ), texel.a );`
);
// 書き換えたシェーダーをマテリアルに適用
passMaterial.fragmentShader = shader;
passMaterial.needsUpdate = true;

  const ssaoPass = new SSAOPass(xthree.scene, xthree.camera, xthree.canvas.width, xthree.canvas.height);
  // OrthographicCamera 用: シェーダーのデフォルトは PERSPECTIVE_CAMERA=1 のため明示的に上書き
  ssaoPass.ssaoMaterial.defines['PERSPECTIVE_CAMERA'] = 0;
  ssaoPass.ssaoMaterial.needsUpdate = true;
  ssaoPass.depthRenderMaterial.defines['PERSPECTIVE_CAMERA'] = 0;
  ssaoPass.depthRenderMaterial.needsUpdate = true;
  ssaoPass.kernelRadius = 0.15;     // サンプリング半径
  ssaoPass.minDistance = 0.001;   // 最小距離（linearized depth 0〜1 スケール）
  ssaoPass.maxDistance = 0.02;    // 最大距離
  // ssaoPass.output = SSAOPass.OUTPUT.Depth;  // 診断用
  composer.addPass(ssaoPass);
  composer.addPass(new OutputPass());

  xnew(() => {
    xthree.nest(new THREE.AmbientLight(0xFFFFFF, 1.2));
  });
  // xnew(() => {
  //   const dirLight = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1.7));
  //   dirLight.position.set(2, 5, 10);
  // });

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
      // g('neck').rotation.x          = Math.sin(t * 8)  *  0.02;
      // g('chest').rotation.x         = Math.sin(t * 12) *  0.05;
      // g('hips').position.z          = Math.sin(t * 12) *  0.05;
      // g('leftUpperArm').rotation.z  = Math.sin(t * 12) *  0.7;
      // g('leftUpperArm').rotation.x  = Math.sin(t * 6)  *  0.8;
      // g('rightUpperArm').rotation.z = Math.sin(t * 12) * -0.7;
      // g('rightUpperArm').rotation.x = Math.sin(t * 6)  *  0.8;
      // g('leftUpperLeg').rotation.z  = Math.sin(t * 8)  *  0.2;
      // g('leftUpperLeg').rotation.x  = Math.sin(t * 12) *  0.7;
      // g('rightUpperLeg').rotation.z = Math.sin(t * 8)  * -0.2;
      // g('rightUpperLeg').rotation.x = Math.sin(t * 12) * -0.7;
      model.vrm.update(t);

      composer.render();

      //xthree.renderer.render(xthree.scene, xthree.camera);
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
