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

  // xnew.audio.load('../assets/b096.mp3').then((music) => {
  //   music.play({ fade: 1000 });
  // });
}

function TitleScene(scene) {
  xnew(Background);
  xnew(ShadowPlane);
  xnew(DirectionalLight, { x: 2, y: 12, z: 20 });
  xnew(AmbientLight);

  for (let i = 0; i < 7; i++) {
    const position = convert3d(140 + i * 90, 450);
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
  xmatter.initialize();

  xnew(Background);
  xnew(ShadowPlane);
  xnew(DirectionalLight, { x: 2, y: 5, z: 10 });
  xnew(AmbientLight);
  xnew(Bowl);
  xnew(Cursor);
  xnew(Queue);
  xnew(Texture, { texture: xpixi.sync(xthree.canvas) });
  const controller = xnew(Controller);
  xnew(ScoreText);

  let scores = [0, 0, 0, 0, 0, 0, 0, 0];
  scene.on('+scoreup', (i) => scores[i]++);

  // xnew.timeout(() => {
  //   scene.emit('+gameover');
  // }, 1100);
  scene.on('+gameover', () => {
    controller.finalize();
    scene.off('+gameover');
    xnew(GameOverText);
    const image = xpixi.renderer.extract.base64({
      target: xpixi.scene, 
      format: 'png',
      frame: new PIXI.Rectangle(0, 0, xpixi.canvas.width, xpixi.canvas.height)
    });

    xnew.timeout(() => {
      const cover = xnew('<div class="absolute inset-0 w-full h-full bg-white">');
      xnew.transition((p) => cover.element.style.opacity = p, 300, 'ease')
      .timeout(() => {
        scene.finalize();
        xnew.find(Main)[0]?.append(ResultScene, { image, scores });
      });
    }, 2000);
  });

}

function ResultScene(scene, { image, scores }) {
  xnew.nest(`<div class="absolute inset-0 w-full h-full pointer-events-none" style="container-type: size;">`);
  xnew.nest(`<div class="relative w-full h-full bg-gradient-to-br from-stone-300 to-stone-400 overflow-hidden">`);
  
  xnew('<div class="absolute top-0 left-[2cqw] text-[12cqw] text-stone-400">', 'Result');
  const img = xnew(`<img 
    class="absolute top-[8cqw] bottom-0 m-auto left-[2cqw] w-[45cqw] h-[45cqw] rounded-[1cqw] overflow-hidden border-[0.3cqw] border-stone-400 object-cover"
    style="box-shadow: 0 10px 30px rgba(0,0,0,0.3)"
    >`);
  image.then((src) => {
    img.element.src = src;
  })

  xnew('<div class="absolute text-center top-[3cqw] right-[2cqw] pointer-events-auto flex flex-col gap-[1cqw]">', () => {
    // X Share Button
    // const xButton = xnew('<div class="w-[8cqw] h-[8cqw] rounded-full bg-black cursor-pointer flex items-center justify-center">', () => {
    //   xnew('<div class="text-[4cqw]">', '𝕏');
    // });
    // xButton.on('click', () => {
    //   let sum = 0;
    //   for (let i = 0; i < 8; i++) {
    //     sum += scores[i] * Math.pow(2, i);
    //   }
    //   const characters = ['ずんだもん', '中国うさぎ', '東北きりたん', '四国めたん', '東北ずん子', '九州そら', '東北イタコ', '大ずんだもん'];
    //   let scoreText = '🎉 とーほく ドロップ 🎉\n';
    //   for (let i = 0; i < 8; i++) {
    //     if (scores[i] > 0) {
    //       scoreText += `${characters[i]}: ${Math.pow(2, i)}点 x ${scores[i]}\n`;
    //     }
    //   }
    //   scoreText += `⭐ 合計スコア: ${sum} ⭐\n`;
    //   scoreText += '#とーほくドロップ';

    //   image.then((src) => {
    //     // base64 画像をBlobに変換
    //     const binaryString = atob(src.split(',')[1]);
    //     const bytes = new Uint8Array(binaryString.length);
    //     for (let i = 0; i < binaryString.length; i++) {
    //       bytes[i] = binaryString.charCodeAt(i);
    //     }
    //     const blob = new Blob([bytes], { type: 'image/png' });

    //     // クリップボードに画像とテキストをコピー
    //     navigator.clipboard.write([
    //       new ClipboardItem({
    //         'image/png': blob,
    //         'text/plain': new Blob([scoreText], { type: 'text/plain' })
    //       })
    //     ]).then(() => {
    //       // X投稿画面を開く
    //       const text = encodeURIComponent(scoreText);
    //       const xUrl = `https://twitter.com/intent/tweet?text=${text}`;
    //       window.open(xUrl, '_blank');

    //       // 成功メッセージを表示（オプション）
    //       alert('画像とスコアをクリップボードにコピーしました！\nX（Twitter）の投稿画面に貼り付けてください。');
    //     }).catch((err) => {
    //       // クリップボードコピー失敗時は画像ダウンロード
    //       console.log('クリップボードコピー失敗。画像をダウンロードします:', err);
    //       const link = document.createElement('a');
    //       link.href = src;
    //       link.download = 'game-result.png';
    //       link.click();

    //       // X投稿画面を開く
    //       const text = encodeURIComponent(scoreText);
    //       const xUrl = `https://twitter.com/intent/tweet?text=${text}`;
    //       window.open(xUrl, '_blank');
    //     });
    //   });
    // });
    // xButton.on('mouseover', () => xButton.element.style.transform = 'scale(1.1)');
    // xButton.on('mouseout', () => xButton.element.style.transform = 'scale(1)');

    // Close Button
    const div = xnew('<div class="w-[8cqw] h-[8cqw] rounded-full border-[0.3cqw] border-stone-500 cursor-pointer">', () => {
      xnew('<div class="absolute inset-0 m-auto w-[4cqw] h-[0.5cqw] border-stone-500 border-[0.3cqw]" style="transform-origin: center; transform: rotate(+45deg);" >');
      xnew('<div class="absolute inset-0 m-auto w-[4cqw] h-[0.5cqw] border-stone-500 border-[0.3cqw]" style="transform-origin: center; transform: rotate(-45deg);" >');
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

  xnew('<div class="absolute inset-0 w-full h-full pointer-events-none" style="opacity: 0.3;">', () => {
    // float
    for (let i = 0; i < 20; i++) {
      const size = Math.random() * 30 + 10;
      const [x, y] = [Math.random() * 100, Math.random() * 100];
      const duration = Math.random() * 5000 + 3000;

      xnew(`<div class="absolute rounded-full bg-white opacity-60"
        style="width: ${size}px; height: ${size}px; left: ${x}%; top: ${y}%; animation: float ${duration}ms ease-in-out infinite;"
        >`);
    }
    // twinkle
    for (let i = 0; i < 30; i++) {
      const [x, y] = [Math.random() * 100, Math.random() * 100];
      const duration = Math.random() * 3000 + 2000;

      xnew(`<div class="absolute w-[1cqw] h-[1cqw] rounded-full bg-white opacity-60" 
        style="left: ${x}%; top: ${y}%; animation: twinkle ${duration}ms ease-in-out infinite;"
        >`);
    }
  });

  xnew('<div class="absolute top-[8cqw] bottom-0 right-[2cqw] w-[50cqw] text-green-600 flex items-center">', () => {
    xnew.nest('<div class="w-full bg-gray-100 p-[2cqw] rounded-[1cqw] font-bold" style="box-shadow: 0 8px 20px rgba(0,0,0,0.2);">');
    xnew('<div class="w-full text-[4cqw] mb-[1cqw] text-center" style="color: #ff6b6b;">', '🎉 生み出した数 🎉');

    const characters = ['ずんだもん', '中国うさぎ', '東北きりたん', '四国めたん', '東北ずん子', '九州そら', '東北イタコ', '大ずんだもん'];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += scores[i] * Math.pow(2, i);
      xnew('<div class="w-full text-[3cqw] text-center">', (text) => {
        text.element.textContent = `${characters[i]}: ${Math.pow(2, i)}点 x ${scores[i]}`;
      });
    }

    xnew('<div class="w-full text-[4cqw] pt-[1cqw] border-t-[0.4cqw] text-center border-green-600 text-yellow-500">', `⭐ 合計スコア: ${sum} ⭐`);
  });

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

function TitleText(unit) {
  xnew.nest(`<div class="absolute inset-0 w-full h-full pointer-events-none" style="container-type: size;">`);
  xnew.nest('<div class="absolute w-full top-[16cqw] text-[10cqw] text-center text-green-800 font-bold">');
  xnew(Text, { text: 'とーほく ドロップ', strokeWidth: '0.2cqw', strokeColor: 'rgb(200, 220, 200)' });
}

function TouchMessage(unit) {
  xnew.nest(`<div class="absolute inset-0 w-full h-full pointer-events-none" style="container-type: size;">`);
  xnew.nest('<div class="absolute w-full top-[30cqw] text-[6cqw] text-center text-green-800 font-bold">');
  unit.element.textContent = 'touch start';
  let count = 0;
  unit.on('update', () => unit.element.style.opacity = 0.6 + Math.sin(count++ * 0.08) * 0.4);
}

function ScoreText(unit) {
  xnew.nest(`<div class="absolute inset-0 w-full h-full pointer-events-none" style="container-type: size;">`);
  xnew.nest('<div class="absolute top-[1cqw] right-[2cqw] w-full text-[6cqw] text-right font-bold text-green-800">');
  unit.element.textContent = 'score 0';
  let sum = 0;
  unit.on('+scoreup', (i) => unit.element.textContent = `score ${sum += Math.pow(2, i)}`);
}

function GameOverText(unit) {
  xnew.nest(`<div class="absolute inset-0 w-full h-full pointer-events-none" style="container-type: size;">`);
  xnew.nest('<div class="absolute w-full text-center text-[7cqw] font-bold text-red-500">');
  unit.element.textContent = 'Game Over';
  xnew.transition((p) => {
    unit.element.style.opacity = p;
    unit.element.style.top = `${20 + p * 10}cqw`;
  }, 1000, 'ease');
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

function Bowl(unit) {
  for (let angle = 10; angle <= 170; angle++) {
    const x = 400 + Math.cos(angle * Math.PI / 180) * 240;
    const y = 360 + Math.sin(angle * Math.PI / 180) * 200;
    xnew(Circle, { x, y, radius: 12, color: 0x00AAAA, options: { isStatic: true } });
  }
}

function Queue(unit) {
  const balls = [...Array(4)].map(() => Math.floor(Math.random() * 3));
  unit.emit('+reloadcomplete', 0);

  const position = convert3d(10 + 70, 70);
  const rotation = { x: 30 / 180 * Math.PI, y: 60 / 180 * Math.PI, z: 0 };
  let model = xnew(Model, { position, rotation, id: balls[0], scale: 0.6 });

  unit.on('+reload', () => {
    const next = balls.shift();
    model.finalize();
    const position = convert3d(10, 70);
    const rotation = { x: 30 / 180 * Math.PI, y: 60 / 180 * Math.PI, z: 0 };
    model = xnew(Model, { position, rotation, id: balls[0], scale: 0.6 });

    balls.push(Math.floor(Math.random() * 3));
    xnew.transition((p) => {
      const position = convert3d(10 + p * 70, 70);
      model.object.position.set(position.x, position.y, position.z);
    }, 500).timeout(() => {
      unit.emit('+reloadcomplete', next);
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
    const position = convert3d(object.x, object.y + offset);
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
  if (now - prev > 300) {
    prev = now;
    const synth = xnew.audio.synthesizer({ oscillator: { type: 'square', LFO: { type: 'square', amount: 20, rate: 4, }, }, filter: { type: 'lowpass', cutoff: 1000}, amp: { envelope: { amount: 0.7, ADSR: [0, 140, 0, 0], }, }, reverb: { time: 1000, mix: 0.6, },  });  
    const freq = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'][id];
    synth.press(freq, 1000);
  }

  const model = xnew(Model, { id, scale });
  ball.emit('+scoreup', id);
  
  ball.on('update', () => {
    const position = convert3d(ball.object.x, ball.object.y);
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
function convert3d(x, y, z = 0) {
  return { x: (x - xpixi.canvas.width / 2) / 70, y: - (y - xpixi.canvas.height / 2) / 70, z: z };
}

function Text(unit, { text, strokeWidth = 0, strokeColor = 'black' }) {
  const [sw, sc] = [strokeWidth, strokeColor];
  if (sw !== 0) {
    xnew.nest(`<div style="text-shadow: -${sw} -${sw} 1px ${sc}, ${sw} -${sw} 1px ${sc}, -${sw} ${sw} 1px ${sc}, ${sw} ${sw} 1px ${sc};">`);
  }
  unit.element.textContent = text;
}

