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

  xnew.promise(assets).then(() => {
    xnew(xnew.basics.Flow).next(TitleScene);
  });
}

function BakedCharacters(_unit) {
  const texturesList = new Array(CHARACTER_FILES.length).fill(null);
  let doneCount = 0;
  const { resolve } = xnew.resolvers();

  CHARACTER_FILES.forEach((name, i) => {
    xnew.promise(xnew(Baking, { url: `../../assets/${name}` })).then((value) => {
      texturesList[i] = value.textures;
      doneCount++;
      if (doneCount === CHARACTER_FILES.length) resolve();
    });
  });

  return { get texturesList() { return texturesList; } };
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

// ---- Scenes ----

function LoadingScene(unit) {
  xnew.nest('<div class="absolute w-full top-[40cqw] text-[6cqw] text-center text-blue-400 font-bold">');
  unit.element.textContent = 'Loading...';
  let count = 0;
  unit.on('update', () => unit.element.style.opacity = 0.6 + Math.sin(count++ * 0.08) * 0.4);
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
  xnew(ScoreText);
  xnew(Player);

  unit.on('+sceneappend', ({ Component, props }) => xnew(Component, props));

  // 敵スポーン（時間経過でより強い敵が登場）
  let tick = 0;
  const spawn = xnew.interval(() => {
    tick++;
    xnew.emit('+sceneappend', { Component: Enemy, props: { id: 0 } });
    if (tick % 4  === 0) xnew.emit('+sceneappend', { Component: Enemy, props: { id: 1 } });
    if (tick % 10 === 0) xnew.emit('+sceneappend', { Component: Enemy, props: { id: 2 } });
    if (tick % 20 === 0) xnew.emit('+sceneappend', { Component: Enemy, props: { id: 3 } });
    if (tick % 35 === 0) xnew.emit('+sceneappend', { Component: Enemy, props: { id: 4 } });
    if (tick % 60 === 0) xnew.emit('+sceneappend', { Component: Enemy, props: { id: 5 } });
    if (tick % 90 === 0) xnew.emit('+sceneappend', { Component: Enemy, props: { id: 6 } });
  }, 2000);

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
  xnew(() => {
    xpixi.nest(new PIXI.Graphics().rect(0, 0, 800, 600).fill(0x000000));
  });
  for (let i = 0; i < 100; i++) xnew(Dot);
}

function Dot(unit) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(Math.random() * 800, Math.random() * 600);
  object.addChild(new PIXI.Graphics().circle(0, 0, 1).fill(0xFFFFFF));
  const velocity = Math.random() + 0.1;
  unit.on('update', () => {
    object.y += velocity;
    if (object.y > 600) object.position.set(Math.random() * 800, 0);
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

function ScoreText(unit) {
  const object = xpixi.nest(new PIXI.Text({ text: 'score 0', style: { fontSize: 28, fill: 0xFFFFFF } }));
  object.position.set(790, 10);
  object.anchor.set(1.0, 0.0);
  let sum = 0;
  unit.on('+scoreup', ({ score }) => object.text = `score ${sum += score}`);
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
  unit.on('+shot', () => xnew.emit('+sceneappend', { Component: Shot, props: { x: object.x, y: object.y } }));

  unit.on('update', () => {
    object.x = Math.min(Math.max(object.x + velocity.x * 3, 10), 790);
    object.y = Math.min(Math.max(object.y + velocity.y * 3, 10), 590);

    for (const enemy of xnew.find(Enemy)) {
      if (enemy.distance(object) < 30) {
        xnew.emit('+gameover');
        unit.finalize();
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

// id: 0=zundamon 1=usagi 2=kiritan 3=metan 4=zunko 5=sora 6=itako
// splitTo: 被弾時に分裂するキャラのid（nullなら分裂しない）
const ENEMY_DATA = [
  { score: 1,  splitTo: null },
  { score: 2,  splitTo: 0   },
  { score: 4,  splitTo: 1   },
  { score: 8,  splitTo: 2   },
  { score: 16, splitTo: 3   },
  { score: 32, splitTo: 4   },
  { score: 64, splitTo: 5   },
];

function Enemy(unit, { id, x, y, invincible = false }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x ?? (20 + Math.random() * 760), y ?? -20);

  // ベイクテクスチャでスプライト表示
  const tl = xnew.context(BakedCharacters).texturesList;
  const sprite = new PIXI.AnimatedSprite(tl[id]);
  sprite.anchor.set(0.5);
  sprite.scale.set(0.55);
  sprite.play();
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
          xnew.emit('+sceneappend', { Component: Enemy, props: { id: data.splitTo, x: object.x, y: object.y, invincible: true } });
        }
      }
      // 星（チェーンショット）
      for (let i = 0; i < 4; i++) {
        xnew.emit('+sceneappend', { Component: Star, props: { x: object.x, y: object.y, score } });
      }
      xnew.emit('+sceneappend', { Component: ScorePopup, props: { x: object.x, y: object.y, score } });
      xnew.emit('+scoreup', { score });
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
    vy += 0.15; // 重力
    object.x += vx;
    object.y += vy;
    object.rotation += 0.15;
    object.alpha = 1 - count / 60;
    count++;

    // 別の敵に当たると得点倍増
    for (const enemy of xnew.find(Enemy)) {
      if (enemy.isVulnerable && enemy.distance(object) < 28) {
        enemy.clash(score * 2, true);
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
