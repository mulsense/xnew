import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';

xnew('#main', Main);

function Main(screen) {
  const global = { GRID: 10, levels: null };
  xnew.context('global', global);
  xnew.extend(xnew.basics.Screen, { width: 700, height: 700 });

  // three
  const camera = new THREE.OrthographicCamera(-global.GRID / 2, +global.GRID / 2, +global.GRID / 2, -global.GRID / 2, 0, 100);
  xthree.initialize({ canvas: new OffscreenCanvas(screen.canvas.width, screen.canvas.height), camera });
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 0, +10);
  xthree.scene.rotation.x = -45 / 180 * Math.PI;
  xthree.scene.fog = new THREE.Fog(0xAAAAAA, 10, 16);

  // pixi 
  xpixi.initialize({ canvas: screen.canvas });

  xnew.fetch('./levels.json').then(response => response.json()).then((levels) => {
      global.levels = levels;
      xnew(TitleScene);
      // xnew(GameScene, { id: 0 });
  });
}

function TitleScene(unit) {
  xnew(Background);
  xnew(TitleText);
  xnew(StageSelect);
}

function GameScene(scene, { id }) {
  const global = xnew.context('global');

  const state = { map: [] };
  xnew.context('state', state);
  xnew(DirectionalLight, { x: 2, y: -5, z: 10 });
  xnew(AmbientLight);
  xnew(Background);
  xnew(Floor);
  xnew(Texture, { texture: xpixi.sync(xthree.canvas), position: { x: 0, y: -60 } });

  xnew(InfoPanel, { id });
  xnew(Controller);

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
  scene.on('+restart', () => scene.reboot());

  scene.on('+moved', () => {
    const boxes = xnew.find(Box);
    const goals = xnew.find(Goal);
    const cleared = goals.every(g => boxes.some(b => b.x === g.x && b.y === g.y));
    if (cleared === false) return;
    scene.off('+moved');

    xnew(GameClearText);

    xnew.timeout(() => {
      xnew(xnew.basics.PointerEvent).on('-pointerdown', () => console.log('test'));
      xnew(xnew.basics.KeyboardEvent).on('-keydown', next);
      xnew(xnew.basics.PointerEvent).on('-pointerdown', next);
      function next(){
        scene.finalize();
        if (id + 1 < global.levels.length) {
            xnew.find(Main)[0]?.append(GameScene, { id: id + 1 });
        } else {
            xnew.find(Main)[0]?.append(TitleScene);
        }
      }
    }, 1000);
  });
}

function DirectionalLight(unit, { x, y, z }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 2.0));
  object.position.set(x, y, z);
  object.castShadow = true;
  object.shadow.camera.updateProjectionMatrix();
}

function AmbientLight(unit) {
  const object = xthree.nest(new THREE.AmbientLight(0xFFFFFF, 1.0));
}

function Texture(unit, { texture, position = { x: 0, y: 0} }) {
  const object = xpixi.nest(new PIXI.Sprite(texture));
  object.position.set(position.x, position.y);
}

function Background(unit) {
  const object = xpixi.nest(new PIXI.Container());
  xnew.promise(PIXI.Assets.load('./background.jpg')).then((texture) => {
    const sprite = new PIXI.Sprite(texture);
    sprite.scale.set(xpixi.canvas.width / texture.frame.width, xpixi.canvas.height / texture.frame.height);
    object.addChild(sprite);
  });
}

function TitleText(text) {
  xnew.nest(`<div
    class="absolute inset-0 w-full h-full pointer-events-none text-gray-800 font-bold select-none"
    style="container-type: size;">
  >`);

  xnew.nest('<div class="absolute top-[16cqw] w-full text-center text-[12cqw]" style="-webkit-text-stroke: 0.2cqw white;">');
  text.element.textContent = 'とーほく 倉庫';
}

function StageSelect(unit) {
  const global = xnew.context('global');
  xnew.nest(`<div
    class="absolute inset-0 w-full h-full pointer-events-none text-gray-800 font-bold select-none"
    style="container-type: size;">
  >`);

  const message = xnew('<div class="absolute top-[40cqw] w-full text-center text-[6cqw]" style="-webkit-text-stroke: 0.2cqw white;">');
  message.element.textContent = 'Select Stage';
  let count = 0;
  message.on('-update', () => message.element.style.opacity = 0.6 + Math.sin(count++ * 0.08) * 0.4);

  // 上段: ステージ1-4
  xnew('<div class="absolute top-[55cqw] left-[15cqw] right-[15cqw] flex justify-center gap-[4cqw]">', () => {
    for (let i = 0; i < 4 && i < global.levels.length; i++) {
      const button = xnew(`<button
        class="border-[0.5cqw] border-green-200 rounded-lg text-[8cqw] text-green-200 hover:bg-green-400 pointer-events-auto cursor-pointer aspect-square w-[14cqw]"
      >`, `${i + 1}`);

      button.on('click', () => {
        xnew.find(TitleScene)[0].finalize();
        xnew.find(Main)[0].append(GameScene, { id: i });
      });
    }
  });

  // 下段: ステージ5-7
  xnew('<div class="absolute top-[75cqw] left-[15cqw] right-[15cqw] flex justify-center gap-[4cqw]">', () => {
    for (let i = 4; i < global.levels.length; i++) {
      const button = xnew(`<button
        class="border-[0.5cqw] border-green-200 rounded-lg text-[8cqw] text-green-200 hover:bg-green-400 pointer-events-auto cursor-pointer spect-square w-[14cqw]"
      >`, `${i + 1}`);

      button.on('click', () => {
        xnew.find(TitleScene)[0].finalize();
        xnew.find(Main)[0].append(GameScene, { id: i });
      });
    }
  });
}

function Floor(unit) {
  const global = xnew.context('global');
  const object = xthree.nest(new THREE.Group());

  for (let y = 0; y < global.GRID; y++) {
    for (let x = 0; x < global.GRID; x++) {
      const geometry = new THREE.PlaneGeometry(1, 1);
      const color = (x + y) % 2 === 0 ? 0xDDDDDD : 0xAAAAAA;
      const material = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.7 });
      const tile = new THREE.Mesh(geometry, material);

      const pos = position3d(x, y, 0);
      tile.position.set(pos.x, pos.y, pos.z);
      tile.receiveShadow = true;
      object.add(tile);
    }
  }

  // グリッド線を作成（太く黄色に）
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xCCCCAA });
  lineMaterial.transparent = true;
  lineMaterial.opacity = 0.9;

  // 横線を作成
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
    const loader = new PLYLoader();
    loader.load('../assets/soko_block_fixed.ply', (geometry) => resolve(geometry));
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

  const position = position3d(x, y, height / 2);
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
  const material = new THREE.MeshStandardMaterial({ color: 0x6666ff, emissive: 0x4444ff, emissiveIntensity: 0.3 });
  const object = xthree.nest(new THREE.Mesh(geometry, material));

  const position = position3d(goal.x, goal.y, depth / 2);
  object.position.set(position.x, position.y, position.z);
  object.rotation.x = Math.PI / 2;
  object.receiveShadow = true;

  let count = 0;
  goal.on('-update', () => {
    const intensity = 0.3 + Math.sin(count * 0.1) * 0.5;
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
    const position = position3d(x - offset.x, y - offset.y + 0.3, 0);
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
    const loader = new PLYLoader();
    loader.load('../assets/soko_block.ply', (geometry) => resolve(geometry));
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

  let rondom = { x: Math.random() * 0.1 - 0.05, y: Math.random() * 0.1 - 0.05 };
  const offset = { x: 0, y: 0 };
  box.on('-update', () => {
    const position = position3d(x - offset.x, y - offset.y, boxSize / 2);
    object.position.set(position.x + rondom.x, position.y + rondom.y, position.z);

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
      rondom = { x: Math.random() * 0.1 - 0.05, y: Math.random() * 0.1 - 0.05 };
      xnew.transition((p) => {
        offset.x = (1 - p) * dx;
        offset.y = (1 - p) * dy;
      }, 250, 'ease');
      return true;
    }
  }
}

function Controller(unit) {
  xnew.nest(`<div 
    class="absolute inset-0 w-full h-full pointer-events-none text-gray-800 font-bold select-none"
    style="container-type: size;">
  >`);
  xnew(xnew.basics.KeyboardEvent).on('-keydown:arrow', ({ event, vector }) => {
    event.preventDefault();
    move(vector);
  });

  xnew('<div class="absolute left-0 bottom-0 w-[28%] h-[28%] select-none">', () => {
    xnew.nest('<div class="absolute inset-[1cqw]">');
    const dpad = xnew(xnew.basics.DirectionalPad, { diagonal: false, fillOpacity: 0.7 });
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

function GameClearText(text) {
  xnew.nest(`<div 
    class="absolute inset-0 w-full h-full pointer-events-none text-gray-800 font-bold select-none"
    style="container-type: size;">
  >`);
  xnew.nest('<div class="absolute top-[16cqw] w-full text-center text-[14cqw] text-yellow-300" style="-webkit-text-stroke: 0.2cqw white;">');
  text.element.textContent = 'Stage Clear!';
  xnew.transition((x) => {
    text.element.style.opacity = x;
    text.element.style.top = `${16 + x * 10}cqw`;
  }, 1000, 'ease');
}

function Button(button, { text }) {
  xnew.nest(`<button
    class="border-[0.5cqw] border-green-200 rounded-full px-[4cqw] py-[1cqw] hover:bg-green-400 pointer-events-auto cursor-pointer"
  >`);
  button.element.textContent = text;
}

function InfoPanel(unit, { id }) {
  xnew.nest(`<div 
    class="absolute inset-0 w-full h-full pointer-events-none text-gray-800 font-bold select-none"
    style="container-type: size;">
  >`);
  xnew('<div class="absolute bottom-[12cqw] w-full text-[12cqw] text-center text-green-700" style="-webkit-text-stroke: 0.2cqw white;">', `Level ${id + 1}`);
  
  xnew('<div class="absolute bottom-[3cqw] text-[3.5cqw] w-full flex justify-center gap-x-[2cqw] text-green-200">', () => {
    xnew(Button, { text: 'Reset' }).on('click', () => unit.emit('+restart'));
    xnew(Button, { text: 'Title' }).on('click', () => {
      xnew.find(GameScene)[0].finalize();
      xnew.find(Main)[0].append(TitleScene);
    });
  });

  xnew('<div class="absolute bottom-0 right-0 w-[35%] h-[35%]">', (screen) => {
    xnew.extend(xnew.basics.Screen, { width: 300, height: 300 });

    const camera = new THREE.OrthographicCamera(-1, +1, +1, -1, 0, 100);
    xthree.initialize({ canvas: screen.canvas, camera });
    xthree.renderer.shadowMap.enabled = true;
    xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    xthree.camera.position.set(-0.2, 0, +10);
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

  return {
    object,
    setPosition(x, y, a) {
      object.position.set((x - xpixi.canvas.width / 2) / 70, - (y - xpixi.canvas.height / 2) / 70, 0);
      object.rotation.z = -a;
    },
  }
}

// helpers
function position3d(gridX, gridY, z = 0) {
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

