import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';
import xmatter from '@mulsense/xnew/addons/xmatter';

xnew('#main', Main);

function Main(main) {
  xnew.extend(xnew.basics.Screen, { width: 800, height: 600 });

  // setup three 
  xthree.initialize({ canvas: new OffscreenCanvas(main.canvas.width, main.canvas.height) });
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 0, +10);

  // setup pixi
  xpixi.initialize({ canvas: main.canvas });

  xnew(TitleScene);
}

function TitleScene(scene) {
  xnew(Background);
  xnew(ShadowPlane);
  xnew(DirectionalLight, { x: 2, y: 12, z: 20 });
  xnew(AmbientLight);

  for (let i = 0; i < 7; i++) {
    const position = pos3d(140 + i * 90, 450);
    const rotation = { x: 10 / 180 * Math.PI, y: (-10 - 3 * i) / 180 * Math.PI, z: 0 };
    xnew(Model, { position, rotation, id: i, scale: 0.8 });
  }
  xnew(Texture, { texture: xpixi.sync(xthree.canvas) });

  scene.on('pointerdown', () => {
    scene.finalize();
    xnew.find(Main)[0]?.append(GameScene);
  });
  xnew(TitleText);
  xnew(TouchMessage);
}

function GameScene(scene) {
  xnew.context('result', { counts: [0, 0, 0, 0, 0, 0, 0, 0] });
  xmatter.initialize();

  xnew(Background);
  xnew(ShadowPlane);
  xnew(DirectionalLight, { x: 2, y: 5, z: 10 });
  xnew(AmbientLight);
  xnew(Bowl);
  xnew(Cursor);
  xnew(Queue);
  xnew(Texture, { texture: xpixi.sync(xthree.canvas) });
  xnew(Controller);
  xnew(ScoreText);

  xnew.timeout(() => {
    scene.emit('+gameover');
  }, 100);
  scene.on('+gameover', () => {
    scene.off('+gameover');
    xnew(GameOverText);
    const cover = xnew('<div class="absolute inset-0 w-full h-full bg-white">');
    cover.element.style.opacity = 0.0;
    const image = xpixi.capture();
    const result = xnew.context('result');

    xnew.timeout(() => {
      xnew.transition((p) => cover.element.style.opacity = p, 1, 'ease')
      .timeout(() => {
        scene.finalize();
        xnew.find(Main)[0]?.append(ResultScene, { image, result });
      });
    }, 1);
  });

}

function ResultScene(scene, { image, result }) {

  xnew.nest(`<div
    class="absolute inset-0 w-full h-full 
    text-gray-800 font-bold border-[0.2cqw] rounded-[1cqw] border-gray-400
    bg-gradient-to-br from-gray-300 to-gray-400 overflow-hidden"
    style="container-type: size;">
  >`);
  xnew('<div class="absolute top-0 left-[2cqw] text-[10cqw] text-gray-400">', 'Result');
  xnew('<div class="absolute top-[8cqw] bottom-0 m-auto left-[2cqw] w-[45cqw] h-[45cqw] rounded-[1cqw] overflow-hidden border-[0.3cqw] border-white/50" style="box-shadow: 0 10px 30px rgba(0,0,0,0.3), inset 0 0 20px rgba(255,255,255,0.2);">', () => {
    const img = xnew('<img class="w-full h-full object-cover">');
    img.element.src = image;
  });

  // float
  xnew('<div class="absolute inset-0 w-full h-full pointer-events-none" style="opacity: 0.3;">', () => {
    for (let i = 0; i < 20; i++) {
      const size = Math.random() * 30 + 10;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const duration = Math.random() * 5000 + 3000;

      xnew(`<div
        class="absolute rounded-full bg-white opacity-60"
        style="width: ${size}px; height: ${size}px; left: ${x}%; top: ${y}%; animation: float ${duration}ms ease-in-out infinite;"
        >`);
    }
  });

  // twinkle
  xnew('<div class="absolute inset-0 w-full h-full pointer-events-none" style="opacity: 0.4;">', () => {
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const duration = Math.random() * 3000 + 2000;

      xnew(`<div 
        class="absolute w-[1cqw] h-[1cqw] rounded-full" 
        style="background: radial-gradient(circle, #ffff99 0%, rgba(255,255,255,0) 70%);
        left: ${x}%;
        top: ${y}%;
        animation: twinkle ${duration}ms ease-in-out infinite;
      ">`);
    }
  });


  // スコアの内訳を表示
  xnew('<div class="absolute top-[8cqw] bottom-0 right-[2cqw] w-[50cqw] text-green-600 flex items-center">', () => {
    xnew.nest('<div class="w-full" style="background: rgba(255, 255, 255, 0.9); padding: 2cqw; border-radius: 1cqw; box-shadow: 0 8px 20px rgba(0,0,0,0.2);">');
    xnew('<div class="w-full text-[4cqw] mb-[1cqw] text-center" style="color: #ff6b6b;">', '🎉 生み出した数 🎉');

    const characters = ['ずんだもん', '中国うさぎ', '東北きりたん', '四国めたん', '東北ずん子', '九州そら', '東北イタコ', '大ずんだもん'];
    let totalScore = 0;
    for (let i = 0; i < 8; i++) {
      if (result.counts[i] >= 0) {
        const score = result.counts[i] * Math.pow(2, i);
        totalScore += score;
        xnew('<div class="w-full text-[3cqw] text-center">', (text) => {
          text.element.textContent = `${characters[i]}: ${Math.pow(2, i)}点 x ${result.counts[i]}`;
        });
      }
    }

    xnew('<div class="w-full text-[4cqw] mt-[1cqw] border-t-[0.4cqw] text-center border-green-600" style="font-weight: bold; color: #ffa500;">', `⭐ 合計スコア: ${totalScore} ⭐`);
  });

  xnew('<div class="absolute text-center top-[3cqw] right-[2cqw] pointer-events-auto">', () => {
    const div = xnew('<div class="w-[8cqw] h-[8cqw] rounded-full border-[0.3cqw] border-gray-500 cursor-pointer">', () => {
      xnew('<div class="absolute inset-0 m-auto w-[4cqw] h-[0.5cqw] border-gray-500 border-[0.3cqw]" style="transform-origin: center; transform: rotate(+45deg);" >');
      xnew('<div class="absolute inset-0 m-auto w-[4cqw] h-[0.5cqw] border-gray-500 border-[0.3cqw]" style="transform-origin: center; transform: rotate(-45deg);" >');
    });

    div.on('click', () => {
      scene.finalize();
      xnew.find(Main)[0]?.append(TitleScene);
    });
    div.on('mouseover', () => div.element.style.transform = 'scale(1.1)');
    div.on('mouseout', () => div.element.style.transform = 'scale(1)');
  });

  const style = document.createElement('style');
  style.textContent = `
    @keyframes float {
      0%, 100% { transform: translateY(0px); opacity: 0.3; }
      50% { transform: translateY(-30px); opacity: 0.8; }
    }
    @keyframes twinkle {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.5); }
    }
  `;
  document.head.appendChild(style);

  xnew.transition((x) => {
    scene.element.style.opacity = x;
    scene.element.style.transform = `scale(${0.8 + x * 0.2})`;
  }, 500, 'ease');
}

function Background(unit) {
  const object = xpixi.nest(new PIXI.Container());
  xnew.promise(PIXI.Assets.load('./background.jpg')).then((texture) => {
    const sprite = new PIXI.Sprite(texture);
    sprite.scale.set(xpixi.canvas.width / texture.frame.width, xpixi.canvas.height / texture.frame.height);
    object.addChild(sprite);
  });
}

function ShadowPlane(unit) {
  const geometry = new THREE.PlaneGeometry(16, 14);
  const material = new THREE.ShadowMaterial({ opacity: 0.25 });
  const plane = xthree.nest(new THREE.Mesh(geometry, material));
  plane.receiveShadow = true;
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(0.0, -2.9, -2.0);
}

function Texture(unit, { texture } = {}) {
  const object = xpixi.nest(new PIXI.Sprite(texture));
}

function Text(unit, { text, strokeWidth, strokeColor }) {
  xnew.nest(`<div
    style="
    text-shadow: -${strokeWidth} -${strokeWidth} 1px ${strokeColor}, ${strokeWidth} -${strokeWidth} 1px ${strokeColor}, -${strokeWidth} ${strokeWidth} 1px ${strokeColor}, ${strokeWidth} ${strokeWidth} 1px ${strokeColor};
    ">`);
  unit.element.textContent = text;
}

function TitleText(text) {
  xnew.nest('<div class="absolute inset-0 w-full h-full pointer-events-none text-green-800" style="container-type: size;">');
  xnew.nest('<div class="absolute w-full top-[16cqw] text-[10cqw] text-center font-bold">');
  xnew(Text, { text: 'とーほく ドロップ', strokeWidth: '0.2cqw', strokeColor: 'white' });
}

function TouchMessage(unit) {
  xnew.nest('<div class="absolute inset-0 w-full h-full pointer-events-none text-green-800" style="container-type: size;">');
  xnew.nest('<div class="absolute w-full top-[30cqw] text-[6cqw] text-center font-bold">');
  const text = xnew(Text, { text: 'touch start', strokeWidth: '0.2cqw', strokeColor: 'white' });
  let count = 0;
  unit.on('update', () => text.element.style.opacity = 0.6 + Math.sin(count++ * 0.08) * 0.4);
}

function DirectionalLight(unit, { x, y, z }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1.7));
  object.position.set(x, y, z);
  object.castShadow = true;
}

function AmbientLight(unit) {
  const object = xthree.nest(new THREE.AmbientLight(0xFFFFFF, 1.2));
}

function Controller(unit) {
  const pointer = xnew(xpixi.canvas, xnew.basics.PointerEvent);
  pointer.on('-pointermove -pointerdown', ({ position }) => {
    unit.emit('+move', { x: position.x * xpixi.canvas.width / xpixi.canvas.clientWidth });
  });
  pointer.on('-pointerdown', () => unit.emit('+drop'));
}

function ScoreText(unit) {
  xnew.nest(`<div class="absolute inset-0 w-full h-full pointer-events-none" style="container-type: size;">`);
  xnew.nest('<div class="absolute top-[1cqw] right-[2cqw] w-full text-[6cqw] text-right font-bold text-green-800">');
  const text = xnew(Text, { text: 'score 0', strokeWidth: '0.2cqw', strokeColor: 'white' });
  let sum = 0;
  unit.on('+scoreup', (score) => text.element.textContent = `score ${sum += score}`);
}

function Bowl(unit) {
  for (let angle = 10; angle <= 170; angle++) {
    const x = 400 + Math.cos(angle * Math.PI / 180) * 240;
    const y = 360 + Math.sin(angle * Math.PI / 180) * 200;
    xnew(Circle, { x, y, radius: 12, color: 0x00AAAA, options: { isStatic: true } });
  }
}

function Queue(queue) {
  const balls = [...Array(4)].map(() => Math.floor(Math.random() * 3));
  queue.emit('+reloadcomplete', 0);

  const position = pos3d(10 + 70, 70);
  const rotation = { x: 30 / 180 * Math.PI, y: 60 / 180 * Math.PI, z: 0 };
  let model = xnew(Model, { position, rotation, id: balls[0], scale: 0.6 });

  queue.on('+reload', () => {
    const next = balls.shift();
    model.finalize();
    const position = pos3d(10, 70);
    const rotation = { x: 30 / 180 * Math.PI, y: 60 / 180 * Math.PI, z: 0 };
    model = xnew(Model, { position, rotation, id: balls[0], scale: 0.6 });

    balls.push(Math.floor(Math.random() * 3));
    xnew.transition((p) => {
      const position = pos3d(10 + p * 70, 70);
      model.object.position.set(position.x, position.y, position.z);
    }, 500).timeout(() => {
      queue.emit('+reloadcomplete', next);
    });
  });
}

function Model(unit, { id = 0, position = null, rotation = null, scale }) {
  const object = xthree.nest(new THREE.Object3D());
  if (position) object.position.set(position.x, position.y, position.z);
  if (rotation) object.rotation.set(rotation.x, rotation.y, rotation.z);

  const list = ['zundamon.vrm', 'usagi.vrm', 'kiritan.vrm', 'metan.vrm', 'zunko.vrm', 'sora.vrm', 'itako.vrm'];
  const path = '../assets/' + (id < 7 ? list[id] : list[0]);

  let vrm = null;
  xnew.promise(new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(path, (gltf) => resolve(gltf));
  })).then((gltf) => {
    vrm = gltf.userData.vrm;
    vrm.scene.traverse((object) => {
      if (object.isMesh) object.castShadow = object.receiveShadow = true;
    });
    vrm.scene.position.y = -scale;
    vrm.scene.scale.set(scale, scale, scale);
    object.add(vrm.scene);
  });

  const random = Math.random() * 10;

  let count = 0;
  unit.on('update', () => {
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

  return { id, object }
}

function Cursor(unit) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(400, 40);

  const graphics = new PIXI.Graphics();
  graphics.moveTo(-16, 0).lineTo(16, 0).stroke({ color: 0xE84A57, width: 8 })
  graphics.moveTo(0, -16).lineTo(0, 16).stroke({ color: 0xE84A57, width: 8 });
  object.addChild(graphics);

  unit.on('+move', ({ x }) => object.x = Math.max(Math.min(x, xpixi.canvas.width / 2 + 190), xpixi.canvas.width / 2 - 190));

  const offset = 50;
  let model = null
  unit.on('+reloadcomplete', (id) => {
    const position = pos3d(object.x, object.y + offset);
    model = xnew(Model, { position, id, scale: 0.5 });
  });
  unit.on('+drop', () => {
    if (model !== null) {
      xnew.find(GameScene)[0]?.append(ModelBall, { x: object.x, y: object.y + offset, id: model.id });
      model.finalize();
      model = null;
      unit.emit('+reload');
    } 
  });
  unit.on('update', () => {
    object.rotation += 0.02;
    const position = pos3d(object.x, object.y + offset);
    model?.object.position.set(position.x, position.y, position.z);
  });
}

function ModelBall(ball, { x, y, id = 0 }) {
  const result = xnew.context('result');
  result.counts[id] += 1;

  const scale = [0.7, 1.0, 1.3, 1.4, 1.6, 1.8, 1.9, 1.9, 1.9][id];
  const radius = 35 + Math.pow(3.0, scale * 2.0);
  xnew.extend(Circle, { x, y, radius, color: 0, alpha: 0.0 });
  
  const model = xnew(Model, { id, scale });
  ball.emit('+scoreup', Math.pow(2, id));
  
  ball.on('update', () => {
    const position = pos3d(ball.object.x, ball.object.y);
    model.object.position.set(position.x, position.y, position.z);
    model.object.rotation.z = -ball.object.rotation;
    if (ball.object.y > xpixi.canvas.height - 10) {
      ball.emit('+gameover');
      ball.finalize();
      return;
    }

    // merge check
    for (const target of xnew.find(ModelBall).filter((target) => target !== ball && target.id === ball.id)) {
      const [a, b] = [ball.object, target.object];
      const dist = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));

      if (dist < ball.radius + target.radius + 0.01) {
        ball.finalize();
        target.finalize();
        xnew.find(GameScene)[0]?.append(ModelBall, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, id: id + 1 });
        break;
      }
    }
  });
  return { radius, id };
}

function GameOverText(text) {
  xnew.nest(`<div class="absolute inset-0 w-full h-full pointer-events-none" style="container-type: size;">`);
  xnew.nest('<div class="absolute w-full text-center text-[7cqw] font-bold">');
  text.element.textContent = 'Game Over';
  xnew.transition((x) => {
    text.element.style.opacity = x;
    text.element.style.top = `${20 + x * 10}cqw`;
  }, 1000, 'ease');
}

function Circle(unit, { x, y, radius, color = 0xFFFFFF, alpha = 1.0, options = {} }) {
  const object = xpixi.nest(new PIXI.Container());
  const pyshics = xmatter.nest(Matter.Bodies.circle(x, y, radius, options));
  const graphics = new PIXI.Graphics().circle(0, 0, radius).fill(color);
  object.position.set(x, y);
  object.addChild(graphics);
  object.alpha = alpha;

  unit.on('update', () => {
    object.rotation = pyshics.angle;
    object.position.set(pyshics.position.x, pyshics.position.y);
  });
  return { object };
}

// helpers
function pos3d(x, y, z = 0) {
  return { x: (x - xpixi.canvas.width / 2) / 70, y: - (y - xpixi.canvas.height / 2) / 70, z: z };
}