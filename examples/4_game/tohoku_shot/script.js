import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';

const CHARACTER_FILES = ['zundamon.vrm', 'usagi.vrm', 'kiritan.vrm', 'metan.vrm', 'zunko.vrm', 'sora.vrm', 'itako.vrm'];
const BAKE_FRAMES = 30;

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

function BakedCharacters(_unit) {
  let texturesList = null;
  xnew.promise(xnew(Baking)).then((value) => { texturesList = value; });
  xnew.then(() => xnew.resolve());
  return { get texturesList() { return texturesList; } };
}

function Baking(unit) {
  const camera = new THREE.OrthographicCamera(-1, +1, +1, -1, 0.1, 10);
  xthree.initialize({ camera, canvas: new OffscreenCanvas(128, 128) });
  xthree.camera.position.set(0, -0.1, 2.5);

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
      vrm.scene.scale.set(0.8, 0.8, 0.8);
      vrm.scene.position.y = -1;
      vrm.scene.rotation.x = +Math.PI * 20 / 180;
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
  g('neck').rotation.x          = Math.sin(t * 8)  *  0.05;
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
  const tl = xnew.context(BakedCharacters).texturesList;
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
  }

  xnew(TitleText);
  xnew(TouchMessage);
  unit.on('pointerdown', () => xnew.emit('+scenechange', { NextScene: GameScene }));
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
      unit.on('keydown pointerdown', () => xnew.emit('+scenechange', { NextScene: TitleScene }));
    }, 1000);
  });
}

// ---- Game Components ----

function Background(_unit) {
  xpixi.nest(new PIXI.Graphics().rect(0, 0, 800, 600).fill(0x000000));
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

  const ship = new PIXI.Graphics().poly([0, -20, -14, 14, 14, 14]).fill(0x00FFFF);
  object.addChild(ship);

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
  sprite.animationSpeed = 0.2;
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
  const star = new PIXI.Graphics().star(0, 0, 5, size, size * 0.45).fill(color);
  object.addChild(star);

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
