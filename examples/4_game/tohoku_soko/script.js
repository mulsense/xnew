import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';

xnew('#main', Main);

function Main(unit) {
  xnew.context('global', { GRID: 10, levels: null });
  xnew.extend(xnew.basics.Screen, { width: 800, height: 450 });

  // three
  const size = xnew.context('global').GRID / 2;
  const camera = new THREE.OrthographicCamera(-size, +size, +size, -size, 0, 100);
  xthree.initialize({ canvas: new OffscreenCanvas(480, 480), camera });
  xthree.renderer.shadowMap.enabled = true;
  xthree.camera.position.set(0, 0, +10);
  xthree.scene.rotation.x = -40 / 180 * Math.PI;
  xthree.scene.fog = new THREE.Fog(0x000000, 10, 18);

  // pixi 
  xpixi.initialize({ canvas: unit.canvas });

  xnew.fetch('./levels.json').then(response => response.json()).then((levels) => {
    xnew.context('global').levels = levels;
    let scene = xnew(TitleScene);
    // let scene = xnew(StoryScene, { id: 0, });
    // let scene = xnew(GameScene, { id: 0 });

    unit.on('+main', (NextScene, props) => {
      xnew(Fade, { fadeout: 300, fadein: 300 }).on('-fadeout', () => {
        scene.finalize();
        scene = xnew(NextScene, props);
      });
    });
  });
}

function TitleScene(unit) {
  xnew(Background);
  xnew(TitleText);
  xnew(StageSelect);
}

function Fade(unit, { fadein, fadeout }) {
  xnew(xnew.find(Main)[0].element, () => {
    const cover = xnew('<div class="absolute inset-0 size-full z-10 bg-black" style="opacity: 0">');

    let timer;
    if (fadeout) {
      timer = xnew.transition((p) => cover.element.style.opacity = p, fadeout, 'ease').timeout((() => unit.emit('-fadeout')));
    }
    if (fadein) {
      timer = (timer ?? xnew).transition((p) => cover.element.style.opacity = 1 - p, fadein, 'ease');
    }
    timer.timeout(() => {
      unit.emit('-fadein')
      unit.finalize();
    });
  }); 
}

function StoryScene(unit, { id, next = false }) {
  const story = [
    {
      text: 'これはテスト用のテキスト１です。'
    },
    {
      text: 'これはテスト用のテキスト２です。'
    }
  ];

  let index = 0;
  xnew(Background);
  xnew.nest('<div class="absolute bottom-[0cqh] w-full h-[30cqh] text-center text-[6cqw] text-gray-400">');
  xnew('<div class="absolute w-full h-full bg-black opacity-70">');

  xnew('<div class="relative w-full h-full flex flex-row justify-center items-center text-[2.5cqw]">', (unit) => {
    action();
  });
  function action() {
    const stream = xnew(xnew.basics.TextStream, { text: story[index].text, speed: 50 });
    stream.on('-next', () => {
      if (index + 1 < story.length) {
        index++;
        stream.finalize();
        action();
      } else if (next === false) {
        unit.emit('+main', GameScene, { id });
      } else {
        unit.emit('+main', StoryScene, { id: id + 1 } );
      }
    });
  }
}

function GameScene(unit, { id }) {
  const global = xnew.context('global');
  const state = { map: [] };
  xnew.context('state', state);

  xnew(DirectionalLight, { x: 2, y: -5, z: 10 });
  xnew(AmbientLight);
  xnew(Background);
  xnew(Floor);
  xnew(Texture, { texture: xpixi.sync(xthree.canvas), position: { x: 320 / 2, y: -10 } });

  xnew(LeftBlock, { id });
  xnew(RightBlock, { id });

  for (let y = 0; y < global.GRID; y++) {
    state.map[y] = [];
    for (let x = 0; x < global.GRID; x++) {
      // # = 壁, . = 床, @ = プレイヤー, $ = 箱, * = ゴール
      const token = global.levels[id].map[y][x];
      state.map[y][x] = token === '#' ? '#' : '.';
      
      if (token === '#') {
        xnew(Wall, { x, y });
      } else if (token === '*') {
        xnew(Goal, { x, y });
      } else if (token === '@') {
        xnew(Player, { id, x, y });
      } else if (token === '$') {
        xnew(Box, { x, y });
      }
    }
  }

  unit.on('+restart', () => unit.reboot());

  unit.on('+moved', () => {
    const boxes = xnew.find(Box);
    const goals = xnew.find(Goal);
    const cleared = goals.every(g => boxes.some(b => b.x === g.x && b.y === g.y));
    if (cleared === false) return;
    unit.off('+moved');

    xnew(GameClearText);

    xnew.timeout(() => {
      xnew(xnew.basics.KeyboardEvent).on('-keydown', next);
      unit.on('pointerdown', next);
      function next(){
        if (id + 1 < global.levels.length) {
            unit.emit('+main', StoryScene, { id, next: true });
        } else {
            unit.emit('+main', TitleScene);
        }
      }
    }, 1000);
  });
}

function DirectionalLight(unit, { x, y, z }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 0.8));
  object.position.set(x, y, z);
  object.castShadow = true;
  object.shadow.camera.updateProjectionMatrix();
}

function AmbientLight(unit) {
  const object = xthree.nest(new THREE.AmbientLight(0xFFFFFF, 0.4));
}

function Texture(unit, { texture, position = { x: 0, y: 0} }) {
  const object = xpixi.nest(new PIXI.Sprite(texture));
  object.position.set(position.x, position.y);
}

function Background(unit) {
  const object = xpixi.nest(new PIXI.Container());
  xnew.promise(PIXI.Assets.load('./background.png')).then((texture) => {
    const sprite = new PIXI.Sprite(texture);
    sprite.scale.set(xpixi.canvas.width / texture.frame.width, xpixi.canvas.height / texture.frame.height);
    object.addChild(sprite);
  });
}

function TitleText(unit) {
  xnew.nest('<div class="absolute top-[22cqh] w-full text-green-700 text-center text-[14cqw] flex justify-center">');
  const text = 'とーほく倉庫';
  const chars = [];
  for (let i = 0; i < text.length; i++) {
      const unit = xnew('<div>', (unit) => {
        unit.element.textContent = text[i];

        let offset = { x: Math.random() * 40 - 20, y: Math.random() * 40 - 20, a: Math.random() * 4 - 2, s: Math.random() * 1 - 0.5 };
        unit.element.style.transform = `translate(${offset.x}cqw, ${offset.y}cqw)`;

        xnew.transition((p) => {
          unit.element.style.opacity = p;
          unit.element.style.transform = `translate(${offset.x * (1 - p)}cqw, ${offset.y * (1 - p)}cqw) rotate(${offset.a * (1 - p)}rad) scale(${1 + offset.s * (1 - p)})`;
        }, 4000, 'ease');
      });
      chars.push(unit);
  }
}

function StageSelect(unit) {
  const global = xnew.context('global');
  const div = xnew.nest('<div class="absolute top-[34cqw] w-full flex justify-center gap-[2cqw]" style="opacity: 0">');
  xnew.timeout(() => {}, 3000).transition((p) => {
    div.style.opacity = p;
  }, 1000);
  for (let i = 0; i < global.levels.length; i++) {
    xnew((unit) => {
      xnew.nest(`<button class="size-[8cqw] border-[0.4cqw] border-green-700 text-[5cqw] text-green-700 hover:scale-110 cursor-pointer">`);
      unit.element.textContent = `${['壱', '弐', '参', '肆', '伍', '陸', '漆'][i]}`;
      unit.on('click', () => unit.emit('+main', StoryScene, { id: i }));
      let count = 0;
      unit.on('-update', () => unit.element.style.opacity = 0.9 + Math.sin(count++ * 0.04) * 0.1);
    })
  }
}

function Floor(unit) {
  const global = xnew.context('global');
  const object = xthree.nest(new THREE.Group());

  for (let y = 0; y < global.GRID; y++) {
    for (let x = 0; x < global.GRID; x++) {
      const geometry = new THREE.PlaneGeometry(1, 1);
      const color = (x + y) % 2 === 0 ? 0xDDDDDD : 0xAAAAAA;
      const material = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.4 });
      const tile = new THREE.Mesh(geometry, material);

      const pos = convert3d(x, y, 0);
      tile.position.set(pos.x, pos.y, pos.z);
      tile.receiveShadow = true;
      object.add(tile);
    }
  }

  // Create grid lines
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x66CC66 });
  lineMaterial.transparent = true;
  lineMaterial.opacity = 0.6;

  // Create horizontal lines
  for (let i = 0; i <= global.GRID; i++) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-global.GRID / 2, -global.GRID / 2 + i, 0.01),
      new THREE.Vector3(global.GRID / 2, -global.GRID / 2 + i, 0.01)
    ]);
    const line = new THREE.Line(geometry, lineMaterial);
    object.add(line);
  }

  // 縦線を作成
  for (let i = 0; i <= global.GRID; i++) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-global.GRID / 2 + i, -global.GRID / 2, 0.01),
      new THREE.Vector3(-global.GRID / 2 + i, global.GRID / 2, 0.01)
    ]);
    const line = new THREE.Line(geometry, lineMaterial);
    object.add(line);
  }
}

function Wall(wall, { x, y }) {
  const height = 1;
  const object = xthree.nest(new THREE.Object3D());

  xnew.promise(new Promise((resolve) => {
    new PLYLoader().load('../assets/soko_block_fixed.ply', (geometry) => resolve(geometry));
  })).then((geometry) => {
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xffffff });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const scale = 0.6;
    mesh.rotation.x = 90 * Math.PI / 180;
    mesh.position.z = height;
    mesh.scale.set(scale, scale, scale);

    object.add(mesh);
  });

  const position = convert3d(x, y, height / 2);
  object.position.set(position.x, position.y, position.z);
}

function Position(position, { x, y }) {
  return {
    set x(newX) { x = newX; },
    set y(newY) { y = newY; },
    get x() { return x; },
    get y() { return y; },
  }
}

function Goal(goal, { x, y }) {
  xnew.extend(Position, { x, y });

  const depth = 0.2;
  const geometry = new THREE.CylinderGeometry(0.3, 0.3, depth, 32);
  const material = new THREE.MeshStandardMaterial({ color: 0x22CC22, emissive: 0x22CC22, emissiveIntensity: 0.3 });
  const object = xthree.nest(new THREE.Mesh(geometry, material));

  const position = convert3d(goal.x, goal.y, depth / 2);
  object.position.set(position.x, position.y, position.z);
  object.rotation.x = Math.PI / 2;
  object.receiveShadow = true;

  let count = 0;
  goal.on('-update', () => {
    const intensity = 0.1 + Math.sin(count * 0.1) * 0.1;
    material.emissiveIntensity = Math.max(0, intensity);
    count++;
  });
}

function Player(player, { id, x, y }) {
  const object = xthree.nest(new THREE.Object3D());
  xnew(Model, { id, scale: 0.7 });
  object.rotation.x = -30 * Math.PI / 180;

  player.on('+playermove', ({ dx, dy }) => {
    if (canMove(x + dx, y + dy) === false) return;

    // 箱があったらそれを押せるかチェック
    const boxes = xnew.find(Box);
    const boxIndex = boxes.findIndex(box => box.x === x + dx && box.y === y + dy);
    if (boxIndex >= 0){
      const box = boxes[boxIndex];
      if (canMove(box.x + dx, box.y + dy) === false) return;
      if (boxes.some(b => b.x === box.x + dx && b.y === box.y + dy)) return;
      box.move(dx, dy);
    }

    player.move(dx, dy);
    player.emit('+moved');
  });

  const offset = { x: 0, y: 0 };
  player.on('-update', () => {
    const position = convert3d(x - offset.x, y - offset.y + 0.3, 0);
    object.position.set(position.x, position.y, position.z);
  });
  return {
    move(dx, dy) {
      x += dx;
      y += dy;
      if (dx > 0) {
        object.rotation.z = Math.atan2(dy, -dx) - Math.PI / 2 - Math.PI / 4;
      } else if (dx < 0) {
        object.rotation.z = Math.atan2(dy, -dx) - Math.PI / 2 + Math.PI / 4;
      } else {
        object.rotation.z = Math.atan2(dy, -dx) - Math.PI / 2;
      }
      xnew.transition((p) => {
        offset.x = (1 - p) * dx;
        offset.y = (1 - p) * dy;
      }, 250, 'ease');
    }
  };
}

function Box(box, { x, y }) {
  const boxSize = 1;
  const object = xthree.nest(new THREE.Object3D());
  let material = null;
  xnew.promise(new Promise((resolve) => {
    new PLYLoader().load('../assets/soko_block.ply', (geometry) => resolve(geometry));
  })).then((geometry) => {
    geometry.computeVertexNormals();
    material = new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xEEEEEE });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const scale = 0.55;
    mesh.rotation.x = 90 * Math.PI / 180;
    mesh.rotation.y = 90 * Math.PI / 180;
    mesh.position.z = boxSize;
    mesh.scale.set(scale, scale, scale);
    object.add(mesh);
  });

  let random = { x: Math.random() * 0.1 - 0.05, y: Math.random() * 0.1 - 0.05 };
  const offset = { x: 0, y: 0 };
  box.on('-update', () => {
    const position = convert3d(x - offset.x, y - offset.y, boxSize / 2);
    object.position.set(position.x + random.x, position.y + random.y, position.z);

    const isOnGoal = xnew.find(Goal).some(g => g.x === x && g.y === y);
    material.color.setHex(isOnGoal ? 0xFFFFFF : 0xCCCCCC);
  });

  return {
    get x() { return x; }, get y() { return y; },
    move(dx, dy) {
      const next = { x: x + dx, y: y + dy };

      const boxes = xnew.find(Box);
      if (canMove(next.x, next.y) === false) return false;
      if (boxes.some(b => b.x === next.x && b.y === next.y)) return false;

      x += dx;
      y += dy;
      random = { x: Math.random() * 0.1 - 0.05, y: Math.random() * 0.1 - 0.05 };
      xnew.transition((p) => {
        offset.x = (1 - p) * dx;
        offset.y = (1 - p) * dy;
      }, 250, 'ease');
      return true;
    }
  }
}

function GameClearText(unit) {
  xnew.nest('<div class="absolute w-full text-center text-[14cqw] text-green-600">');
  
  unit.element.textContent = '生還!';
  xnew.transition((x) => {
    unit.element.style.opacity = x;
    unit.element.style.top = `${16 + x * 10}cqh`;
  }, 1000, 'ease');
}

function LeftBlock(unit, { id }) {
  xnew.nest('<div class="absolute left-0 top-0 w-[20cqw] h-full">');
  
  xnew('<div class="absolute top-[4cqh] w-full text-center text-[8cqw] font-bold text-green-700">', (unit) => {
    xnew('<div>', `午前`);
    xnew('<div class="m-[-6cqh]">', `${['壱', '弐', '参', '肆', '伍', '陸', '漆'][id]}時`);
  });

  xnew('<div class="absolute top-[42cqh] w-full flex justify-center gap-x-[1cqw] text-green-700">', () => {
    xnew((unit) => {
      xnew.nest(`<button class="size-[8cqw] border-[0.3cqw] border-green-700 text-[5cqw] text-green-700 hover:scale-110 cursor-pointer">`);
      unit.element.textContent = '再';
    }).on('click', () => unit.emit('+restart'));
    xnew((unit) => {
      xnew.nest(`<button class="size-[8cqw] border-[0.3cqw] border-green-700 text-[5cqw] text-green-700 hover:scale-110 cursor-pointer">`);
      unit.element.textContent = '帰';
    }).on('click', () => unit.emit('+main', TitleScene));
    // xnew('<div class="size-[8cqw] cursor-pointer hover:scale-110">', 
    //   xnew.icons.ArrowPath, { frame: 'square', }).on('click', () => unit.emit('+restart'));
    // xnew('<div class="size-[8cqw] cursor-pointer hover:scale-110">', 
    //   xnew.icons.Home, { frame: 'square', }).on('click', () => unit.emit('+main', TitleScene));
  });

  xnew(xnew.basics.KeyboardEvent).on('-keydown:arrow', ({ event, vector }) => {
    event.preventDefault();
    move(vector);
  });

  xnew('<div class="absolute bottom-[8cqh] left-0 right-0 m-auto size-[18cqw] text-green-700">', () => {
    const dpad = xnew(xnew.basics.DirectionalPad, { diagonal: false, fill: '#228B22', fillOpacity: 0.4 });
    dpad.on('-down', ({ vector }) => move(vector));
  });

  let stack = 0;
  function move(vector) {
    if (vector.x === 0 && vector.y == 0) return;
    if (stack === 0) {
      stack++;
      xnew.timeout(() => { stack--; }, 250);
      unit.emit('+playermove', { dx: vector.x, dy: vector.y });
    } else if (stack <= 2) {
      xnew.timeout(() => move(vector), 10);
    }
  }
}

function RightBlock(unit, { id }) {
  xnew.nest('<div class="absolute right-0 top-0 w-[20cqw] h-full select-none">');

  xnew('<div class="absolute bottom-[6cqh] size-[20cqw]">', (screen) => {
    xnew.extend(xnew.basics.Screen, { width: 300, height: 300 });

    const camera = new THREE.OrthographicCamera(-1, +1, +1, -1, 0, 100);
    xthree.initialize({ canvas: screen.canvas, camera });
    xthree.renderer.shadowMap.enabled = true;
    xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    xthree.camera.position.set(0, 0, +10);
    xthree.scene.rotation.x = -80 / 180 * Math.PI;
    xthree.scene.rotation.z = -30 / 180 * Math.PI;
    xthree.scene.position.y = -0.9;
    xnew(DirectionalLight, { x: 2, y: -5, z: 3 });
    xnew(AmbientLight);
    xnew(Model, { id, scale: 0.9 });
  });
}

function Model(unit, { id = 0, scale }) {
  const object = xthree.nest(new THREE.Object3D());

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
      if (object.isMesh) object.castShadow = true;
      if (object.isMesh) object.receiveShadow = true;
    });
    // vrm.scene.position.y = -scale;
    vrm.scene.rotation.x = Math.PI / 2;
    vrm.scene.scale.set(scale, scale, scale);
    object.add(vrm.scene);
  });

  const offset = Math.random() * 10;

  let count = 0;
  unit.on('-update', () => {
    const neck = vrm.humanoid.getNormalizedBoneNode('neck');
    const chest = vrm.humanoid.getNormalizedBoneNode('chest');
    const hips = vrm.humanoid.getNormalizedBoneNode('hips');
    const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
    const leftUpperLeg = vrm.humanoid.getNormalizedBoneNode('leftUpperLeg');
    const rightUpperLeg = vrm.humanoid.getNormalizedBoneNode('rightUpperLeg');
    const t = (count + offset) * 0.025;
    // neck.rotation.x = Math.sin(t * 6) * +0.1;
    chest.rotation.x = Math.sin(t * 12) * +0.1;
    hips.position.z = Math.sin(t * 12) * 0.1;
    leftUpperArm.rotation.z = Math.sin(t * 12 + offset) * +0.7;
    leftUpperArm.rotation.x = Math.sin(t * 6 + offset) * +0.8;
    rightUpperArm.rotation.z = Math.sin(t * 12) * -0.7;
    rightUpperArm.rotation.x = Math.sin(t * 6) * +0.8;
    leftUpperLeg.rotation.z = Math.sin(t * 8) * +0.2;
    leftUpperLeg.rotation.x = Math.sin(t * 12) * +0.7;
    rightUpperLeg.rotation.z = Math.sin(t * 8) * -0.2;
    rightUpperLeg.rotation.x = Math.sin(t * 12) * -0.7;
    vrm.update(t);
    count++;
  });

  return { object }
}

// helpers
function convert3d(gridX, gridY, z = 0) {
  const global = xnew.context('global');
  return { x: (gridX + 0.5) - global.GRID / 2, y: -((gridY + 0.5) - global.GRID / 2), z: z };
}

function canMove(x, y) {
  const global = xnew.context('global');
  const state = xnew.context('state');
  if (x < 0 || x >= global.GRID || y < 0 || y >= global.GRID) return false;
  if (state.map[y][x] === '#') return false;
  return true;
}

