import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import xnew from 'xnew';
import xpixi from 'xnew/addons/xpixi';
import xthree from 'xnew/addons/xthree';

const GRID = 10;
xnew('#main', Main);

function Main(unit) {
  // three
  const camera = new THREE.OrthographicCamera(-GRID / 2, +GRID / 2, +GRID / 2, -GRID / 2, 0, 2000);
  xthree.initialize({ canvas: new OffscreenCanvas(500, 500), camera });
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 0, +500);
  xthree.scene.rotation.x = -40 / 180 * Math.PI;

  // pixi 
  const screen = xnew(xnew.basics.Screen, { width: 700, height: 500 });
  xpixi.initialize({ canvas: screen.element });

  // xnew(TitleScene);
  xnew(GameScene, { level: 0 });
}
function DirectionaLight(unit, { x, y, z }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1));
  object.position.set(x, y, z);

  const s = object.position.length();
  object.castShadow = true;
  object.shadow.mapSize.width = 1024;
  object.shadow.mapSize.height = 1024;
  object.shadow.camera.left = -s * 1.0;
  object.shadow.camera.right = +s * 1.0;
  object.shadow.camera.top = -s * 1.0;
  object.shadow.camera.bottom = +s * 1.0;
  object.shadow.camera.near = +s * 0.1;
  object.shadow.camera.far = +s * 10.0;
  object.shadow.camera.updateProjectionMatrix();
}

function AmbientLight(unit) {
  const object = xthree.nest(new THREE.AmbientLight(0xFFFFFF, 1));
}

function Texture(unit, { texture } = {}) {
  const object = xpixi.nest(new PIXI.Sprite(texture));
}

function Background(unit) {
  const object = xpixi.nest(new PIXI.Container());
  object.addChild(new PIXI.Graphics().rect(0, 0, xpixi.canvas.width, xpixi.canvas.height).fill(0x1a1a2e));
}

function TitleText(unit) {
  const object = xpixi.nest(new PIXI.Text('倉庫番', { fontSize: 48, fill: 0xFFFFFF, fontFamily: 'Arial' }));
  object.position.set(xpixi.canvas.width / 2, xpixi.canvas.height / 2 - 50);
  object.anchor.set(0.5);
}

function StartMessage(unit) {
  const object = xpixi.nest(new PIXI.Text('Press any key to start', { fontSize: 24, fill: 0xAAAAAA, fontFamily: 'Arial' }));
  object.position.set(xpixi.canvas.width / 2, xpixi.canvas.height / 2 + 30);
  object.anchor.set(0.5);

  unit.on('update', (count) => {
    object.alpha = 0.6 + Math.sin(count * 0.08) * 0.4;
  });
}

function TitleScene(unit) {
  xnew(Background);
  xnew(TitleText);
  xnew(StartMessage);

  xnew.listener(window).on('keydown pointerdown', () => {
    unit.finalize();
    xnew.append(Main, GameScene, { level: 0 });
  });
}

function GameScene(unit, { level }) {
  const gameState = {
    level,
    grid: [],
    playerPos: { x: 0, y: 0 },
    boxes: [],
    goals: [],
    walls: [],
    moves: 0,
    canMove: true
  };

  xnew(DirectionaLight, { x: 20, y: -50, z: 100 });
  xnew(AmbientLight);

  xnew(Background);
  xnew(Floor);
  xnew(Texture, { texture: xpixi.sync(xthree.canvas) });

  xnew.fetch('./levels.json').then(response => response.json()).then((levels) => {
    // # = 壁, . = 床, @ = プレイヤー, $ = 箱, * = ゴール, + = ゴールの上のプレイヤー, % = ゴールの上の箱
    // レベルデータの解析
    const levelData = levels[level];
    for (let y = 0; y < GRID; y++) {
      gameState.grid[y] = [];
      for (let x = 0; x < GRID; x++) {
        const char = levelData[y][x];
        gameState.grid[y][x] = '.';

        if (char === '#') {
          gameState.grid[y][x] = '#';
          gameState.walls.push({ x, y });
        } else if (char === '*' || char === '+' || char === '%') {
          gameState.goals.push({ x, y });
        } else if (char === '@' || char === '+') {
          gameState.playerPos = { x, y };
        } else if (char === '$' || char === '%') {
          gameState.boxes.push({ x, y });
        }
      }
    }
    xnew(Controller, { gameState });
    xnew(Player, { gameState });

    for (const box of gameState.boxes) {
      xnew(Box, { gameState, boxData: box });
    }
    for (const goal of gameState.goals) {
      xnew(Goal, { x: goal.x, y: goal.y });
    }
    for (const wall of gameState.walls) {
      xnew(Wall, { x: wall.x, y: wall.y });
    }

    xnew(InfoPanel, { gameState });

    unit.on('+gameclear', () => {
      gameState.canMove = false;
      xnew(GameClearText);

      xnew.timeout(() => {
        const nextLevel = level + 1;
        if (nextLevel < levels.length) {
          xnew.listener(window).on('keydown pointerdown', () => {
            unit.finalize();
            xnew.append(Main, GameScene, { level: nextLevel });
          });
        } else {
          xnew.listener(window).on('keydown pointerdown', () => {
            unit.finalize();
            xnew.append(Main, TitleScene);
          });
        }
      }, 1000);
    });

    unit.on('+restart', () => unit.reboot());
  });
}

function Floor(unit) {
  const container = xthree.nest(new THREE.Group());

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const geometry = new THREE.PlaneGeometry(1, 1);
      const color = (x + y) % 2 === 0 ? 0x2d2d44 : 0x242438;
      const material = new THREE.MeshStandardMaterial({ color });
      const tile = new THREE.Mesh(geometry, material);

      const pos = gridToThree(x, y, 0);
      tile.position.set(pos.x, pos.y, pos.z);
      tile.receiveShadow = true;
      container.add(tile);
    }
  }
}

function Wall(unit, { x, y }) {
  const wallHeight = 0.5;
  const geometry = new THREE.BoxGeometry(1.0 - 0.1, 1.0 - 0.1, wallHeight);
  const material = new THREE.MeshStandardMaterial({ color: 0x666666 });
  const object = xthree.nest(new THREE.Mesh(geometry, material));

  const pos = gridToThree(x, y, wallHeight / 2);
  object.position.set(pos.x, pos.y, pos.z);
  object.castShadow = true;
  object.receiveShadow = true;
}

function Goal(unit, { x, y }) {
  const depth = 0.3;
  const geometry = new THREE.CylinderGeometry(0.5, 0.5, depth, 32);
  const material = new THREE.MeshStandardMaterial({
    color: 0x6666ff,
    emissive: 0x4444ff,
    emissiveIntensity: 0.3
  });
  const object = xthree.nest(new THREE.Mesh(geometry, material));

  const pos = gridToThree(x, y, 1);
  object.position.set(pos.x, pos.y, pos.z);
  object.rotation.x = Math.PI / 2;
  object.receiveShadow = true;
}

function Player(unit, { gameState }) {
  const playerRadius = 1;
  const geometry = new THREE.SphereGeometry(0.3);
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.castShadow = true;
  object.receiveShadow = true;

  const pos = gridToThree(gameState.playerPos.x, gameState.playerPos.y, playerRadius);
  object.position.set(pos.x, pos.y, pos.z);

  unit.on('+playermove', ({ dx, dy }) => {
    const targetX = gameState.playerPos.x + dx;
    const targetY = gameState.playerPos.y + dy;

    if (!isValidPosition(targetX, targetY, gameState)) return;

    // 箱があるかチェック
    const boxIndex = gameState.boxes.findIndex(b => b.x === targetX && b.y === targetY);
    if (boxIndex !== -1) {
      // 箱を押せるかチェック
      const boxTargetX = targetX + dx;
      const boxTargetY = targetY + dy;

      if (!isValidPosition(boxTargetX, boxTargetY, gameState)) return;
      if (gameState.boxes.some(b => b.x === boxTargetX && b.y === boxTargetY)) return;

      // 箱を移動
      gameState.boxes[boxIndex].x = boxTargetX;
      gameState.boxes[boxIndex].y = boxTargetY;
      unit.emit('+boxmoved');
    }

    // プレイヤーを移動
    gameState.playerPos.x = targetX;
    gameState.playerPos.y = targetY;
    gameState.moves++;

    unit.emit('+moved');
    // 全ての箱がゴールに乗っているかチェック
    const allBoxesOnGoals = gameState.goals.every(goal => 
      gameState.boxes.some(box => box.x === goal.x && box.y === goal.y)
    );
    if (allBoxesOnGoals) {
      unit.emit('+gameclear');
    }
  });

  unit.on('update', () => {
    const pos = gridToThree(gameState.playerPos.x, gameState.playerPos.y, playerRadius);
    object.position.set(pos.x, pos.y, pos.z);
  });

  function isValidPosition(x, y, gameState) {
    if (x < 0 || x >= GRID || y < 0 || y >= GRID) return false;
    if (gameState.grid[y][x] === '#') return false;
    return true;
  }
}

function Box(unit, { gameState, boxData }) {
  const boxSize = 1;
  const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
  const material = new THREE.MeshStandardMaterial({ color: 0xaa5500 });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.castShadow = true;
  object.receiveShadow = true;

  function updatePosition() {
    const pos = gridToThree(boxData.x, boxData.y, boxSize / 2);
    object.position.set(pos.x, pos.y, pos.z);

    const isOnGoal = gameState.goals.some(g => g.x === boxData.x && g.y === boxData.y);
    material.color.setHex(isOnGoal ? 0xffaa00 : 0xaa5500);
  }

  updatePosition();

  unit.on('update', () => {
    updatePosition();
  });

  unit.on('+boxmoved', () => {
    updatePosition();
  });
}

function Controller(unit, { gameState }) {
  xnew.listener(window).on('keydown', (event) => {
    if (!gameState.canMove) return;
    event.preventDefault();
    let dx = 0, dy = 0;
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        dy = -1;
        break;
      case 'ArrowDown':
      case 'KeyS':
        dy = 1;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        dx = -1;
        break;
      case 'ArrowRight':
      case 'KeyD':
        dx = 1;
        break;
      case 'KeyR':
        unit.emit('+restart');
        break;
    }
    if (dx !== 0 || dy !== 0) {
      unit.emit('+playermove', { dx, dy });
    }
  });
}

function InfoPanel(unit, { gameState }) {
  const panel = xpixi.nest(new PIXI.Container());
  panel.position.set(500 + 10, 10);

  const levelText = new PIXI.Text(`Level: ${gameState.level + 1}`, { fontSize: 24, fill: 0xFFFFFF, fontFamily: 'Arial' });
  levelText.position.set(0, 0);
  panel.addChild(levelText);

  const movesText = new PIXI.Text(`Moves: ${gameState.moves}`, { fontSize: 24, fill: 0xFFFFFF, fontFamily: 'Arial' });
  movesText.position.set(0, 40);
  panel.addChild(movesText);

  const instructionText = new PIXI.Text('Arrow Keys\nor WASD\nto move', { fontSize: 18, fill: 0xAAAAAA, fontFamily: 'Arial', align: 'left' });
  instructionText.position.set(0, 100);
  panel.addChild(instructionText);

  const restartText = new PIXI.Text('Press R\nto restart', { fontSize: 18, fill: 0xAAAAAA, fontFamily: 'Arial', align: 'left' });
  restartText.position.set(0, 180);
  panel.addChild(restartText);

  unit.on('+moved', () => {
    movesText.text = `Moves: ${gameState.moves}`;
  });
}

function GameClearText(unit) {
  const object = xpixi.nest(new PIXI.Text('Stage Clear!', { fontSize: 36, fill: 0xFFFF00, fontFamily: 'Arial' }));
  object.position.set(xpixi.canvas.width / 2, xpixi.canvas.height / 2 - 30);
  object.anchor.set(0.5);
}

// ヘルパー関数
function gridToThree(gridX, gridY, z = 0) {
  return { x: (gridX + 0.5) - GRID / 2, y: -((gridY + 0.5) - GRID / 2), z: z };
}


