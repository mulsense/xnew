import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';
import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import html2canvas from 'html2canvas-pro';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// id: 0=zundamon 1=kiritan 2=zunko 3=itako（ずんだ因子＝敵）
const ENEMY_FILES = ['zundamon.vrm', 'kiritan.vrm', 'zunko.vrm', 'itako.vrm'];
// 自機は中国うさぎ（体内の免疫システム）。後ろ向きに表示する。
const PLAYER_FILE = 'usagi.vrm';

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
  xnew.promise(assets).then(() => {
    xnew(TitleScene);
  });
}

// ---- Character baking (VRM -> AnimatedSprite textures) ----

function BakedCharacters(_unit) {
  const texturesList = new Array(ENEMY_FILES.length).fill(null);
  let playerTextures = null;

  const total = ENEMY_FILES.length + 1;
  let doneCount = 0;
  const { resolve } = xnew.promise();

  for (let i = 0; i < ENEMY_FILES.length; i++) {
    xnew.promise(xnew(Baking, { url: `../../assets/${ENEMY_FILES[i]}`, spin: true })).then((value) => {
      texturesList[i] = value.textures;
      if (++doneCount === total) resolve();
    });
  }
  xnew.promise(xnew(Baking, { url: `../../assets/${PLAYER_FILE}`, spin: false })).then((value) => {
    playerTextures = value.textures;
    if (++doneCount === total) resolve();
  });

  return {
    get texturesList() { return texturesList; },
    get playerTextures() { return playerTextures; },
  };
}

function Baking(unit, { url, spin = true }) {
  const camera = new THREE.OrthographicCamera(-1, +1, +1, -1, 0.1, 10);
  xthree.initialize({ camera, canvas: new OffscreenCanvas(128, 128) });
  xthree.camera.position.set(0, -0.1, 2.5);

  const composer = new EffectComposer(xthree.renderer);
  composer.addPass(new RenderPass(xthree.scene, xthree.camera));
  const ssaoPass = new SSAOPass(xthree.scene, xthree.camera, xthree.canvas.width, xthree.canvas.height);
  // OrthographicCamera 用: シェーダーのデフォルトは PERSPECTIVE_CAMERA=1 のため明示的に上書き
  ssaoPass.ssaoMaterial.defines['PERSPECTIVE_CAMERA'] = 0;
  ssaoPass.ssaoMaterial.needsUpdate = true;
  ssaoPass.depthRenderMaterial.defines['PERSPECTIVE_CAMERA'] = 0;
  ssaoPass.depthRenderMaterial.needsUpdate = true;
  ssaoPass.kernelRadius = 0.15;     // サンプリング半径
  ssaoPass.minDistance = 0.001;   // 最小距離（linearized depth 0〜1 スケール）
  ssaoPass.maxDistance = 0.02;    // 最大距離
  composer.addPass(ssaoPass);
  composer.addPass(new OutputPass());

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
  const { resolve } = xnew.promise('textures');

  unit.on('render', () => {
    if (model.vrm === null) return;

    const BAKE_FRAMES = 60;
    const batch = 30; // Number of frames to bake per render
    for (let i = frameIndex; i < Math.min(frameIndex + batch, BAKE_FRAMES); i++) {
      const t = i * (Math.PI / BAKE_FRAMES * 0.3);

      if (spin) {
        model.threeObject.rotation.y = t * 4 / 3;
        model.threeObject.rotation.z = t * 2 / 3;
      } else {
        model.threeObject.rotation.x = 60 * Math.PI / 180; // 後ろ向きから少し見下ろす角度に
        model.threeObject.rotation.y = Math.PI; // 後ろ向き固定（自機）
        model.threeObject.rotation.z = 0;
      }
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

      composer.render();
      textures.push(PIXI.Texture.from(xthree.canvas.transferToImageBitmap()));
    }
    frameIndex += batch;

    if (frameIndex >= BAKE_FRAMES) {
      resolve(textures);
      unit.finalize();
    }
  });
}

function Model(_unit, { url }) {
  const object = xthree.nest(new THREE.Object3D());
  const { resolve } = xnew.promise();

  let vrm = null;
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  loader.load(url, (gltf) => {
    vrm = gltf.userData.vrm;
    vrm.scene.scale.set(0.8, 0.8, 0.8);
    vrm.scene.position.y = -1;
    vrm.scene.rotation.x = +Math.PI * 20 / 180;
    object.add(vrm.scene);
    resolve();
  });
  return { get vrm() { return vrm; } };
}

// ---- Scenes ----

function TitleScene(unit) {
  xnew.extend(xnew.basics.Scene);

  xnew(Background);

  xnew(TitleText);
  xnew(TouchMessage);
  unit.on('pointerdown', () => unit.change(GameScene));
}

function GameScene(unit) {
  xnew.extend(xnew.basics.Scene);

  xnew(Background);
  xnew(Controller);
  const scoreManager = xnew(ScoreManager);
  xnew(WaveIndicator);
  const waveManager = xnew(WaveManager);
  xnew(ScoreGauge);
  xnew(Player);

  unit.on('+gameover', () => {
    unit.off('+gameover');
    const score = scoreManager.score;
    const wave = waveManager.wave;
    const image = xpixi.renderer.extract.base64({ target: xpixi.scene, frame: new PIXI.Rectangle(0, 0, xpixi.canvas.width, xpixi.canvas.height) });
    xnew(GameOverText);
    xnew.timeout(() => unit.change(ResultScene, { image, score, wave }), 2000);
  });
}

function ResultScene(unit, { image, score, wave }) {
  xnew.extend(xnew.basics.Scene);

  // popup
  xnew.nest(`<div class="absolute inset-0 size-full">`);
  xnew.transition(({ value }) => {
    Object.assign(unit.element.style, { opacity: value, transform: `scale(${0.8 + value * 0.2})` });
  }, 500, 'ease');

  xnew(ResultBackground);
  xnew(ResultImage, { image });
  xnew(ResultDetail, { score, wave });
  xnew(ResultFooter);
}

// ---- Wave system ----

// wave1..4 のスコアしきい値（index = wave-1。wave N から N+1 へ進むしきい値は THRESHOLDS[N]）
const WAVE_THRESHOLDS = [0, 400, 1000, 2000];

function WaveManager(unit) {
  let wave = 0;

  function advance() {
    wave++;
    xnew.emit('+wave', { wave });
    xnew.context(xnew.basics.Scene).add(WaveBanner, { wave });
  }
  advance(); // wave 1 スタート

  let tick = 0;
  const spawn = xnew.interval(() => {
    // スコアしきい値で次の wave へ（wave4 到達後はエンドレス）
    if (wave < 4 && xnew.context(ScoreManager).score >= WAVE_THRESHOLDS[wave]) {
      advance();
    }
    tick++;

    const scene = xnew.context(xnew.basics.Scene);
    scene.add(Enemy, { id: 0 }); // 一番弱い敵は常に出す
    if (tick % 2 === 0) scene.add(Enemy, { id: 0 });
    if (wave >= 2 && tick % 3 === 0) scene.add(Enemy, { id: 1 });
    if (wave >= 3 && tick % 5 === 0) scene.add(Enemy, { id: 2 });
    if (wave >= 4 && tick % 8 === 0) scene.add(Enemy, { id: 3 });
  }, 200);

  unit.on('+gameover', () => spawn.clear());

  return { get wave() { return wave; } };
}

function WaveBanner(unit, { wave }) {
  xnew.nest('<div class="absolute w-full top-[38cqw] text-center text-cyan-300 font-bold">');
  xnew(xnew.basics.SVGText, { text: `Wave ${wave}`, fontSize: '14cqw', stroke: '#003344', strokeWidth: '0.3cqw', className: 'inline-block' });
  xnew.transition(({ value }) => {
    unit.element.style.opacity = Math.sin(value * Math.PI);
  }, 1400);
  xnew.timeout(() => unit.finalize(), 1400);
}

function WaveIndicator(unit) {
  xnew.nest('<div class="absolute top-[1cqw] left-[2cqw] text-left text-cyan-400 font-bold">');
  const text = xnew(xnew.basics.SVGText, { text: 'Wave 1', fontSize: '6cqw', stroke: '#003344', strokeWidth: '0.2cqw', className: 'inline-block' });
  unit.on('+wave', ({ wave }) => text.element.textContent = `Wave ${wave}`);
}

// 次の wave までのスコア進捗ゲージ（wave が変わると範囲が変わり自然にリセット）
function ScoreGauge(unit) {
  xnew.nest('<div class="absolute top-[2cqw] left-1/2 -translate-x-1/2 w-[40cqw] h-[2.2cqw] rounded-full bg-black/40 border-[0.3cqw] border-white/50 overflow-hidden">');
  const fill = xnew('<div class="h-full rounded-full bg-cyan-400" style="width: 0%;">');

  let shown = 0;
  unit.on('update', () => {
    const score = xnew.context(ScoreManager).score;
    const wave = xnew.context(WaveManager).wave;

    let target;
    if (wave >= WAVE_THRESHOLDS.length) {
      target = 1; // 最終 wave 以降（エンドレス）は満タン表示
    } else {
      const start = WAVE_THRESHOLDS[wave - 1];
      const next = WAVE_THRESHOLDS[wave];
      target = Math.max(0, Math.min(1, (score - start) / (next - start)));
    }

    shown += (target - shown) * 0.15; // イージング（wave 切替時に滑らかにリセット）
    fill.element.style.width = `${shown * 100}%`;
  });
}

// ---- Game Components ----

// 王道STG背景: 深い赤紫ベース + 中央グロー/ビネット + 浮遊粒子（パララックス） + 薄い鼓動
function Background(_unit) {
  xnew(BackgroundBase);
  for (let i = 0; i < 80; i++) xnew(Mote);
  xnew(PulseGlow);
}

function BackgroundBase(_unit) {
  const container = xpixi.nest(new PIXI.Container());

  // 深い赤紫のベタ塗り
  container.addChild(new PIXI.Graphics().rect(0, 0, 800, 600).fill(0x140309));

  // Canvas2D の放射グラデで「中央グロー + 周辺減光」を一枚のテクスチャに
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');

  const glow = ctx.createRadialGradient(400, 300, 30, 400, 320, 470);
  glow.addColorStop(0.0, 'rgba(130, 26, 50, 0.55)'); // 中央の暖かいグロー
  glow.addColorStop(0.55, 'rgba(70, 12, 30, 0.25)');
  glow.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 800, 600);

  const vignette = ctx.createRadialGradient(400, 300, 210, 400, 300, 540);
  vignette.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
  vignette.addColorStop(1.0, 'rgba(0, 0, 0, 0.6)'); // 周辺減光で視線を中央へ
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 800, 600);

  container.addChild(new PIXI.Sprite(PIXI.Texture.from(canvas)));
}

// 奥行きのある浮遊粒子。下方向ドリフトで前進感、奥ほど小さく遅く暗い。
function Mote(unit) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(Math.random() * 800, Math.random() * 600);

  const depth = Math.random(); // 0:奥 〜 1:手前
  const size = 1 + depth * 4;
  const baseAlpha = 0.08 + depth * 0.22;
  const color = [0xFF6E8A, 0xFFA7B6, 0xE8506A, 0xFFC0CB][Math.floor(Math.random() * 4)];
  object.addChild(new PIXI.Graphics().circle(0, 0, size).fill(color));

  const vy = 0.2 + depth * 0.9;
  const vx = (Math.random() - 0.5) * 0.3;
  let phase = Math.random() * Math.PI * 2;

  unit.on('update', () => {
    object.x += vx;
    object.y += vy;
    phase += 0.03;
    object.alpha = baseAlpha * (0.6 + 0.4 * Math.sin(phase)); // またたき

    if (object.y > 610) { object.y = -10; object.x = Math.random() * 800; }
    if (object.x < -10) object.x = 810;
    if (object.x > 810) object.x = -10;
  });
}

// ごく薄い鼓動グロー（体内感を残す）
function PulseGlow(unit) {
  const g = xpixi.nest(new PIXI.Graphics().rect(0, 0, 800, 600).fill(0xFF1733));
  let tick = 0;
  unit.on('update', () => {
    tick++;
    g.alpha = (Math.max(0, Math.sin(tick * 0.05)) ** 8) * 0.06;
  });
}

function Controller(unit) {
  unit.on('touchstart contextmenu wheel window.keydown', (e) => e.event?.preventDefault());

  xnew(() => {
    xnew.nest('<div class="absolute left-0 right-0 bottom-0 w-full h-[30%] pointer-events-none" style="container-type: size;">');
    xnew.nest('<div class="absolute left-0 top-0 bottom-0 w-[100cqh] h-full">');
    const dpad = xnew('<div class="absolute inset-[5cqh]">', xnew.basics.DPad, {});
    dpad.on('-down -move -up', ({ vector }) => xnew.emit('+move', { vector }));
    dpad.on('pointerdown', ({ event }) => event.stopPropagation());
  });

  unit.on('pointerdown', () => xnew.emit('+shot'));
  unit.on('window.keydown.arrow window.keyup.arrow window.keydown.wasd window.keyup.wasd', ({ vector }) => xnew.emit('+move', { vector }));
  unit.on('window.keydown', ({ event }) => { if (event.code === 'Space') xnew.emit('+shot'); });
}

function ScoreManager(unit) {
  xnew.nest('<div class="absolute top-[1cqw] right-[2cqw] text-right text-red-600 font-bold">');
  const text = xnew(xnew.basics.SVGText, { text: 'score 0', fontSize: '6cqw', stroke: '#EEEEEE', strokeWidth: '0.2cqw', className: 'inline-block' });
  let sum = 0;
  return {
    get score() { return sum; },
    add(score) {
      sum += score;
      text.element.textContent = `score ${sum}`;
    }
  };
}

function GameOverText(unit) {
  xnew.nest('<div class="absolute w-full text-center text-red-400 font-bold">');
  xnew(xnew.basics.SVGText, { text: 'Game Over', fontSize: '12cqw', stroke: '#EEEEEE', strokeWidth: '0.2cqw', className: 'inline-block' });
  xnew.transition(({ value }) => {
    Object.assign(unit.element.style, { opacity: value, top: `${10 + value * 15}cqw` });
  }, 1000, 'ease');
}

function Player(unit) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(400, 500);

  // 自機＝中国うさぎ（後ろ向きベイク）
  const sprite = new PIXI.AnimatedSprite(xnew.context(BakedCharacters).playerTextures);
  sprite.anchor.set(0.5);
  sprite.scale.set(0.7);
  sprite.animationSpeed = 1;
  sprite.play();
  object.addChild(sprite);

  let alive = true;
  let velocity = { x: 0, y: 0 };
  unit.on('+move', ({ vector }) => velocity = vector);
  unit.on('+shot', () => { if (alive) xnew.context(xnew.basics.Scene).add(Shot, { x: object.x, y: object.y }); });
  unit.on('+gameover', () => alive = false);

  unit.on('update', () => {
    if (!alive) return;
    object.x = Math.min(Math.max(object.x + velocity.x * 3, 30), 770);
    object.y = Math.min(Math.max(object.y + velocity.y * 3, 30), 570);

    for (const enemy of xnew.find(Enemy)) {
      if (enemy.isVulnerable && enemy.distance(object) < 28) {
        xnew.emit('+gameover');
        return;
      }
    }
  });
}

function Shot(unit, { x, y }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().ellipse(0, 0, 4, 24).fill(0x22FFFF));

  unit.on('update', () => {
    object.y -= 12;
    if (object.y < 0) { unit.finalize(); return; }

    for (const enemy of xnew.find(Enemy)) {
      if (enemy.distance(object) < 30) {
        enemy.clash(ENEMY_DATA[enemy.id].score);
        unit.finalize();
        return;
      }
    }
  });

  return { get pixiObject() { return object; } };
}

// ---- Enemy system ----

// splitTo: 被弾時に分裂するキャラのid（nullなら分裂しない）
const ENEMY_DATA = [
  { score: 1,  splitTo: null },
  { score: 2,  splitTo: 0   },
  { score: 4,  splitTo: 1   },
  { score: 8,  splitTo: 2   },
];

function Enemy(unit, { id, x, y, invincible = false }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x ?? (20 + Math.random() * 760), y ?? -20);

  // ベイクテクスチャでスプライト表示
  const tl = xnew.context(BakedCharacters).texturesList;
  const sprite = new PIXI.AnimatedSprite(tl[id]);
  sprite.anchor.set(0.5);
  sprite.scale.set(0.55 + id * 0.2);
  sprite.play();
  sprite.currentFrame = Math.floor(Math.random() * tl[id].length);
  object.addChild(sprite);

  // 無敵時間（分裂直後は半透明）
  let vulnerable = !invincible;
  if (invincible) {
    object.alpha = 0.5;
    xnew.timeout(() => { vulnerable = true; object.alpha = 1.0; }, 500);
  }

  // ランダムな速度（下向き成分を持つ）
  const speed = 1 + Math.random() * 2;
  const angle = Math.PI * (0.25 + Math.random() * 0.5); // 45~135度（下向き）
  const vel = { x: Math.cos(angle) * speed * (Math.random() < 0.5 ? 1 : -1), y: Math.sin(angle) * speed };

  unit.on('update', () => {
    sprite.scale.set(0.4 + id * 0.2 + object.y * 0.0008); // y座標に応じて少し大きく（遠近感）

    if (object.x < 15)  vel.x =  Math.abs(vel.x);
    if (object.x > 785) vel.x = -Math.abs(vel.x);
    if (object.y < 15)  vel.y =  Math.abs(vel.y);
    if (object.y > 585) vel.y = -Math.abs(vel.y);
    object.position.set(object.x + vel.x, object.y + vel.y);
  });

  return {
    get id() { return id; },
    get isVulnerable() { return vulnerable; },

    distance(target) {
      const dx = target.x - object.x;
      const dy = target.y - object.y;
      return Math.sqrt(dx * dx + dy * dy);
    },

    clash(score, fromStar = false) {
      if (fromStar && !vulnerable) return; // 星チェーンは無敵中スキップ

      const data = ENEMY_DATA[id];
      // 分裂
      if (data.splitTo !== null) {
        for (let i = 0; i < 2; i++) {
          xnew.context(xnew.basics.Scene).add(Enemy, { id: data.splitTo, x: object.x, y: object.y, invincible: true });
        }
      }
      // 星（チェーンショット）
      for (let i = 0; i < 2; i++) {
        xnew.context(xnew.basics.Scene).add(Star, { x: object.x, y: object.y, score });
      }
      xnew.context(xnew.basics.Scene).add(ScorePopup, { x: object.x, y: object.y, score });
      xnew.context(ScoreManager).add(score);
      unit.finalize();
    },
  };
}

function Star(unit, { x, y, score }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);

  const size = 10 + Math.random() * 8;
  const color = [0xFFFF00, 0xFFD700, 0xFFA500, 0xFFFFFF, 0xFF69B4, 0x87CEEB][Math.floor(Math.random() * 6)];
  object.addChild(new PIXI.Graphics().star(0, 0, 5, size, size * 0.45).fill(color));

  const angle = Math.random() * Math.PI * 2;
  const speed = 2 + Math.random() * 3;
  let vx = Math.cos(angle) * speed;
  let vy = Math.sin(angle) * speed;

  xnew.timeout(() => unit.finalize(), 900);

  let count = 0;
  unit.on('update', () => {
    object.x += vx;
    object.y += vy;
    object.rotation += 0.15;
    object.alpha = 1 - count / 60;
    count++;

    // 別の敵に当たると得点倍増
    for (const enemy of xnew.find(Enemy)) {
      if (enemy.isVulnerable && enemy.distance(object) < 28) {
        enemy.clash(score + 2, true);
        unit.finalize();
        return;
      }
    }
  });
}

function ScorePopup(unit, { x, y, score }) {
  const object = xpixi.nest(new PIXI.Text({ text: `+${score}`, style: { fontSize: 22, fill: 0xFFFF44, fontWeight: 'bold' } }));
  object.position.set(x, y);
  object.anchor.set(0.5);

  xnew.timeout(() => unit.finalize(), 900);
  let count = 0;
  unit.on('update', () => {
    object.y = y - 40 * (count / 60);
    object.alpha = 1 - count / 60;
    count++;
  });
}

// ---- Result screen ----

function ResultBackground(unit) {
  xnew.nest(`<div class="relative size-full bg-linear-to-br from-rose-200 to-red-300">`);
  xnew('<div class="absolute top-0 left-[4cqw] text-[14cqw] text-rose-300">', 'Result');

  // floating circle
  for (let i = 0; i < 20; i++) {
    const [x, y, size] = [Math.random() * 100, Math.random() * 100, Math.random() * 2 + 2];
    const circle = xnew(`<div class="absolute rounded-full bg-white" style="width: ${size}cqw; height: ${size}cqw; left: ${x}%; top: ${y}%; opacity: 0.2;">`);
    let p = 0;
    circle.on('update', () => {
      Object.assign(circle.element.style, { opacity: Math.sin(p) * 0.1 + 0.2, transform: `translateY(${Math.sin(p) * 20}px)` });
      p += 0.02;
    });
  }
  // twinkle circle
  for (let i = 0; i < 30; i++) {
    const [x, y] = [Math.random() * 100, Math.random() * 100];
    const circle = xnew(`<div class="absolute rounded-full bg-white" style="width: 1cqw; height: 1cqw; left: ${x}%; top: ${y}%; opacity: 0.2;">`);
    let p = 0;
    circle.on('update', () => {
      Object.assign(circle.element.style, { opacity: Math.sin(p) * 0.1 + 0.2, transform: `scale(${1 + Math.sin(p) * 0.1})` });
      p += 0.02;
    });
  }
}

function ResultImage(unit, { image }) {
  xnew.nest('<div class="absolute bottom-[12cqw] left-[2cqw] size-[45cqw] rounded-[1cqw] overflow-hidden" style="box-shadow: 0 10px 30px rgba(0,0,0,0.3)">');
  const img = xnew('<img class="absolute inset-0 size-full object-cover">');
  image?.then((src) => img.element.src = src);
}

function ResultDetail(unit, { score, wave }) {
  xnew.nest('<div class="absolute bottom-[12cqw] right-[2cqw] w-[50cqw] bg-gray-100 p-[1cqw] rounded-[1cqw] font-bold" style="box-shadow: 0 8px 20px rgba(0,0,0,0.2);">');
  xnew('<div class="text-[4cqw] text-center text-red-400">', '🦠 駆逐結果 🦠');
  xnew('<div class="text-[3.5cqw] text-center text-cyan-600 py-[0.5cqw]">', `到達ウェーブ: Wave ${wave}`);

  xnew('<div class="mx-[2cqw] my-[1cqw] border-t-[0.4cqw] border-dashed border-cyan-600">');
  xnew('<div class="text-[4cqw] text-center text-yellow-500">', `⭐ スコア: ${score} ⭐`);
  xnew('<div class="pt-[1.5cqw] px-[1cqw] flex justify-center items-center gap-x-[2cqw]">', () => {
    const tiers = [{ label: 'まだまだ', min: 0 }, { label: 'いいね', min: 300 }, { label: '免疫マスター', min: 800 }];
    let reached = 0;
    tiers.forEach((tier, i) => { if (score >= tier.min) reached = i; });
    tiers.forEach((tier, i) => {
      if (i === reached) {
        xnew('<div class="text-[3.5cqw] text-blue-500">', tier.label);
      } else {
        xnew('<div class="text-[2cqw] opacity-20">', tier.label);
      }
    });
  });
}

function ResultFooter(unit) {
  xnew.nest(`<div class="absolute bottom-0 w-full h-[13cqh] px-[2cqw] flex justify-between text-stone-500">`);
  xnew('<div class="flex items-center gap-x-[2cqw]">', () => {
    const button = xnew('<div class="relative size-[9cqw] cursor-pointer hover:scale-110">', Camera);
    button.on('click', () => xnew(ScreenShot));
    xnew('<div class="text-[3cqw] font-bold">', '画面を保存');
  });

  xnew('<div class="flex items-center gap-x-[2cqw]">', () => {
    xnew('<div class="text-[3cqw] font-bold">', '戻る');
    const button = xnew('<div class="relative size-[9cqw] cursor-pointer hover:scale-110">', ArrowUturnLeft);
    button.on('click', () => xnew.context(xnew.basics.Scene).change(TitleScene));
  });
}

function ScreenShot(unit) {
  xnew.nest(xnew.context(Main).element);
  const cover = xnew('<div class="absolute inset-0 size-full z-10 bg-white">');
  xnew.transition(({ value }) => cover.element.style.opacity = 1 - value, 1000)
  .timeout(() => {
    html2canvas(unit.element, { scale: 2, logging: false, useCORS: true }).then((canvas) => {
      xnew.image.from(canvas).crop(0, 0, canvas.width, Math.floor(canvas.height * 0.87)).download('image.png');
    });
    unit.finalize();
  });
}

// ---- UI Helpers ----

function TitleText(_unit) {
  xnew.nest('<div class="absolute w-full top-[16cqw] text-center text-blue-600 font-bold">');
  xnew(xnew.basics.SVGText, { text: 'とーほくショット', fontSize: '10cqw', stroke: '#EEEEEE', strokeWidth: '0.2cqw', className: 'inline-block' });
}

function TouchMessage(unit) {
  xnew.nest('<div class="absolute w-full top-[30cqw] text-center text-blue-600 font-bold">');
  xnew(xnew.basics.SVGText, { text: 'touch start', fontSize: '6cqw', stroke: '#EEEEEE', strokeWidth: '0.2cqw', className: 'inline-block' });
  let count = 0;
  unit.on('update', () => unit.element.style.opacity = 0.6 + Math.sin(count++ * 0.08) * 0.4);
}

function Camera(unit) {
  xnew('<div style="position: absolute; inset: 0; margin: auto; width: 100%; height: 100%;">', (unit) => {
    xnew.extend(xnew.basics.SVG, { viewBox: '0 0 24 24', stroke: 'currentColor' });
    xnew('<circle cx="12" cy="12" r="11">');
  });
  xnew('<div style="position: absolute; inset: 0; margin: auto; width: 70%; height: 70%;">', () => {
    xnew.extend(xnew.basics.SVG, { viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.5, });
    xnew('<path d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23q-.57.08-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a48 48 0 0 0-1.134-.175a2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.19 2.19 0 0 0-1.736-1.039a49 49 0 0 0-5.232 0a2.19 2.19 0 0 0-1.736 1.039z" />');
    xnew('<path d="M16.5 12.75a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0m2.25-2.25h.008v.008h-.008z" />');
  });
}

function ArrowUturnLeft(unit) {
  xnew('<div style="position: absolute; inset: 0; margin: auto; width: 100%; height: 100%;">', (unit) => {
    xnew.extend(xnew.basics.SVG, { viewBox: '0 0 24 24', stroke: 'currentColor' });
    xnew('<circle cx="12" cy="12" r="11">');
  });
  xnew('<div style="position: absolute; inset: 0; margin: auto; width: 70%; height: 70%;">', () => {
    xnew.extend(xnew.basics.SVG, { viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.5, });
    xnew('<path d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 0 1 0 12h-3" />');
  });
}
