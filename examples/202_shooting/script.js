const width = 800, height = 600;

function Main(self) {
  xnew(xnew.Screen, { width, height });
  xpixi.setup();

  xnew(Background);
  xnew(TitleScene);
  self.on('+addscene', xnew);
}

function Background(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.addChild(new PIXI.Graphics().rect(0, 0, width, height).fill(0x000000));

  for (let i = 0; i < 100; i++) {
    xnew(Dot);
  }
}

function Dot(self) {
  const object = xpixi.nest(new PIXI.Container());

  // random position
  object.position.set(Math.random() * width, Math.random() * height);
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
    self.emit('+addscene', GameScene);
    self.finalize();
  });
}

function TitleText(self) {
  const object = xpixi.nest(new PIXI.Text('touch start', { fontSize: 32, fill: 0xFFFFFF }));
  
  // center
  object.position.set(width / 2, height / 2);
  object.anchor.set(0.5);
}

function GameScene(self) {
  xnew(Controller);
  xnew(ScoreText);
  xnew(Player);
  const interval = xnew.interval(() => xnew(Enemy), 500);
  self.on('+addobject', xnew);

  self.on('+gameover', () => {
    interval.clear();
    xnew(GameOverText);

    xnew(window).on('keydown pointerdown', () => {
      self.emit('+addscene', TitleScene);
      self.finalize();
    });
  });
}

function Controller(self) {
  // prevent default event
  xnew(window).on('keydown', (event) => event.preventDefault());
  self.on('touchstart contextmenu wheel', (event) => event.preventDefault());
  
  // virtual D-Pad
  const dpad = xnew({ style: 'position: absolute; left: 10px; bottom: 20px;' }, xutil.DPad, { size: 130 });
  dpad.on('-down -move -up', ({ vector }) => self.emit('+move', vector));

  // virtual button
  const button = xnew({ style: 'position: absolute; right: 20px; bottom: 20px;' }, xutil.CircleButton);
  button.on('-down', () => self.emit('+shot'));

  // keyboard
  const keyboard = xnew(xnew.Keyboard);
  keyboard.on('-arrowkeydown -arrowkeyup', ({ vector }) => self.emit('+move', vector));
  keyboard.on('-keydown', ({ code }) => {
    if (code === 'Space') {
      self.emit('+shot')
    }
  });
}

function ScoreText(self) {
  const object = xpixi.nest(new PIXI.Text('score 0', { fontSize: 32, fill: 0xFFFFFF }));

  // top right
  object.position.set(width - 10, 0 + 10);
  object.anchor.set(1.0, 0.0);

  let sum = 0;
  self.on('+scoreup', (score) => object.text = `score ${sum += score}`);
}

function GameOverText(self) {
  const object = xpixi.nest(new PIXI.Text('game over', { fontSize: 32, fill: 0xFFFFFF }));
  
  // center
  object.position.set(width / 2, height / 2);
  object.anchor.set(0.5);
}

function Player(self) {
  const object = xpixi.nest(new PIXI.Container());

  // center
  object.position.set(width / 2, height / 2);
  setSprite(object, [[0, 0, 32, 32], [32, 0, 32, 32]]);

  // actions
  let velocity = { x: 0, y: 0 };
  self.on('+move', (vector) => velocity = vector);
  self.on('+shot', () => self.emit('+addobject', Shot, object.x, object.y));
  self.on('+shot', () => self.sound());

  return {
    update() {
      object.x += velocity.x * 2;
      object.y += velocity.y * 2;

      // limitation (10 < x < width - 10, 10 < y < height - 10)
      object.x = Math.min(Math.max(object.x, 10), width - 10);
      object.y = Math.min(Math.max(object.y, 10), height - 10);

      // detect collision
      for (const enemy of xnew.find(Enemy)) {
        if (enemy.distance(object) < 30) {
          enemy.clash(1);
          self.emit('+gameover');
          self.finalize();
          return;
        }
      }
    },
    sound() {
      const synth = xaudio.synthesizer({
        oscillator: { type: 'square', envelope: { amount: 36, ADSR: [0, 200, 0.2, 200], }, },
        amp: { envelope: { amount: 0.1, ADSR: [0, 100, 0.2, 200], },},
      });
      synth.press('E3', 200); 
    }
  };
}

function Shot(self, x, y) {
  const object = xpixi.nest(new PIXI.Container());

  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().ellipse(0, 0, 4, 24).fill(0x22FFFF));

  return {
    update() {
      object.y -= 12;

      // finalize when out of screen
      if (object.y < 0) {
        self.finalize();
        return;
      }
      
      // detect collision
      for (const enemy of xnew.find(Enemy)) {
        if (enemy.distance(object) < 30) {
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
  setSprite(object, [[0, 32, 32, 32], [32, 32, 32, 32], [64, 32, 32, 32]]);

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
      self.sound(score);
      for (let i = 0; i < 4; i++) {
        self.emit('+addobject', Crash, object.x, object.y, score);
      }
      self.emit('+addobject', CrashText, object.x, object.y, score);

      self.emit('+scoreup', score);
      self.finalize();
    },
    distance(target) {
      const dx = target.x - object.x;
      const dy = target.y - object.y;
      return Math.sqrt(dx * dx + dy * dy);
    },
    sound(score) {
      const v = Math.log2(score); // convert svore (1->0, 2->1, 4->2, 8->3, ...)
      const synth = xaudio.synthesizer({
        oscillator: { type: 'triangle', },
        amp: { envelope: { amount: 0.1, ADSR: [0, 200, 0.0, 0], }, },
      });
      synth.press(440 * Math.pow(2, (v * 2 + 0) / 12), 200, 0); 
      synth.press(440 * Math.pow(2, (v * 2 + 8) / 12), 200, 100); 
      synth.press(440 * Math.pow(2, (v * 2 + 12) / 12), 200, 200); 
    }
  };
}

function CrashText(self, x, y, score) {
  const object = xpixi.nest(new PIXI.Text(`+ ${score}`, { fontSize: 24, fill: '#FFFF22' }));

  object.position.set(x, y);
  object.anchor.set(0.5);

  // remove this unit after 1 second
  xnew.timer(() => self.finalize(), 1000);

  return {
    update(count) {
      // bounding
      object.y = y - 50 * Math.exp(-count / 20) * Math.abs(Math.sin(Math.PI * (count * 10) / 180)); 
    },
  }
}

function Crash(self, x, y, score) {
  const object = xpixi.nest(new PIXI.Container());

  object.position.set(x, y);
  setSprite(object, [[0, 64, 32, 32]]);

  const v = Math.random() * 4 + 1; // 1 ~ 5
  const a = Math.random() * 2 * Math.PI; // 0 ~ 2PI
  const velocity = { x: v * Math.cos(a), y: v * Math.sin(a)};

  // remove this unit after 800ms
  xnew.timer(() => self.finalize(), 800);

  return {
    update(count) {
      object.x += velocity.x;
      object.y += velocity.y;
      object.rotation = count / 10;
      object.alpha = 1 - count / 100; // fade out

      // detect collision
      for (const enemy of xnew.find(Enemy)) {
        if (enemy.distance(object) < 30) {
          enemy.clash(score * 2);
          self.finalize();
          return;
        }
      }
    },
  };
}

function setSprite(object, rects) {
  xnew.promise(PIXI.Assets.load('texture.png')).then((texture) => {
    texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
    const textures = rects.map((rect) => new PIXI.Texture({ source: texture, frame: new PIXI.Rectangle(...rect) }));
    const sprite = new PIXI.AnimatedSprite(textures);
    sprite.animationSpeed = 0.1;
    sprite.anchor.set(0.5);
    sprite.scale.set(2);
    sprite.play();
    object.addChild(sprite);
  });
}
