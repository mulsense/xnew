import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import xnew from 'xnew';
import xpixi from 'xnew/addons/xpixi';
import xthree from 'xnew/addons/xthree';

const TILE_SIZE = 50;
const GRID_SIZE = 10;
xnew('#main', Main);

function Main(unit) {
  const width = TILE_SIZE * GRID_SIZE + 200;
  const height = TILE_SIZE * GRID_SIZE;

  // three 
  const camera = new THREE.OrthographicCamera(-100, +100, 100 * height / width, -100 * height / width, 0, 2000);
  xthree.initialize({ canvas: new OffscreenCanvas(width, height), camera });
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 0, +100);

  // pixi 
  const screen = xnew(xnew.basics.Screen, { width, height });
  xpixi.initialize({ canvas: screen.element });

  xnew(TitleScene);
}

function ThreeLayer(unit) {
  const texture = xpixi.sync(xthree.canvas);
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
  xnew(ThreeLayer);
  xnew(Cube, { x: 0, y: 0, z: 0, size: 10});

  xnew.listener(window).on('keydown pointerdown', () => {
    unit.finalize();
    xnew.append(Main, GameScene, { level: 0 });
  });
}

function Cube(unit, { x, y, z, size }) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshNormalMaterial();
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.position.set(x, y, z);

  unit.on('update', () => {
      object.rotation.x += 0.01;
      object.rotation.y += 0.01;
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
  xnew(Background);
  xnew(Floor);

  xnew.fetch('./levels.json').then(response => response.json()).then((levels) => {
    // # = 壁, . = 床, @ = プレイヤー, $ = 箱, * = ゴール, + = ゴールの上のプレイヤー, % = ゴールの上の箱
    // レベルデータの解析
    const levelData = levels[level];
    for (let y = 0; y < GRID_SIZE; y++) {
      gameState.grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
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
  const container = xpixi.nest(new PIXI.Container());

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const tile = new PIXI.Graphics();
      const color = (x + y) % 2 === 0 ? 0x2d2d44 : 0x242438;
      tile.rect(0, 0, TILE_SIZE, TILE_SIZE).fill(color);
      tile.position.set(x * TILE_SIZE, y * TILE_SIZE);
      container.addChild(tile);
    }
  }
}

function Wall(unit, { x, y }) {
  const object = xpixi.nest(new PIXI.Container());
  const graphics = new PIXI.Graphics();
  graphics.rect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4).fill(0x4444ff);
  graphics.rect(6, 6, TILE_SIZE - 12, TILE_SIZE - 12).fill(0x666666);
  object.position.set(x * TILE_SIZE, y * TILE_SIZE);
  object.addChild(graphics);
}

function Goal(unit, { x, y }) {
  const object = xpixi.nest(new PIXI.Container());
  const graphics = new PIXI.Graphics();
  graphics.circle(TILE_SIZE / 2, TILE_SIZE / 2, 15).fill(0x4444ff);
  graphics.circle(TILE_SIZE / 2, TILE_SIZE / 2, 10).fill(0x6666ff);
  object.position.set(x * TILE_SIZE, y * TILE_SIZE);
  object.addChild(graphics);
  // object.alpha = 0.5;
}

function Player(unit, { gameState }) {
  const object = xpixi.nest(new PIXI.Container());
  const graphics = new PIXI.Graphics();
  graphics.circle(TILE_SIZE / 2, TILE_SIZE / 2, 18).fill(0x00ff00);
  graphics.circle(TILE_SIZE / 2 - 5, TILE_SIZE / 2 - 5, 3).fill(0x000000);
  graphics.circle(TILE_SIZE / 2 + 5, TILE_SIZE / 2 - 5, 3).fill(0x000000);
  graphics.arc(TILE_SIZE / 2, TILE_SIZE / 2 + 3, 8, 0, Math.PI).stroke({ color: 0x000000, width: 2 });

  object.addChild(graphics);
  object.position.set(
    gameState.playerPos.x * TILE_SIZE,
    gameState.playerPos.y * TILE_SIZE
  );

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
    checkGameClear(gameState, unit);
  });

  unit.on('update', () => {
    object.position.set(
      gameState.playerPos.x * TILE_SIZE,
      gameState.playerPos.y * TILE_SIZE
    );
  });
}

function Box(unit, { gameState, boxData }) {
  const object = xpixi.nest(new PIXI.Container());
  const graphics = new PIXI.Graphics();

  function updateGraphics() {
    graphics.clear();
    const isOnGoal = gameState.goals.some(g => g.x === boxData.x && g.y === boxData.y);
    const color = isOnGoal ? 0xffaa00 : 0xaa5500;
    graphics.rect(5, 5, TILE_SIZE - 10, TILE_SIZE - 10).fill(color);
    graphics.rect(10, 10, TILE_SIZE - 20, TILE_SIZE - 20).stroke({ color: 0x664400, width: 2 });
    graphics.moveTo(10, 10).lineTo(TILE_SIZE - 10, TILE_SIZE - 10).stroke({ color: 0x664400, width: 2 });
    graphics.moveTo(TILE_SIZE - 10, 10).lineTo(10, TILE_SIZE - 10).stroke({ color: 0x664400, width: 2 });
  }

  updateGraphics();
  object.addChild(graphics);
  object.position.set(boxData.x * TILE_SIZE, boxData.y * TILE_SIZE);

  unit.on('update', () => {
    object.position.set(boxData.x * TILE_SIZE, boxData.y * TILE_SIZE);
  });

  unit.on('+boxmoved', () => {
    updateGraphics();
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
  panel.position.set(TILE_SIZE * GRID_SIZE + 10, 10);

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
  object.position.set((TILE_SIZE * GRID_SIZE) / 2, (TILE_SIZE * GRID_SIZE) / 2 - 30);
  object.anchor.set(0.5);
}

// ヘルパー関数
function isValidPosition(x, y, gameState) {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
  if (gameState.grid[y][x] === '#') return false;
  return true;
}

function checkGameClear(gameState, unit) {
  const allBoxesOnGoals = gameState.goals.every(goal => 
    gameState.boxes.some(box => box.x === goal.x && box.y === goal.y)
  );
  if (allBoxesOnGoals) {
    unit.emit('+gameclear');
  }
}
