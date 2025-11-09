import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';

xnew('#main', Main);

function Main(unit) {
  const global = { GRID: 10, levels: null };
  xnew.context('global', global);

  // three
  const camera = new THREE.OrthographicCamera(-global.GRID / 2, +global.GRID / 2, +global.GRID / 2, -global.GRID / 2, 0, 100);
  xthree.initialize({ canvas: new OffscreenCanvas(700, 700), camera });
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 0, +10);
  xthree.scene.rotation.x = -45 / 180 * Math.PI;

  // pixi 
  const screen = xnew(xnew.basics.Screen, { width: 700, height: 700 });
  xpixi.initialize({ canvas: screen.element });

  xnew.fetch('./levels.json').then(response => response.json()).then((levels) => {
    global.levels = levels;
    // xnew(TitleScene);
    xnew(GameScene, { id: 0 });
  });
}

function TitleScene(unit) {
  xnew(Background);
  xnew(TitleText);
  xnew(StartMessage);

  xnew.listener(window).on('keydown pointerdown', () => {
    unit.finalize();
    xnew.append(Main, GameScene, { id: 0 });
  });
}

function GameScene(unit, { id }) {
  const global = xnew.context('global');

  const state = { level: [] };
  xnew.context('state', state);

  xnew(DirectionalLight, { x: 2, y: -5, z: 10 });
  xnew(AmbientLight);
  xnew(Background);
  xnew(Floor);
  xnew(Texture, { texture: xpixi.sync(xthree.canvas), position: { x: 0, y: -60 } });

  xnew(xpixi.canvas.parentElement, () => {
    xnew(InfoPanel, { id });
    xnew(Controller);
  });

  for (let y = 0; y < global.GRID; y++) {
    state.level[y] = [];
    for (let x = 0; x < global.GRID; x++) {
      // # = 壁, . = 床, @ = プレイヤー, $ = 箱, * = ゴール
      const token = global.levels[id][y][x];
      state.level[y][x] = token === '#' ? '#' : '.';
      const position = { x, y };
      
      if (token === '#') {
        xnew(Wall, { position });
      } else if (token === '*') {
        xnew(Goal, { position });
      } else if (token === '@') {
        xnew(Player, { id, position });
      } else if (token === '$') {
        xnew(Box, { position });
      }
    }
  }
  unit.on('+restart', () => unit.reboot());

  unit.on('+moved', () => {
    const boxes = xnew.find(Box);
    const goals = xnew.find(Goal);
    const cleared = goals.every(goal => boxes.some(box => box.position.x === goal.position.x && box.position.y === goal.position.y));
    if (cleared === false) return;

    xnew(GameClearText);

    xnew.timeout(() => {
      xnew.listener(window).on('keydown pointerdown', () => {
        unit.finalize();
        if (id + 1 < global.levels.length) {
            xnew.append(Main, GameScene, { id: id + 1 });
        } else {
            xnew.append(Main, TitleScene);
        }
      });
    }, 1000);
  });
}

function DirectionalLight(unit, { x, y, z }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1.5));
  object.position.set(x, y, z);
  object.castShadow = true;
  object.shadow.camera.updateProjectionMatrix();
}

function AmbientLight(unit) {
  const object = xthree.nest(new THREE.AmbientLight(0xFFFFFF, 1.5));
}

function Texture(unit, { texture, position = { x: 0, y: 0} }) {
  const object = xpixi.nest(new PIXI.Sprite(texture));
  object.position.set(position.x, position.y);
}

function Background(unit) {
  const object = xpixi.nest(new PIXI.Container());
  object.addChild(new PIXI.Graphics().rect(0, 0, xpixi.canvas.width, xpixi.canvas.height).fill(0x1a1a2e));
}

function TitleText(unit) {
  const object = xpixi.nest(new PIXI.Text('倉庫', { fontSize: 48, fill: 0xFFFFFF, fontFamily: 'Arial' }));
  object.position.set(xpixi.canvas.width / 2, xpixi.canvas.height / 2 - 50);
  object.anchor.set(0.5);
}

function StartMessage(unit) {
  const object = xpixi.nest(new PIXI.Text('Press any key to start', { fontSize: 24, fill: 0xAAAAAA, fontFamily: 'Arial' }));
  object.position.set(xpixi.canvas.width / 2, xpixi.canvas.height / 2 + 30);
  object.anchor.set(0.5);

  let count = 0;
  unit.on('update', () => object.alpha = 0.6 + Math.sin(count++ * 0.08) * 0.4);
}

function Floor(unit) {
  const global = xnew.context('global');
  const object = xthree.nest(new THREE.Group());

  for (let y = 0; y < global.GRID; y++) {
    for (let x = 0; x < global.GRID; x++) {
      const geometry = new THREE.PlaneGeometry(1, 1);
      const material = new THREE.MeshStandardMaterial({ color: (x + y) % 2 === 0 ? 0xCCCCCC : 0xAAAAAA });
      const tile = new THREE.Mesh(geometry, material);

      const pos = pos3d(x, y, 0);
      tile.position.set(pos.x, pos.y, pos.z);
      tile.receiveShadow = true;
      object.add(tile);
    }
  }
}

function Wall(unit, { position }) {
  const height = 0.5;
  const geometry = new THREE.BoxGeometry(1.0 - 0.1, 1.0 - 0.1, height);
  const material = new THREE.MeshStandardMaterial({ color: 0x666666 });
  const object = xthree.nest(new THREE.Mesh(geometry, material));

  const rondom = { x: Math.random() * 0.05 - 0.05, y: Math.random() * 0.1 - 0.05 };
  const pos = pos3d(position.x, position.y, height / 2);
  object.position.set(pos.x + rondom.x, pos.y + rondom.y, pos.z);
  object.castShadow = true;
  object.receiveShadow = true;
}

function Goal(unit, { position }) {
  const depth = 0.2;
  const geometry = new THREE.CylinderGeometry(0.3, 0.3, depth, 32);
  const material = new THREE.MeshStandardMaterial({
    color: 0x6666ff,
    emissive: 0x4444ff,
    emissiveIntensity: 0.3
  });
  const object = xthree.nest(new THREE.Mesh(geometry, material));

  const pos = pos3d(position.x, position.y, depth / 2);
  object.position.set(pos.x, pos.y, pos.z);
  object.rotation.x = Math.PI / 2;
  object.receiveShadow = true;

  return {
    get position() {
      return position;
    }
  }
}

function Player(unit, { id, position }) {
  const object = xthree.nest(new THREE.Object3D());

  xnew(Model, { id, scale: 0.7 });
  object.rotation.x = -Math.PI / 15;

  unit.on('+playermove', ({ dx, dy }) => {
    if (canMove(position.x + dx, position.y + dy) === false) return;

    // 箱があったらそれを押せるかチェック
    const boxes = xnew.find(Box);
    const boxIndex = boxes.findIndex(box => box.position.x === position.x + dx && box.position.y === position.y + dy);
    if (boxIndex >= 0){
      const box = boxes[boxIndex];
      if (canMove(box.position.x + dx, box.position.y + dy) === false) return;
      if (boxes.some(b => b.position.x === box.position.x + dx && b.position.y === box.position.y + dy)) return;
      box.move(dx, dy);
    }

    unit.move(dx, dy);
    unit.emit('+moved');
  });

  const offset = { x: 0, y: 0 };
  unit.on('update', () => {
    const pos = pos3d(position.x - offset.x, position.y - offset.y + 0.3, 0);
    object.position.set(pos.x, pos.y, pos.z);
  });
  return {
    move(dx, dy) {
      position.x = position.x + dx;
      position.y = position.y + dy;
      if (dx > 0) {
        object.rotation.z = Math.atan2(dy, -dx) - Math.PI / 2 - Math.PI / 4;
        object.rotation.x = -Math.PI / 6;
      } else if (dx < 0) {
        object.rotation.z = Math.atan2(dy, -dx) - Math.PI / 2 + Math.PI / 4;
        object.rotation.x = -Math.PI / 6;
      } else {
        object.rotation.z = Math.atan2(dy, -dx) - Math.PI / 2;
        object.rotation.x = -Math.PI / 15;
      }
      xnew.transition((x) => {
        offset.x = (1 - x) * dx;
        offset.y = (1 - x) * dy;
      }, 150);
    }
  };
}

function Box(unit, { position }) {
  const boxSize = 1;
  const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
  const material = new THREE.MeshStandardMaterial({ color: 0xaa5500 });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.castShadow = true;
  object.receiveShadow = true;

  const rondom = { x: Math.random() * 0.05 - 0.05, y: Math.random() * 0.1 - 0.05 };
  const offset = { x: 0, y: 0 };
  unit.on('update', () => {
    const pos = pos3d(position.x - offset.x, position.y - offset.y, boxSize / 2);
    object.position.set(pos.x + rondom.x, pos.y + rondom.y, pos.z);

    const isOnGoal = xnew.find(Goal).some(g => g.position.x === position.x && g.position.y === position.y);
    material.color.setHex(isOnGoal ? 0xffaa00 : 0xaa5500);
  });

  return {
    get position() {
      return position;
    },
    move(dx, dy) {
      const next = { x: position.x + dx, y: position.y + dy };

      const boxes = xnew.find(Box);
      if (canMove(next.x, next.y) === false) return false;
      if (boxes.some(box => box.position.x === next.x && box.position.y === next.y)) return false;

      position.x = position.x + dx;
      position.y = position.y + dy;
      xnew.transition((x) => {
        offset.x = (1 - x) * dx;
        offset.y = (1 - x) * dy;
      }, 150);
      return true;
    }
  }
}

function Controller(unit) {
  let moving = false;
  xnew.listener(window).on('keydown', (event) => {
    event.preventDefault();
    let dx = 0, dy = 0;
    if (event.code === 'ArrowUp' || event.code === 'KeyW') {
      dy = -1;
    } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      dy = 1;
    } else if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
      dx = -1;
    } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
      dx = 1;
    } else if (event.code === 'KeyR') {
      unit.emit('+restart');
    }
    if (moving === false && (dx !== 0 || dy !== 0)) {
      moving = true;  
      xnew.timeout(() => { moving = false; }, 150);
      unit.emit('+playermove', { dx, dy });
    }
  });

  xnew('<div class="@container absolute left-0 bottom-0 w-[20%] h-[calc(160/700*100%)] bg-blue-200">', () => {
    xnew.nest('<div class="absolute inset-[1cqw] bottom-[1cqw] bg-red-200">');
    const dpad = xnew(xnew.basics.DirectionalPad, { diagonal: false, fillOpacity: 0.5 });

    dpad.on('-down', ({ vector }) => {
      if (moving === false) {
        moving = true;
        xnew.timeout(() => { moving = false; }, 150);
        unit.emit('+playermove', { dx: vector.x, dy: vector.y });
      }
    });
  });

}

function GameClearText(unit) {
  const object = xpixi.nest(new PIXI.Text('Stage Clear!', { fontSize: 36, fill: 0xFFFF00, fontFamily: 'Arial' }));
  object.position.set(xpixi.canvas.width / 2, xpixi.canvas.height / 2 - 30);
  object.anchor.set(0.5);
}

function InfoPanel(unit, { id }) {
  const panel = xpixi.nest(new PIXI.Container());
  panel.position.set(0, 560);

  // const levelText = new PIXI.Text(`Level: ${id + 1}`, { fontSize: 36, fill: 0xFFFFFF, fontFamily: 'Arial' });
  // levelText.position.set(350, 10);
  // levelText.anchor.set(0.5);
  // panel.addChild(levelText);
  xnew('<div class="@container absolute bottom-0 left-0 right-0 w-full h-[22%]">', () => {
    const div = xnew.nest('<div class="relative w-full h-full text-[6cqw]" style="font-family: Arial;">');
    xnew('<div class="relative w-full text-center text-gray-200">', `Level: ${id + 1}`);
    xnew('<div class="relative w-full text-center">', () => {
      xnew('<button class="text-gray-200 border border-gray-200 text-[5cqw] rounded-full px-[4cqw] py-[1cqw] hover:bg-gray-500">', 'reset');
    });
  });
  xnew('<div class="absolute bottom-0 right-0 w-[30%] h-[30%]">', () => {
    const screen = xnew(xnew.basics.Screen, { width: 300, height: 300 });

    const camera = new THREE.OrthographicCamera(-1, +1, +1, -1, 0, 100);
    xthree.initialize({ canvas: screen.element, camera });
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


function Model(unit, { x = 0, y = 0, id = 0, scale = 1.0 }) {
  const object = xthree.nest(new THREE.Object3D());

  const list = ['zundamon.vrm', 'kiritan.vrm', 'usagi.vrm', 'metan.vrm', 'sora.vrm', 'zunko.vrm', 'itako.vrm'];
  const path = './models/' + (id < 7 ? list[id] : list[0]);

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
  unit.on('update', () => {
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

// ヘルパー関数
function pos3d(gridX, gridY, z = 0) {
  const global = xnew.context('global');
  return { x: (gridX + 0.5) - global.GRID / 2, y: -((gridY + 0.5) - global.GRID / 2), z: z };
}

function canMove(x, y) {
  const global = xnew.context('global');
  const state = xnew.context('state');
  if (x < 0 || x >= global.GRID || y < 0 || y >= global.GRID) return false;
  if (state.level[y][x] === '#') return false;
  return true;
}

