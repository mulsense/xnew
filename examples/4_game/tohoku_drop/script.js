import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import * as THREE from 'three';
import html2canvas from 'html2canvas-pro';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';
import xmatter from '@mulsense/xnew/addons/xmatter';

xnew('#main', Main);

function Main(unit) {
  xnew.extend(xnew.basics.Screen, { width: 800, height: 600 });

  // setup three 
  xthree.initialize({ canvas: new OffscreenCanvas(unit.canvas.width, unit.canvas.height) });
  xthree.renderer.shadowMap.enabled = true;
  xthree.camera.position.set(0, 0, +10);

  // setup pixi
  xpixi.initialize({ canvas: unit.canvas });

  let scene = xnew(TitleScene);
  // let scene = xnew(ResultScene, { image: null, scores: [0, 0, 0, 0, 0, 0, 0, 0] });
  unit.on('+nextscene', (NextScene, props) => {
    scene.finalize();
    scene = xnew(NextScene, props);
  });
}

function TitleScene(unit) {
  xnew(Background);
  xnew(ShadowPlane);
  xnew(DirectionalLight, { x: 2, y: 12, z: 20 });
  xnew(AmbientLight);

  for (let id = 0; id < 7; id++) {
    const position = convert3d(140 + id * 90, 450);
    const rotation = { x: 10 / 180 * Math.PI, y: (-10 - 3 * id) / 180 * Math.PI, z: 0 };
    xnew(Model, { position, rotation, id, scale: 0.8 });
  }
  xnew(Texture, { texture: xpixi.sync(xthree.canvas) });

  unit.on('pointerdown', () => xnew.emit('+nextscene', GameScene));

  xnew(TitleText);
  xnew(TouchMessage);
  xnew('<div class="absolute right-[2cqw] bottom-[2cqw] w-[24cqw] h-[8cqw] text-stone-500">', xnew.basics.VolumeController);
}

function GameScene(unit) {
  xmatter.initialize();
  xnew.context('gamescene', { scores: [0, 0, 0, 0, 0, 0, 0, 0] });

  xnew(Background);
  xnew(ShadowPlane);
  xnew(DirectionalLight, { x: 2, y: 5, z: 10 });
  xnew(AmbientLight);
  xnew(Bowl);
  xnew(Cursor);
  xnew(Queue);
  xnew(Texture, { texture: xpixi.sync(xthree.canvas) });
  xnew(ScoreText);
  xnew('<div class="absolute right-[2cqw] bottom-[2cqw] w-[24cqw] h-[8cqw] text-stone-500">', xnew.basics.VolumeController);

  const playing = xnew((unit) => {
    xnew(Controller);
    xnew.audio.load('../assets/y015.mp3').then((music) => music.play({ fade: 1000, loop: true }));
  })
  unit.on('+append', (Component, props) => xnew(Component, props));

  // xnew.timeout(() => xnew.emit('+gameover'), 100);

  unit.on('+gameover', () => {
    unit.off('+gameover');
    playing.finalize();
    const image = xpixi.renderer.extract.base64({ target: xpixi.scene, frame: new PIXI.Rectangle(0, 0, xpixi.canvas.width, xpixi.canvas.height) });
    xnew(GameOverText);

    xnew.timeout(() => {
      const cover = xnew('<div class="absolute inset-0 size-full bg-white">');
      xnew.transition((p) => cover.element.style.opacity = p, 300, 'ease')
      .timeout(() => xnew.emit('+nextscene', ResultScene, { image, scores: xnew.context('gamescene').scores }));
    }, 2000);
  });
}

function ResultScene(unit, { image, scores }) {
  xnew.audio.load('../assets/st005.mp3').then((music) => {
    music.play({ fade: 1, loop: true });
    console.log(music);
  });

  // popup
  xnew.nest(`<div class="absolute inset-0 size-full">`);
  xnew.transition((x) => {
    Object.assign(unit.element.style, { opacity: x, transform: `scale(${0.8 + x * 0.2})` });
  }, 500, 'ease');

  xnew(ResultBackground);
  xnew(ResultImage, { image });
  xnew(ResultDetail, { scores });
  xnew(ResultFooter);
}

function Background(unit) {
  const object = xpixi.nest(new PIXI.Container());
  xnew.promise(PIXI.Assets.load('./background.jpg')).then((texture) => {
    const sprite = new PIXI.Sprite(texture);
    sprite.scale.set(xpixi.canvas.width / texture.frame.width, xpixi.canvas.height / texture.frame.height);
    object.addChild(sprite);
  });
}

function Texture(unit, { texture } = {}) {
  const object = xpixi.nest(new PIXI.Sprite(texture));
}

function TitleText(unit) {
  xnew.nest('<div class="absolute w-full top-[16cqw] text-[10cqw] text-center text-green-600 font-bold">');
  xnew(StrokeText, { text: 'とーほくドロップ' });
}

function TouchMessage(unit) {
  xnew.nest('<div class="absolute w-full top-[30cqw] text-[6cqw] text-center text-green-600 font-bold">');
  xnew(StrokeText, { text: 'touch start' });
  let count = 0;
  unit.on('-update', () => unit.element.style.opacity = 0.6 + Math.sin(count++ * 0.08) * 0.4);
}

function ScoreText(unit) {
  xnew.nest('<div class="absolute top-[1cqw] right-[2cqw] w-full text-[6cqw] text-right text-green-600 font-bold">');
  const text = xnew(StrokeText, { text: 'score 0' });
  let sum = 0;
  unit.on('+scoreup', (i) => {
    text.element.textContent = `score ${sum += Math.pow(2, i)}`;
    xnew.context('gamescene').scores[i]++;
  });
}

function GameOverText(unit) {
  xnew.nest('<div class="absolute w-full text-center text-[12cqw] text-red-400 font-bold">');
  xnew(StrokeText, { text: 'Game Over' });
  xnew.transition((p) => {
    Object.assign(unit.element.style, { opacity: p, top: `${10 + p * 15}cqw` });
  }, 1000, 'ease');
}

function ResultImage(unit, { image }) {
  xnew.nest('<div class="absolute bottom-[12cqw] left-[2cqw] size-[45cqw] rounded-[1cqw] overflow-hidden" style="box-shadow: 0 10px 30px rgba(0,0,0,0.3)">');
  const img = xnew('<img class="absolute inset-0 size-full object-cover">');
  image?.then((src) => img.element.src = src);
}

function ResultBackground(unit) {
  xnew.nest(`<div class="relative size-full bg-gradient-to-br from-stone-300 to-stone-400">`);
  xnew('<div class="absolute top-0 left-[4cqw] text-[14cqw] text-stone-400">', 'Result');
  
  // floating circle
  for (let i = 0; i < 20; i++) {
    const [x, y, size] = [Math.random() * 100, Math.random() * 100, Math.random() * 2 + 2];
    const circle = xnew(`<div class="absolute rounded-full bg-white" style="width: ${size}cqw; height: ${size}cqw; left: ${x}%; top: ${y}%; opacity: 0.2;">`);
    let p = 0;
    circle.on('-update', () => {
      Object.assign(circle.element.style, { opacity: Math.sin(p) * 0.1 + 0.2, transform: `translateY(${Math.sin(p) * 20}px)` });
      p += 0.02;
    });
  }
  // twinkle circle
  for (let i = 0; i < 30; i++) {
    const [x, y] = [Math.random() * 100, Math.random() * 100];
    const circle = xnew(`<div class="absolute rounded-full bg-white" style="width: 1cqw; height: 1cqw; left: ${x}%; top: ${y}%; opacity: 0.2;">`);
    let p = 0;
    circle.on('-update', () => {
      Object.assign(circle.element.style, { opacity: Math.sin(p) * 0.1 + 0.2, transform: `scale(${1 + Math.sin(p) * 0.1})` });
      p += 0.02;
    });
  }
}

function ResultDetail(unit, { scores }) {
  xnew.nest('<div class="absolute bottom-[12cqw] right-[2cqw] w-[50cqw] bg-gray-100 p-[1cqw] rounded-[1cqw] font-bold" style="box-shadow: 0 8px 20px rgba(0,0,0,0.2);">');
  xnew('<div class="text-[4cqw] text-center text-red-400">', '🎉 生み出した数 🎉');

  const characters = ['ずんだもん', '中国うさぎ', '東北きりたん', '四国めたん', '東北ずん子', '九州そら', '東北イタコ', '大ずんだもん'];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += scores[i] * Math.pow(2, i);
    xnew('<div class="text-[3cqw] text-green-600 text-center">', `${characters[i]}: ${Math.pow(2, i)}点 x ${scores[i]}`);
  }

  xnew('<div class="mx-[2cqw] my-[1cqw] border-t-[0.4cqw] border-dashed border-green-600">');
  xnew('<div class="text-[4cqw] text-center text-yellow-500">', `⭐ 合計スコア: ${sum} ⭐`);
  xnew('<div class="pt-[1.5cqw] px-[1cqw] flex justify-center items-center gap-x-[2cqw]">', () => {
    ['まだよわい', 'ふつう', 'すごい'].forEach((text, i) => {
      if (sum >= i * 300 && (sum < (i + 1) * 300 || i >= 2)) {
        xnew('<div class="text-[3.5cqw] text-blue-500">', text);
      } else {
        xnew('<div class="text-[2cqw] opacity-20">', text);
      }
    });
  });
}

function ResultFooter(unit) {
  xnew.nest(`<div class="absolute bottom-0 w-full h-[13cqh] px-[2cqw] flex justify-between text-stone-500">`);
  xnew('<div class="flex items-center gap-x-[2cqw]">', () => {
    const button = xnew('<div class="size-[9cqw] cursor-pointer hover:scale-110">', xnew.icons.Camera, { frame: 'circle' });
    button.on('click', () => screenShot());
    xnew('<div class="text-[3cqw] font-bold">', '画面を保存');
  });
  xnew('<div class="flex items-center gap-x-[2cqw]">', () => {
    xnew('<div class="text-[3cqw] font-bold">', '戻る');
    const button = xnew('<div class="size-[9cqw] cursor-pointer hover:scale-110">', xnew.icons.ArrowUturnLeft, { frame: 'circle' });
    button.on('click', () => xnew.emit('+nextscene', TitleScene));
  });
}

function DirectionalLight(unit, { x, y, z }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1.7));
  object.position.set(x, y, z);
  object.castShadow = true;
}

function AmbientLight(unit) {
  const object = xthree.nest(new THREE.AmbientLight(0xFFFFFF, 1.2));
}

function ShadowPlane(unit) {
  const geometry = new THREE.PlaneGeometry(16, 14);
  const material = new THREE.ShadowMaterial({ opacity: 0.25 });
  const plane = xthree.nest(new THREE.Mesh(geometry, material));
  plane.receiveShadow = true;
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(0.0, -2.9, -2.0);
}

function Controller(unit) {
  xnew.extend(xnew.basics.PointerEvent);
  unit.on('-pointermove -pointerdown', ({ position }) => {
    xnew.emit('+move', { x: position.x * xpixi.canvas.width / xpixi.canvas.clientWidth });
  });
  unit.on('-pointerdown', () => xnew.emit('+drop'));
}

function Bowl(unit) {
  for (let angle = 10; angle <= 170; angle++) {
    const x = 400 + Math.cos(angle * Math.PI / 180) * 240;
    const y = 360 + Math.sin(angle * Math.PI / 180) * 200;
    xnew(Circle, { x, y, radius: 12, color: 0x99AAAA, options: { isStatic: true } });
  }
}

function Queue(unit) {
  const balls = [...Array(4)].map(() => Math.floor(Math.random() * 3));
  xnew.emit('+relode:done', 0);

  const position = convert3d(10 + 70, 70);
  const rotation = { x: 30 / 180 * Math.PI, y: 60 / 180 * Math.PI, z: 0 };
  let model = xnew(Model, { position, rotation, id: balls[0], scale: 0.6 });

  unit.on('+reload', () => {
    const position = convert3d(10, 70);
    const rotation = { x: 30 / 180 * Math.PI, y: 60 / 180 * Math.PI, z: 0 };
    model.finalize();
    model = xnew(Model, { position, rotation, id: balls[1], scale: 0.6 });

    balls.push(Math.floor(Math.random() * 3));
    xnew.transition((p) => {
      const position = convert3d(10 + p * 70, 70);
      model.object.position.set(position.x, position.y, position.z);
    }, 500).timeout(() => xnew.emit('+relode:done', balls.shift()));
  });
}

function Model(unit, { id = 0, position = null, rotation = null, scale }) {
  const object = xthree.nest(new THREE.Object3D());
  if (position) object.position.set(position.x, position.y, position.z);
  if (rotation) object.rotation.set(rotation.x, rotation.y, rotation.z);

  const list = ['zundamon.vrm', 'usagi.vrm', 'kiritan.vrm', 'metan.vrm', 'zunko.vrm', 'sora.vrm', 'itako.vrm'];
  const path = '../assets/' + (id < 7 ? list[id] : list[0]);

  xnew.promise(new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(path, (gltf) => resolve(gltf));
  })).then((gltf) => {
    const vrm = gltf.userData.vrm;
    vrm.scene.traverse((object) => {
      if (object.isMesh) object.castShadow = object.receiveShadow = true;
    });
    vrm.scene.position.y = -scale;
    vrm.scene.scale.set(scale, scale, scale);
    object.add(vrm.scene);

    const random = Math.random() * 10;

    let count = 0;
    unit.on('-update', () => {
      const neck = vrm.humanoid.getNormalizedBoneNode('neck');
      const chest = vrm.humanoid.getNormalizedBoneNode('chest');
      const hips = vrm.humanoid.getNormalizedBoneNode('hips');
      const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
      const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
      const leftUpperLeg = vrm.humanoid.getNormalizedBoneNode('leftUpperLeg');
      const rightUpperLeg = vrm.humanoid.getNormalizedBoneNode('rightUpperLeg');
      const t = (count + random) * 0.03;
      neck.rotation.x = Math.sin(t * 6) * +0.1;
      chest.rotation.x = Math.sin(t * 12) * +0.1;
      hips.position.z = Math.sin(t * 12) * 0.1;
      leftUpperArm.rotation.z = Math.sin(t * 12 + random) * +0.7;
      leftUpperArm.rotation.x = Math.sin(t * 6 + random) * +0.8;
      rightUpperArm.rotation.z = Math.sin(t * 12) * -0.7;
      rightUpperArm.rotation.x = Math.sin(t * 6) * +0.8;
      leftUpperLeg.rotation.z = Math.sin(t * 8) * +0.2;
      leftUpperLeg.rotation.x = Math.sin(t * 12) * +0.7;
      rightUpperLeg.rotation.z = Math.sin(t * 8) * -0.2;
      rightUpperLeg.rotation.x = Math.sin(t * 12) * -0.7;
      vrm.update(t);
      count++;
    });
  });

  return { id, object }
}

function Cursor(unit) {
  const object = xpixi.nest(new PIXI.Container({ position: { x: 400, y: 40 } }));

  const graphics = new PIXI.Graphics();
  graphics.moveTo(-24, 0).lineTo(24, 0).stroke({ color: 0xE84A57, width: 12 })
  graphics.moveTo(0, -24).lineTo(0, 24).stroke({ color: 0xE84A57, width: 12 });
  object.addChild(graphics);

  unit.on('+move', ({ x }) => object.x = Math.max(Math.min(x, xpixi.canvas.width / 2 + 190), xpixi.canvas.width / 2 - 190));

  const offset = 50;
  let model = null
  unit.on('+relode:done', (id) => {
    const position = convert3d(object.x, object.y + offset);
    model = xnew(Model, { position, id, scale: 0.5 });
  });
  unit.on('+drop', () => {
    if (model !== null) {
      xnew.emit('+append', ModelBall, { x: object.x, y: object.y + offset, id: model.id });
      model.finalize();
      model = null;
      xnew.emit('+reload');
    } 
  });
  unit.on('-update', () => {
    object.rotation += 0.02;
    const position = convert3d(object.x, object.y + offset);
    model?.object.position.set(position.x, position.y, position.z);
  });
}

let prev = 0;
function ModelBall(ball, { x, y, id = 0 }) {
  const scale = [0.7, 1.0, 1.3, 1.4, 1.6, 1.8, 1.9, 1.9, 1.9][id];
  const radius = 35 + Math.pow(3.0, scale * 2.0);
  xnew.extend(Circle, { x, y, radius, color: 0, alpha: 0.0 });
  
  const now = new Date().getTime();
  if (now - prev > 200) {
    prev = now;
    const synth = xnew.audio.synthesizer({ oscillator: { type: 'triangle', envelope: { amount: 8, ADSR: [0, 500, 1, 0], }, }, filter: { type: 'bandpass', cutoff: 1000}, amp: { envelope: { amount: 1, ADSR: [20, 100, 0, 0], }, }, reverb: { time: 1000, mix: 0.2, },  });
    synth.press(['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'][id], 100);
  }

  const model = xnew(Model, { id, scale });
  xnew.emit('+scoreup', id);

  xnew.emit('+append', StarParticles, { x, y });
  
  ball.on('-update', () => {
    const position = convert3d(ball.object.x, ball.object.y);
    model.object.position.set(position.x, position.y, position.z);
    model.object.rotation.z = -ball.object.rotation;
    if (ball.object.y > xpixi.canvas.height) {
      xnew.emit('+gameover');
      ball.finalize();
      return;
    }

    // merge check
    for (const target of xnew.find(ModelBall).filter((target) => target !== ball && target.id === ball.id && target.id < 7)) {
      const [a, b] = [ball.object, target.object];
      const dist = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));

      if (dist < ball.radius + target.radius + 0.01) {
        xnew.emit('+append', ModelBall, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, id: id + 1 });
        ball.finalize();
        target.finalize();
        break;
      }
    }
  });
  return { radius, id };
}

function StarParticles(unit, { x, y }) {
  const container = xpixi.nest(new PIXI.Container({ position: { x, y } }));

  for (let i = 0; i < 5; i++) {
    const size = 12 + Math.random() * 20;
    // yellow, gold, orange, white, pink, sky blue, light green, light pink
    const color = [0xFFFF00, 0xFFD700, 0xFFA500, 0xFFFFFF, 0xFF69B4, 0x87CEEB, 0x98FB98, 0xFFB6C1][Math.floor(Math.random() * 8)];

    const graphics = new PIXI.Graphics().star(0, 0, 5, size, size * 0.5).fill(color);
    container.addChild(graphics);

    const angle = (Math.PI * 2 / 5) * i + Math.random() * 0.5;
    const speed = 1 + Math.random() * 1.5;
    let [vx, vy, va] = [Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() * 0.3 - 0.15];

    const distance = 20 + Math.random() * 15; 
    graphics.x = Math.cos(angle) * distance;
    graphics.y = Math.sin(angle) * distance;

    xnew.transition((p) => {
      vy += 0.2; // gravity
      graphics.x += vx;
      graphics.y += vy;
      graphics.rotation += va;
      graphics.alpha = 1 - p;
    }, 1600);
  }
  xnew.timeout(() => unit.finalize(), 1200);
}

function Circle(unit, { x, y, radius, color = 0xFFFFFF, alpha = 1.0, options = {} }) {
  const object = xpixi.nest(new PIXI.Container({ position: { x, y } }));
  const pyshics = xmatter.nest(Matter.Bodies.circle(x, y, radius, options));
  const graphics = new PIXI.Graphics().circle(0, 0, radius).fill(color);
  object.addChild(graphics);
  object.alpha = alpha;

  unit.on('-update', () => {
    object.rotation = pyshics.angle;
    object.position.set(pyshics.position.x, pyshics.position.y);
  });
  return { object };
}

// helpers
function StrokeText(unit, { text }) {
  const [sw, sc] = ['0.2cqw', '#EEEEEE'];
  xnew.nest(`<div style="text-shadow: -${sw} -${sw} 1px ${sc}, ${sw} -${sw} 1px ${sc}, -${sw} ${sw} 1px ${sc}, ${sw} ${sw} 1px ${sc};">`);
  unit.element.textContent = text;
}

function convert3d(x, y, z = 0) {
  return { x: (x - xpixi.canvas.width / 2) / 70, y: - (y - xpixi.canvas.height / 2) / 70, z: z };
}

function screenShot() {
  const element = xnew.find(Main)[0].element;
  xnew(element, (unit) => {
    const cover = xnew.nest('<div class="absolute inset-0 size-full z-10 bg-white">');
    xnew.transition((p) => cover.style.opacity = 1 - p, 1000)
    .timeout(() => {
      html2canvas(element, { scale: 2,  logging: false, useCORS: true }).then((canvas) => {
        const dst = document.createElement('canvas');
        dst.width = canvas.width;
        dst.height = Math.floor(canvas.height * 0.87);
        dst.getContext('2d').drawImage(canvas, 0, 0, dst.width, dst.height, 0, 0, dst.width, dst.height);

        const link = document.createElement('a');
        link.download = 'image.png';
        link.href = dst.toDataURL('image/png');
        link.click();
      });

      unit.finalize();
    });
  });
}