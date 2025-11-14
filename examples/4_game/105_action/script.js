import * as PIXI from 'pixi.js';
import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';

xnew('#main', Main);

function Main(unit) {
  const screen = xnew(xnew.basics.Screen, { width: 800, height: 600 });
  xpixi.initialize({ canvas: screen.canvas });

  xnew(Background);
  xnew(TitleScene);
}

function Background(unit) {
  const object = xpixi.nest(new PIXI.Container());
  // Sky gradient background
  const graphics = new PIXI.Graphics();
  graphics.rect(0, 0, xpixi.canvas.width, xpixi.canvas.height);
  graphics.fill({
    color: 0x5C94FC,
    alpha: 1
  });
  object.addChild(graphics);
}

function TitleScene(unit) {
  xnew(TitleText);
  xnew.listener(window).on('keydown pointerdown', () => {
    unit.finalize();
    xnew.append(Main, GameScene);
  });
}

function TitleText(unit) {
  const container = xpixi.nest(new PIXI.Container());

  const title = new PIXI.Text('SUPER MARIO', {
    fontSize: 48,
    fill: 0xFF0000,
    fontWeight: 'bold',
    stroke: { color: 0xFFFFFF, width: 4 }
  });
  title.position.set(xpixi.canvas.width / 2, xpixi.canvas.height / 2 - 50);
  title.anchor.set(0.5);
  container.addChild(title);

  const start = new PIXI.Text('PRESS ANY KEY TO START', {
    fontSize: 24,
    fill: 0xFFFFFF
  });
  start.position.set(xpixi.canvas.width / 2, xpixi.canvas.height / 2 + 50);
  start.anchor.set(0.5);
  container.addChild(start);

  // Blinking effect
  let count = 0;
  unit.on('update', () => {
    start.alpha = Math.sin(count / 20) * 0.5 + 0.5;
    count++;
  });
}

function GameScene(unit) {
  const state = {
    gravity: 0.5,
    score: 0,
    coins: 0,
    lives: 3,
    gameOver: false
  };

  xnew(Controller);
  xnew(ScoreDisplay, { state });
  xnew(World, { state });

  const mario = xnew(Mario, { state });

  unit.on('+gameover', () => {
    if (state.gameOver) return;
    state.gameOver = true;
    state.lives--;

    if (state.lives <= 0) {
      xnew(GameOverText);
      xnew.timeout(() => {
        xnew.listener(window).on('keydown pointerdown', () => {
          unit.finalize();
          xnew.append(Main, TitleScene);
        });
      }, 2000);
    } else {
      // Respawn
      xnew.timeout(() => {
        state.gameOver = false;
        mario.respawn();
      }, 1000);
    }
  });

  return { state };
}

function Controller(unit) {
  xnew.listener(window).on('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });

  const keyboard = xnew(xnew.basics.KeyboardEvent);
  keyboard.on('-keydown', ({ code }) => {
    if (code === 'ArrowLeft') unit.emit('+moveleft');
    if (code === 'ArrowRight') unit.emit('+moveright');
    if (code === 'Space' || code === 'ArrowUp') unit.emit('+jump');
  });

  keyboard.on('-keyup', ({ code }) => {
    if (code === 'ArrowLeft' || code === 'ArrowRight') unit.emit('+stop');
  });
}

function ScoreDisplay(unit, { state }) {
  const container = xpixi.nest(new PIXI.Container());

  const scoreText = new PIXI.Text('SCORE: 0', {
    fontSize: 20,
    fill: 0xFFFFFF,
    fontWeight: 'bold'
  });
  scoreText.position.set(10, 10);
  container.addChild(scoreText);

  const coinsText = new PIXI.Text('COINS: 0', {
    fontSize: 20,
    fill: 0xFFD700,
    fontWeight: 'bold'
  });
  coinsText.position.set(10, 35);
  container.addChild(coinsText);

  const livesText = new PIXI.Text('LIVES: 3', {
    fontSize: 20,
    fill: 0xFF0000,
    fontWeight: 'bold'
  });
  livesText.position.set(10, 60);
  container.addChild(livesText);

  unit.on('update', () => {
    scoreText.text = `SCORE: ${state.score}`;
    coinsText.text = `COINS: ${state.coins}`;
    livesText.text = `LIVES: ${state.lives}`;
  });
}

function GameOverText(unit) {
  const object = xpixi.nest(new PIXI.Text('GAME OVER', {
    fontSize: 64,
    fill: 0xFF0000,
    fontWeight: 'bold',
    stroke: { color: 0x000000, width: 6 }
  }));
  object.position.set(xpixi.canvas.width / 2, xpixi.canvas.height / 2);
  object.anchor.set(0.5);
}

function World(unit, { state }) {
  // Ground
  for (let i = 0; i < 20; i++) {
    xnew(Platform, { x: i * 50, y: 550, width: 50, height: 50, type: 'ground' });
  }

  // Floating platforms
  xnew(Platform, { x: 200, y: 450, width: 100, height: 20, type: 'brick' });
  xnew(Platform, { x: 400, y: 400, width: 100, height: 20, type: 'brick' });
  xnew(Platform, { x: 600, y: 350, width: 100, height: 20, type: 'brick' });
  xnew(Platform, { x: 300, y: 300, width: 150, height: 20, type: 'brick' });

  // Question blocks with coins
  xnew(QuestionBlock, { x: 250, y: 400, state });
  xnew(QuestionBlock, { x: 450, y: 350, state });
  xnew(QuestionBlock, { x: 350, y: 250, state });

  // Enemies
  xnew(Goomba, { x: 300, y: 520, state });
  xnew(Goomba, { x: 500, y: 520, state });
  xnew(Goomba, { x: 650, y: 320, state });

  // Coins
  xnew(Coin, { x: 220, y: 380, state });
  xnew(Coin, { x: 420, y: 330, state });
  xnew(Coin, { x: 620, y: 280, state });
}

function Platform(unit, { x, y, width, height, type }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);

  const graphics = new PIXI.Graphics();

  if (type === 'ground') {
    // Brown ground
    graphics.rect(0, 0, width, height);
    graphics.fill(0x8B4513);
    graphics.stroke({ color: 0x654321, width: 2 });
  } else if (type === 'brick') {
    // Red brick
    graphics.rect(0, 0, width, height);
    graphics.fill(0xCC6600);
    graphics.stroke({ color: 0x994400, width: 2 });
    // Brick pattern
    for (let i = 0; i < width; i += 25) {
      graphics.moveTo(i, 0);
      graphics.lineTo(i, height);
      graphics.stroke({ color: 0x994400, width: 1 });
    }
  }

  object.addChild(graphics);

  return {
    getBounds: () => ({ x, y, width, height }),
    type
  };
}

function QuestionBlock(unit, { x, y, state }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);

  const size = 30;
  let hit = false;

  const graphics = new PIXI.Graphics();
  graphics.rect(0, 0, size, size);
  graphics.fill(hit ? 0x8B4513 : 0xFFD700);
  graphics.stroke({ color: 0xFFAE00, width: 2 });
  object.addChild(graphics);

  const questionMark = new PIXI.Text('?', {
    fontSize: 24,
    fill: 0xFFFFFF,
    fontWeight: 'bold'
  });
  questionMark.position.set(size / 2, size / 2);
  questionMark.anchor.set(0.5);
  object.addChild(questionMark);

  let bounceCount = 0;
  const originalY = y;

  unit.on('update', () => {
    if (bounceCount > 0) {
      const progress = 1 - bounceCount / 10;
      object.y = originalY - Math.sin(progress * Math.PI) * 10;
      bounceCount--;
      if (bounceCount === 0) {
        object.y = originalY;
      }
    }
  });

  return {
    getBounds: () => ({ x, y: object.y, width: size, height: size }),
    hit: () => {
      if (!hit) {
        hit = true;
        bounceCount = 10;
        graphics.clear();
        graphics.rect(0, 0, size, size);
        graphics.fill(0x8B4513);
        graphics.stroke({ color: 0x654321, width: 2 });
        questionMark.visible = false;

        // Spawn coin
        xnew(CoinPop, { x: x + size / 2, y: y - 10, state });
        unit.playSound('coin');
        state.coins++;
        state.score += 100;
      }
    },
    playSound: (type) => {
      if (type === 'coin') {
        const synth = xnew.audio.synthesizer({
          oscillator: { type: 'square' },
          amp: { envelope: { amount: 0.2, ADSR: [0, 50, 0.3, 100] } }
        });
        synth.press('B4', 100);
        xnew.timeout(() => synth.press('E5', 300), 100);
      }
    }
  };
}

function Coin(unit, { x, y, state }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);

  const size = 20;
  const graphics = new PIXI.Graphics();
  graphics.circle(size / 2, size / 2, size / 2);
  graphics.fill(0xFFD700);
  graphics.stroke({ color: 0xFFAE00, width: 2 });
  object.addChild(graphics);

  // Rotation animation
  let rotation = 0;
  unit.on('update', () => {
    rotation += 0.1;
    object.scale.x = Math.cos(rotation);
  });

  return {
    getBounds: () => ({ x, y, width: size, height: size }),
    collect: () => {
      state.coins++;
      state.score += 50;
      unit.playSound();
      unit.finalize();
    },
    playSound: () => {
      const synth = xnew.audio.synthesizer({
        oscillator: { type: 'sine' },
        amp: { envelope: { amount: 0.15, ADSR: [0, 30, 0.3, 80] } }
      });
      synth.press('E5', 150);
    }
  };
}

function CoinPop(unit, { x, y, state }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);

  const graphics = new PIXI.Graphics();
  graphics.circle(0, 0, 8);
  graphics.fill(0xFFD700);
  object.addChild(graphics);

  let vy = -8;
  const gravity = 0.4;

  unit.on('update', () => {
    object.y += vy;
    vy += gravity;

    if (object.y > y + 50) {
      unit.finalize();
    }
  });
}

function Mario(unit, { state }) {
  const object = xpixi.nest(new PIXI.Container());
  const startX = 100;
  const startY = 400;
  object.position.set(startX, startY);

  // Mario sprite (simple rectangle for now)
  const graphics = new PIXI.Graphics();
  graphics.rect(-10, -20, 20, 30);
  graphics.fill(0xFF0000);
  graphics.rect(-10, -20, 20, 10);
  graphics.fill(0xFFFFFF); // Face
  graphics.rect(-10, 10, 20, 10);
  graphics.fill(0x0000FF); // Pants
  object.addChild(graphics);

  let vx = 0;
  let vy = 0;
  let onGround = false;
  let direction = 1;
  const speed = 4;
  const jumpPower = -12;

  unit.on('+moveleft', () => {
    vx = -speed;
    direction = -1;
    object.scale.x = -1;
  });

  unit.on('+moveright', () => {
    vx = speed;
    direction = 1;
    object.scale.x = 1;
  });

  unit.on('+stop', () => {
    vx = 0;
  });

  unit.on('+jump', () => {
    if (onGround && !state.gameOver) {
      vy = jumpPower;
      onGround = false;
      unit.playSound('jump');
    }
  });

  unit.on('update', () => {
    if (state.gameOver) return;

    // Apply gravity
    vy += state.gravity;

    // Update position
    object.x += vx;
    object.y += vy;

    // Reset onGround
    onGround = false;

    // Check platform collisions
    for (const platform of xnew.find(Platform)) {
      const bounds = platform.getBounds();
      if (checkCollision(object, bounds)) {
        // Landing on platform
        if (vy > 0 && object.y < bounds.y + bounds.height / 2) {
          object.y = bounds.y;
          vy = 0;
          onGround = true;
        }
        // Hitting platform from below
        else if (vy < 0 && object.y > bounds.y + bounds.height / 2) {
          object.y = bounds.y + bounds.height + 20;
          vy = 0;
        }
      }
    }

    // Check question block collisions
    for (const block of xnew.find(QuestionBlock)) {
      const bounds = block.getBounds();
      if (checkCollision(object, bounds)) {
        if (vy < 0 && object.y > bounds.y + bounds.height / 2) {
          block.hit();
          object.y = bounds.y + bounds.height + 20;
          vy = 0;
        }
      }
    }

    // Check coin collisions
    for (const coin of xnew.find(Coin)) {
      const bounds = coin.getBounds();
      if (checkCollision(object, bounds)) {
        coin.collect();
      }
    }

    // Check enemy collisions
    for (const enemy of xnew.find(Goomba)) {
      const bounds = enemy.getBounds();
      if (checkCollision(object, bounds)) {
        // Jump on enemy
        if (vy > 0 && object.y < bounds.y - 5) {
          enemy.defeat();
          vy = -8;
          state.score += 200;
        } else {
          // Hit by enemy
          unit.emit('+gameover');
        }
      }
    }

    // Screen boundaries
    if (object.x < 10) object.x = 10;
    if (object.x > xpixi.canvas.width - 10) object.x = xpixi.canvas.width - 10;

    // Fall off screen
    if (object.y > xpixi.canvas.height) {
      unit.emit('+gameover');
    }
  });

  function checkCollision(mario, bounds) {
    const marioWidth = 20;
    const marioHeight = 30;
    return (
      mario.x + marioWidth / 2 > bounds.x &&
      mario.x - marioWidth / 2 < bounds.x + bounds.width &&
      mario.y + marioHeight / 2 > bounds.y &&
      mario.y - marioHeight / 2 < bounds.y + bounds.height
    );
  }

  return {
    respawn: () => {
      object.position.set(startX, startY);
      vx = 0;
      vy = 0;
      onGround = false;
    },
    playSound: (type) => {
      if (type === 'jump') {
        const synth = xnew.audio.synthesizer({
          oscillator: { type: 'square' },
          amp: { envelope: { amount: 0.2, ADSR: [0, 50, 0.4, 100] } }
        });
        synth.press('E4', 150);
      }
    }
  };
}

function Goomba(unit, { x, y, state }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);

  let defeated = false;

  // Goomba sprite (simple)
  const graphics = new PIXI.Graphics();
  graphics.rect(-15, -15, 30, 30);
  graphics.fill(0x8B4513);
  graphics.circle(-8, -8, 3);
  graphics.fill(0xFFFFFF);
  graphics.circle(8, -8, 3);
  graphics.fill(0xFFFFFF);
  object.addChild(graphics);

  let vx = -1.5;
  let vy = 0;

  unit.on('update', () => {
    if (defeated) return;
    if (state.gameOver) return;

    // Apply gravity
    vy += state.gravity;
    object.x += vx;
    object.y += vy;

    // Check platform collisions
    for (const platform of xnew.find(Platform)) {
      const bounds = platform.getBounds();
      if (checkCollision(bounds)) {
        if (vy > 0) {
          object.y = bounds.y;
          vy = 0;
        }
      }
    }

    // Reverse direction at edges
    if (object.x < 50 || object.x > xpixi.canvas.width - 50) {
      vx = -vx;
    }

    // Check other goombas for direction change
    for (const other of xnew.find(Goomba)) {
      if (other === unit) continue;
      const otherBounds = other.getBounds();
      if (otherBounds && checkCollision(otherBounds)) {
        vx = -vx;
      }
    }
  });

  function checkCollision(bounds) {
    const width = 30;
    const height = 30;
    return (
      object.x + width / 2 > bounds.x &&
      object.x - width / 2 < bounds.x + bounds.width &&
      object.y + height / 2 > bounds.y &&
      object.y - height / 2 < bounds.y + bounds.height
    );
  }

  return {
    getBounds: () => defeated ? null : { x: object.x, y: object.y, width: 30, height: 30 },
    defeat: () => {
      defeated = true;
      object.alpha = 0.5;
      graphics.clear();
      graphics.rect(-15, -5, 30, 10);
      graphics.fill(0x8B4513);
      unit.playSound();
      xnew.timeout(() => unit.finalize(), 500);
    },
    playSound: () => {
      const synth = xnew.audio.synthesizer({
        oscillator: { type: 'triangle' },
        amp: { envelope: { amount: 0.15, ADSR: [0, 100, 0.3, 150] } }
      });
      synth.press('C3', 250);
    }
  };
}
