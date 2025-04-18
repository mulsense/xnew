const width = 400, height = 300;

function Main(self) {
  const screen = xnew(xnew.Screen, { width, height });
  screen.canvas.style.imageRendering = 'pixelated';
  xpixi.setup();

  xnew(window).on('keydown', (event) => event.preventDefault());
  self.on('touchstart contextmenu wheel', (event) => event.preventDefault());

  xnew(Background);
  xnew(TitleScene);
}

function Background(self) {
  for (let i = 0; i < 100; i++) {
    xnew(Dot);
  }
}

function Dot(self) {
  const object = xpixi.nest(new PIXI.Container());

  // random position
  object.position.set(Math.random() * width, Math.random() * height);

  // set circle
  object.addChild(new PIXI.Graphics().circle(0, 0, 1).fill(0xFFFFFF));

  let velocity = Math.random() + 0.1;
  return {
    update() {
      object.y += velocity;
      if (object.y > height) {
        object.position.set(Math.random() * width, 0);
      }
    }
  };
}

function TitleScene(self) {
  xnew(TitleText);

  xnew(window).on('keydown pointerdown', () => {
    xnew(self.parent, GameScene);
    self.finalize();
  });
}

function TitleText(self) {
  const object = xpixi.nest(new PIXI.Text('touch start', { fill: 0xFFFFFF }));
  object.position.set(width / 2, height / 2);
  object.anchor.set(0.5);
}

function GameScene(self) {
  xnew(Controller);
  xnew(ScoreText);
  xnew(Player);
  const interval = xnew.interval(() => xnew(Enemy), 500);

  self.on('+gameover', () => {
    interval.clear();
    xnew(GameOverText);

    xnew(window).on('keydown pointerdown', () => {
      xnew(self.parent, TitleScene)
      self.finalize();
    });
  });
}

function Controller(self) {
  const dpad = xnew({ style: 'position: absolute; left: 10px; bottom: 20px;' }, xutil.DPad, { size: 130 });
  dpad.on('-down -move -up', ({ vector }) => self.emit('+move', vector));

  const button = xnew({ style: 'position: absolute; right: 20px; bottom: 20px;' }, xutil.CircleButton);
  button.on('-down', () => self.emit('+action'));

  const keyboard = xnew(xnew.Keyboard);
  keyboard.on('-arrowkeydown -arrowkeyup', ({ vector }) => self.emit('+move', vector));
  keyboard.on('-keydown', ({ code }) => {
    if (code === 'Space') {
      self.emit('+action')
    }
  });
}

function ScoreText(self) {
  const object = xpixi.nest(new PIXI.Text('score 0', { fontSize: 16, fill: 0xFFFFFF }));
  object.position.set(width, 0);
  object.anchor.set(1.0, 0.0);

  let sum = 0;
  self.on('+scoreup', (score) => object.text = `score ${sum += score}`);
}

function GameOverText(self) {
  const object = xpixi.nest(new PIXI.Text('game over', { fill: 0xFFFFFF }));
  object.position.set(width / 2, height / 2);
  object.anchor.set(0.5);
}

function Player(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(width / 2, height / 2);

  xnew.promise(PIXI.Assets.load('texture.png')).then((texture) => {
    const rects = [[0, 0, 32, 32], [32, 0, 32, 32]];
    const textures = rects.map((rect) => new PIXI.Texture({ source: texture, frame: new PIXI.Rectangle(...rect) }));
    const sprite = new PIXI.AnimatedSprite(textures);
    sprite.animationSpeed = 0.1;
    sprite.anchor.set(0.5);
    sprite.play();
    object.addChild(sprite);
  });

  let velocity = { x: 0, y: 0 };
  self.on('+move', (vector) => velocity = vector);
  self.on('+action', () => xnew(self.parent, Shot, object.x, object.y));

  return {
    update() {
      // move limitation
      object.x = Math.min(Math.max(object.x + velocity.x * 2, 10), width - 10);
      object.y = Math.min(Math.max(object.y + velocity.y * 2, 10), height - 10);

      // detect collision
      for (const enemy of xnew.find(Enemy)) {
        if (enemy.distance(object) < 15) {
          enemy.clash(1);
          self.emit('+gameover');
          self.finalize();
          return;
        }
      }
    },
  };
}

function Shot(self, x, y) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().ellipse(0, 0, 2, 12).fill(0x22FFFF));

  soundShot();
  return {
    update() {
      object.y -= 8;

      // finalize when out of screen
      if (object.y < 0) {
        self.finalize();
        return;
      }
      
      // detect collision
      for (const enemy of xnew.find(Enemy)) {
        if (enemy.distance(object) < 15) {
          enemy.clash(1);
          self.finalize();
          return;
        }
      }
    },
  };
}

function Enemy(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(Math.random() * width, 0);
  xnew.promise(PIXI.Assets.load('texture.png')).then((texture) => {
    const rects = [[0, 32, 32, 32], [32, 32, 32, 32], [64, 32, 32, 32]];
    const textures = rects.map((rect) => new PIXI.Texture({ source: texture, frame: new PIXI.Rectangle(...rect) }));
    const sprite = new PIXI.AnimatedSprite(textures);
    sprite.animationSpeed = 0.1;
    sprite.anchor.set(0.5);
    sprite.play();
    object.addChild(sprite);
  });

  // set velocity and angle of the object
  const v = Math.random() * 2 + 1;
  const a = Math.random() * (Math.PI / 2) + Math.PI / 4;
  const velocity = { x: v * Math.cos(a), y: v * Math.sin(a)};

  return {
    update() {
      // move in the opposite direction at the edge of the screen
      if (object.x < 10) velocity.x = +Math.abs(velocity.x);
      if (object.x > width - 10) velocity.x = -Math.abs(velocity.x);
      if (object.y < 10) velocity.y = +Math.abs(velocity.y);
      if (object.y > height - 10) velocity.y = -Math.abs(velocity.y);

      object.x += velocity.x;
      object.y += velocity.y;
    },
    clash(score) {
      soundClash(score);
      for (let i = 0; i < 4; i++) {
        xnew(self.parent, CrashStar, object.x, object.y, score);
      }
      xnew(self.parent, CrashText, object.x, object.y, score);

      self.emit('+scoreup', score);
      self.finalize();
    },
    distance(target) {
      const dx = target.x - object.x;
      const dy = target.y - object.y;
      return Math.sqrt(dx * dx + dy * dy);
    },
  };
}

function CrashText(self, x, y, score) {
  const object = xpixi.nest(new PIXI.Text(`+ ${score}`, { fontSize: 12, fill: '#FFFF22' }));
  object.position.set(x, y);
  object.anchor.set(0.5);

  xnew.timer(() => self.finalize(), 1000);

  return {
    update(count) {
      // bounding
      object.y = y - 50 * Math.exp(-count / 20) * Math.abs(Math.sin(Math.PI * (count * 10) / 180)); 
    },
  }
}

function CrashStar(self, x, y, score) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);

  xnew.promise(PIXI.Assets.load('texture.png')).then((texture) => {
    const sprite = new PIXI.Sprite(new PIXI.Texture({ source: texture, frame: new PIXI.Rectangle(0, 64, 32, 32) }));
    sprite.anchor.set(0.5);
    object.addChild(sprite);
  });

  const v = Math.random() * 2 + 1;
  const a = Math.random() * 2 * Math.PI;
  const velocity = { x: v * Math.cos(a), y: v * Math.sin(a)};

  xnew.timer(() => self.finalize(), 800);

  return {
    update(count) {
      object.x += velocity.x;
      object.y += velocity.y;
      object.rotation = count / 10;
      object.alpha = 1 - count / 100;

      // detect collision
      for (const enemy of xnew.find(Enemy)) {
        if (enemy.distance(object) < 15) {
          enemy.clash(score * 2);
          self.finalize();
          return;
        }
      }
    },
  };
}

function soundShot() {
  const duration = 200;
  const synth = xaudio.synthesizer({
    oscillator: { type: 'square', envelope: { amount: 36, ADSR: [0, 200, 0.2, 200], }, },
    amp: { envelope: { amount: 0.1, ADSR: [0, 100, 0.2, 200], },},
  });
  synth.press('E3', duration); 
}

function soundClash(score) {
  // convert svore(1->0, 2->1, 4->2, 8->3, ...)
  const v = Math.log2(score);
  const duration = 200;
  const synth = xaudio.synthesizer({
    oscillator: { type: 'triangle', },
    amp: { envelope: { amount: 0.1, ADSR: [0, 200, 0.0, 0], }, },
  });
  synth.press(440 * Math.pow(2, (v * 2 + 0) / 12), duration, 0); 
  synth.press(440 * Math.pow(2, (v * 2 + 8) / 12), duration, 100); 
  synth.press(440 * Math.pow(2, (v * 2 + 12) / 12), duration, 200); 
}