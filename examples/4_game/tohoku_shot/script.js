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

  xnew.promise(assets).then(() => {
    xnew(xnew.basics.Flow).next(GameScene);
  });
}

function BakedCharacters(_unit) {
  const texturesList = new Array(CHARACTER_FILES.length).fill(null);
  let doneCount = 0;
  const { resolve } = xnew.resolvers();

  for (let i = 0; i < CHARACTER_FILES.length; i++) {
    const name = CHARACTER_FILES[i];
    xnew.promise(xnew(Baking, { url: `../../assets/${name}` })).then((value) => {
      texturesList[i] = value.textures;
      doneCount++;
      if (doneCount === CHARACTER_FILES.length) resolve();
    });
  }

  return { get texturesList() { return texturesList; } };
}

function Baking(unit, { url }) {
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
  // ssaoPass.output = SSAOPass.OUTPUT.Depth;  // 診断用
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

      // xthree.renderer.render(xthree.scene, xthree.camera);
      composer.render();
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

function Model(_unit, { url }) {
  const object = xthree.nest(new THREE.Object3D());
  const { resolve } = xnew.resolvers();

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

function TitleScene(unit) {
  const tl = xnew.context(BakedCharacters).texturesList;

  xnew(() => {
    xpixi.nest(new PIXI.Graphics().rect(0, 0, 800, 600).fill(0x111111));
  });

  for (let i = 0; i < tl.length; i++) {
    const x = 55 + i * 100;
    xnew(() => {
      const sprite = xpixi.nest(new PIXI.AnimatedSprite(tl[i]));
      sprite.position.set(x, 280);
      sprite.anchor.set(0.5);
      sprite.animationSpeed = 1;
      sprite.scale.set(1.2);
      sprite.play();
    });
  }

  xnew(TitleText);
  xnew(TouchMessage);
  unit.on('pointerdown', () => xnew.context(xnew.basics.Flow).next(GameScene));
}

function GameScene(unit) {
  xnew(Background);
  xnew(Controller);
  xnew(ScoreManager);
  xnew(Player);

  // 敵スポーン（時間経過でより強い敵が登場）
  let tick = 0;
  const spawn = xnew.interval(() => {
    tick++;
    xnew(Enemy, { id: 0 }); // 常に一番弱い敵は出す
    if (tick % 2  === 0) xnew(Enemy, { id: 0 });
    if (tick % 4  === 0) xnew(Enemy, { id: 1 });
    if (tick % 10 === 0) xnew(Enemy, { id: 2 });
    if (tick % 20 === 0) xnew(Enemy, { id: 3 });
  }, 200);

  unit.on('+gameover', () => {
    spawn.clear();
    xnew(GameOverText);
    xnew.timeout(() => {
      unit.on('keydown pointerdown', () => xnew.context(xnew.basics.Flow).next(TitleScene));
    }, 1000);
  });
}

// ---- Game Components ----

function Background(_unit) {
  // 暗い赤紫の背景（体内感）
  xnew(() => {
    xpixi.nest(new PIXI.Graphics().rect(0, 0, 800, 600).fill(0x120308));
  });
  xnew(BloodVessels);
  for (let i = 0; i < 25; i++) xnew(BloodCell);
  for (let i = 0; i < 60; i++) xnew(BodyParticle);
  xnew(PulseOverlay);
}

function BloodVessels(_unit) {
  const g = xpixi.nest(new PIXI.Graphics());
  const vessels = [
    [0, 120, 200, 60, 600, 180, 800, 100],
    [0, 420, 250, 490, 550, 370, 800, 460],
    [90, 0, 130, 180, 60, 420, 50, 600],
    [700, 0, 730, 200, 670, 380, 720, 600],
  ];
  for (const [x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2] of vessels) {
    g.moveTo(x1, y1).bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2).stroke({ color: 0x5A0818, width: 20, alpha: 0.55 });
  }
  for (const [x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2] of vessels) {
    g.moveTo(x1, y1).bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2).stroke({ color: 0xA02040, width: 7, alpha: 0.3 });
  }
}

function BloodCell(unit) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(Math.random() * 800, Math.random() * 600);
  const rx = 9 + Math.random() * 5;
  const ry = rx * 0.55;
  const g = new PIXI.Graphics();
  g.ellipse(0, 0, rx, ry).fill({ color: 0xCC2035, alpha: 0.75 });
  g.ellipse(0, 0, rx * 0.5, ry * 0.5).fill({ color: 0x880A1A, alpha: 0.6 });
  object.addChild(g);
  const speed = 0.25 + Math.random() * 0.45;
  const angle = Math.random() * Math.PI * 2;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed * 0.5 + 0.12;
  unit.on('update', () => {
    object.x += vx;
    object.y += vy;
    object.rotation += 0.003;
    if (object.x < -20) object.x = 820;
    if (object.x > 820) object.x = -20;
    if (object.y > 620) object.position.set(Math.random() * 800, -20);
  });
}

function BodyParticle(unit) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(Math.random() * 800, Math.random() * 600);
  const size = 1.5 + Math.random() * 2.5;
  const colors = [0xFF6688, 0xFF8855, 0xDD3355, 0xFF99AA, 0xCC2244];
  const color = colors[Math.floor(Math.random() * colors.length)];
  object.addChild(new PIXI.Graphics().circle(0, 0, size).fill({ color, alpha: 0.5 }));
  const speed = 0.2 + Math.random() * 0.7;
  const vx = (Math.random() - 0.5) * speed * 0.5;
  const vy = speed * 0.6;
  unit.on('update', () => {
    object.x += vx;
    object.y += vy;
    if (object.y > 610) object.position.set(Math.random() * 800, -10);
    if (object.x < -10) object.x = 810;
    if (object.x > 810) object.x = -10;
  });
}

function PulseOverlay(unit) {
  const g = xpixi.nest(new PIXI.Graphics().rect(0, 0, 800, 600).fill(0xFF1133));
  let tick = 0;
  unit.on('update', () => {
    tick++;
    g.alpha = (Math.max(0, Math.sin(tick * 0.06)) ** 6) * 0.1;
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
  xnew.nest('<div class="absolute top-[1cqw] right-[2cqw] w-full text-[6cqw] text-right text-red-600 font-bold">');
  const text = xnew(StrokeText, { text: 'score 0' });
  let sum = 0;
  return {
    add(score) {
      sum += score;
      text.element.textContent = `score ${sum += score}`;
    }
  }
}

function GameOverText(_unit) {
  const object = xpixi.nest(new PIXI.Text({ text: 'game over', style: { fontSize: 48, fill: 0xFF4444 } }));
  object.position.set(400, 300);
  object.anchor.set(0.5);
}

function Player(unit) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(400, 500);
  object.addChild(new PIXI.Graphics().poly([0, -20, -14, 14, 14, 14]).fill(0x00FFFF));

  let velocity = { x: 0, y: 0 };
  unit.on('+move', ({ vector }) => velocity = vector);
  unit.on('+shot', () => xnew.context(xnew.basics.Scene).append(Shot, { x: object.x, y: object.y }));

  unit.on('update', () => {
    object.x = Math.min(Math.max(object.x + velocity.x * 3, 10), 790);
    object.y = Math.min(Math.max(object.y + velocity.y * 3, 10), 590);

    for (const enemy of xnew.find(Enemy)) {
      // if (enemy.distance(object) < 30) {
      //   xnew.emit('+gameover');
      //   unit.finalize();
      //   return;
      // }
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

// id: 0=zundamon 1=kiritan 2=zunko 3=itako
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
          xnew.context(xnew.basics.Scene).append(Enemy, { id: data.splitTo, x: object.x, y: object.y, invincible: true });
        }
      }
      // 星（チェーンショット）
      for (let i = 0; i < 2; i++) {
        xnew.context(xnew.basics.Scene).append(Star, { x: object.x, y: object.y, score });
      }
      xnew.context(xnew.basics.Scene).append(ScorePopup, { x: object.x, y: object.y, score });
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

// ---- UI Helpers ----

function TitleText(_unit) {
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
