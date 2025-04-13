const width = 400, height = 300;

function Main(self) {
  const screen = xnew(xnew.Screen, { width, height });
  screen.canvas.style.imageRendering = 'pixelated';

  xpixi.setup({
    renderer: PIXI.autoDetectRenderer({
      width: screen.canvas.width, height: screen.canvas.height, view: screen.canvas
    }) 
  });
  xnew(window).on('touchstart contextmenu wheel keydown', (event) => {
    event.preventDefault();
  });

  xnew(Background);
  xnew(TitleScene);
}

function Background(self) {
  xpixi.nest(new PIXI.Container());

  for (let i = 0; i < 100; i++) {
    xnew(Dot);
  }
}

function Dot(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(Math.random() * width, Math.random() * height);

  const graphics = new PIXI.Graphics();
  object.addChild(graphics);
  graphics.beginFill(0xFFFFFF);
  graphics.drawCircle(0, 0, 1);
  graphics.endFill();

  let velocity = Math.random() + 0.1;
  return {
    update() {
      object.y += velocity;
      if (object.y > height) {
        velocity = Math.random() + 0.1;
        object.x = Math.random() * width;
        object.y = 0;
      }
    }
  };
}

function TitleScene(self) {
  xpixi.nest(new PIXI.Container());
  
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
  xpixi.nest(new PIXI.Container());
  
  xnew(Controller);
  xnew(Score);
  xnew(Player);

  xnew.interval(() => {
    if (xnew.find(Enemy).length < 100) {
      xnew(Enemy);
    }
  }, 500);

  self.on('+gameover', () => {
    xnew(GameOverText);

    // receive touch event
    xnew(window).on('keydown pointerdown', () => {
      xnew(self.parent, TitleScene)
      self.finalize();
    });
  });
}

function Controller(self) {
  const dpad = xnew({ style: 'position: absolute; left: 10px; bottom: 20px; z-index: 10;' }, xutil.DPad, { size: 130 });
  dpad.on('-down -move -up', ({ vector }) => {
    self.emit('+move', { x: vector.x * 0.7, y: vector.y * 0.7 });
  })

  const button = xnew({ style: 'position: absolute; right: 20px; bottom: 20px; z-index: 10;' }, xutil.CircleButton);
  button.on('-down', () => {
    self.emit('+action');
  })

  const keyboard = xnew(xnew.Keyboard);
  keyboard.on('-arrowkeydown -arrowkeyup', ({ vector }) => {
    self.emit('+move', { x: vector.x * 0.7, y: vector.y * 0.7 });
  });
  keyboard.on('-keydown', ({ code }) => {
    if (code === 'Space') {
      self.emit('+action')
    }
  });
}

function Score(self) {
  const object = xpixi.nest(new PIXI.Text('', { fontSize: 16, fill: 0xFFFFFF }));
  object.position.set(width, 0);
  object.anchor.set(1.0, 0.0);
  object.text = `score 0`;

  let sum = 0;
  self.on('+scoreup', (score) => {
    object.text = `score ${sum += score}`;
  });
}

function GameOverText(self) {
  const object = xpixi.nest(new PIXI.Text('game over', { fill: 0xFFFFFF }));
  object.position.set(width / 2, height / 2);
  object.anchor.set(0.5);
}

function Player(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(width / 2, height / 2);

  const texture = PIXI.Texture.from('texture.png');

  // extract part of the texture
  const textures = [
    new PIXI.Texture(texture, new PIXI.Rectangle(0, 0, 32, 32)), 
    new PIXI.Texture(texture, new PIXI.Rectangle(32, 0, 32, 32)),
  ];

  // set the textures to a sprite and switch at a certain speed
  const sprite = new PIXI.AnimatedSprite(textures);
  object.addChild(sprite);
  sprite.animationSpeed = 0.1;
  sprite.anchor.set(0.5);
  sprite.play();

  // receive events from Input component
  let velocity = { x: 0, y: 0 };
  self.on('+move', (vector) => velocity = vector);
  self.on('+action', () => {
    xnew(self.parent, Shot, object.x, object.y);
  });

  return {
    update() {
      // move the position of the object, just keep it from going off screen.
      object.x = Math.min(Math.max(object.x + velocity.x * 2, 10), width - 10);
      object.y = Math.min(Math.max(object.y + velocity.y * 2, 10), height - 10);

      // detect collision
      for (const enemy of xnew.find(Enemy)) {
        if (enemy.distance(object) < 15) {
          enemy.clash(1);
          self.gameover();
          return;
        }
      }
    },
    gameover() {  
      self.emit('+gameover');
      self.finalize();
    }
  };
}

function Shot(self, x, y) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);

  // set ellipse shape to the object
  const graphics = new PIXI.Graphics();
  object.addChild(graphics);
  graphics.beginFill(0x22FFFF);
  graphics.drawEllipse(0, 0, 2, 12);
  graphics.endFill();

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

  const texture = PIXI.Texture.from('texture.png');

  // extract part of the texture
  const textures = [
    new PIXI.Texture(texture, new PIXI.Rectangle(0, 32, 32, 32)),
    new PIXI.Texture(texture, new PIXI.Rectangle(32, 32, 32, 32)),
    new PIXI.Texture(texture, new PIXI.Rectangle(64, 32, 32, 32)),
  ];

  // set the textures to a sprite and switch at a certain speed
  const sprite = new PIXI.AnimatedSprite(textures);
  object.addChild(sprite);
  sprite.animationSpeed = 0.1;
  sprite.anchor.set(0.5);
  sprite.play();

  // set a random position for the top of the screen
  object.x = Math.random() * width;
  object.y = 0;

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
      for(let i = 0; i < 4; i++) {
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

  let t = 0;
  return {
    update() {
      object.y = y - 50 * Math.exp(-t / 20) * Math.abs(Math.sin(Math.PI * (t * 10) / 180)); 
      t++;
    },
  }
}

function CrashStar(self, x, y, score) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);

  const sprite = new PIXI.Sprite();
  object.addChild(sprite);
  sprite.texture = new PIXI.Texture(PIXI.Texture.from('texture.png'), new PIXI.Rectangle(0, 64, 32, 32));
  sprite.anchor.set(0.5);

  // set velocity and angle of the object
  const v = Math.random() * 2 + 1;
  const a = Math.random() * 2 * Math.PI;
  const velocity = { x: v * Math.cos(a), y: v * Math.sin(a)};

  xnew.timer(() => self.finalize(), 800);

  let t = 0;
  return {
    update() {
      object.x += velocity.x;
      object.y += velocity.y;
      object.rotation = t++ / 10;

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