const width = 800, height = 600;

function Main(self) {
  xnew(xnew.Screen, { width, height });
  xpixi.setup();

  xnew(Background);
  xnew(TitleScene);
  self.on('+nextscene', xnew);
}

function Background(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.addChild(new PIXI.Graphics().rect(0, 0, width, height).fill(0x87CEEB)); // Sky blue background

  for (let i = 0; i < 50; i++) {
    xnew(Cloud);
  }
}

function Cloud(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(Math.random() * width, Math.random() * height / 2);
  object.addChild(new PIXI.Graphics().ellipse(0, 0, 50, 20).fill(0xFFFFFF));

  let velocity = Math.random() * 0.5 + 0.2;
  return {
    update() {
      object.x += velocity;
      if (object.x > width) {
        object.position.set(0, Math.random() * height / 2);
      }
    }
  };
}

function TitleScene(self) {
  xnew(TitleText);

  xnew(window).on('keydown pointerdown', () => {
    xnew.emit('+nextscene', GameScene);
    self.finalize();
  });
}

function TitleText(self) {
  const object = xpixi.nest(new PIXI.Text('Press to Start', { fontSize: 32, fill: 0xFFFFFF }));
  object.position.set(width / 2, height / 2);
  object.anchor.set(0.5);
}

function GameScene(self) {
  xnew(Player);
  xnew(ScoreText);
  const interval = xnew.interval(() => xnew(Enemy), 1000);

  self.on('+gameover', () => {
    interval.clear();
    xnew(GameOverText);

    xnew(window).on('keydown pointerdown', () => {
      xnew.emit('+nextscene', TitleScene);
      self.finalize();
    });
  });
}

function Player(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(width / 2, height - 50);
  object.addChild(new PIXI.Graphics().rect(-20, -20, 40, 40).fill(0xFF0000));

  let velocity = { x: 0, y: 0 };
  self.on('+move', (vector) => velocity = vector);

  return {
    update() {
      object.x += velocity.x * 5;
      object.x = Math.min(Math.max(object.x, 20), width - 20);
    }
  };
}

function Enemy(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(Math.random() * width, 0);
  object.addChild(new PIXI.Graphics().rect(-15, -15, 30, 30).fill(0x0000FF));

  return {
    update() {
      object.y += 3;
      if (object.y > height) {
        self.finalize();
      }
    }
  };
}

function ScoreText(self) {
  const object = xpixi.nest(new PIXI.Text('Score: 0', { fontSize: 24, fill: 0xFFFFFF }));
  object.position.set(10, 10);

  let score = 0;
  self.on('+scoreup', () => {
    score += 10;
    object.text = `Score: ${score}`;
  });
}

function GameOverText(self) {
  const object = xpixi.nest(new PIXI.Text('Game Over', { fontSize: 48, fill: 0xFF0000 }));
  object.position.set(width / 2, height / 2);
  object.anchor.set(0.5);
}