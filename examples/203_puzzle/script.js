const width = 800, height = 600;

function Main(self) {
  xnew(xnew.Screen, { width, height });
  xpixi.setup();

  xnew(TitleScene);
  self.on('+addscene', xnew);
}

function TitleScene(self) {
  xnew(TitleText);

  xnew(window).on('keydown pointerdown', () => {
    self.emit('+addscene', GameScene);
    self.finalize();
  });
}

function TitleText(self) {
  const object = xpixi.nest(new PIXI.Text('touch start', { fontSize: 32, fill: 0x000000 }));
  object.position.set(width / 2, height / 2);
  object.anchor.set(0.5);
}

function GameScene(self) {
  xmatter.setup();

  xnew(Controller);
  xnew(ScoreText);
  xnew(Bowl);

  const balls = [];
  xnew(Queue, balls);
  xnew(Cursor, balls);

  self.on('+addobject', xnew);
  self.on('+gameover', () => {
    xnew(GameOverText);
    self.stop();

    xnew(window).on('keydown pointerdown', () => {
      self.emit('+addscene', TitleScene);
      self.finalize();
    });
  });
}

function Controller(self) {
  const screen = xnew.find(xnew.Screen)[0];
  screen.on('-pointermove', ({ position }) => {
    self.emit('+move', { x: position.x });
  });
  screen.on('-pointerdown', ({ position }) => {
    self.emit('+move', { x: position.x });
    self.emit('+action');
  });
}

function ScoreText(self) {
  const object = xpixi.nest(new PIXI.Text('score 0', { fontSize: 32, fill: 0x000000 }));
  object.position.set(width - 10, 10);
  object.anchor.set(1, 0);

  let sum = 0;
  self.on('+scoreup', (score) => object.text = `score ${sum += score}`);
}

function Bowl(self) {
  for (let angle = 0; angle <= 180; angle++) {
    const x = 400 + Math.cos(angle * Math.PI / 180) * 280;
    const y = 310 + Math.sin(angle * Math.PI / 180) * 280;
    xnew(Circle, { x, y, r: 8, color: 0x00AAAA }, { isStatic: true });
  }
}

function Queue(self, balls) {
  for(let i = 0; i < 4; i++) {
    balls.push(Math.random() * Math.PI * 2);
  }

  xnew((self) => {
    const object = xpixi.nest(new PIXI.Container());
    object.addChild(new PIXI.Graphics().moveTo(0, -25).lineTo(80, -25).stroke({ color: 0x000000, width: 8 }));
    object.addChild(new PIXI.Graphics().moveTo(0, +25).lineTo(80, +25).stroke({ color: 0x000000, width: 8 }));
    object.position.set(0, 40);
  });
 
  xnew((self) => {
    const object = xpixi.nest(new PIXI.Container());
    const circle1 = xnew(Circle, { x: 1 * 30, y: 0, r: 20, color: hueToCol(balls[3]) }, { isStatic: true });
    const circle2 = xnew(Circle, { x: 2 * 30, y: 0, r: 20, color: hueToCol(balls[2]) }, { isStatic: true });
    const circle3 = xnew(Circle, { x: 3 * 30, y: 0, r: 20, color: hueToCol(balls[1]) }, { isStatic: true });

    object.position.set(-20, 40);
    self.on('+reload', () => {
      balls.shift();
      balls.push(Math.random() * Math.PI * 2);
      circle1.color = hueToCol(balls[3]);
      circle2.color = hueToCol(balls[2]);
      circle3.color = hueToCol(balls[1]);
      xnew.transition(({ progress }) => {
        object.x = 30 * progress - 50;
        if (progress === 1.0) {
          self.emit('+reloadcomplete');
        }
      }, 500);
    });
  });
}

function Cursor(self, balls) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(400, 40);

  const circle = new PIXI.Graphics().circle(0, 0, 32).fill(hueToCol(balls[0]));
  object.addChild(circle);
  object.addChild(new PIXI.Graphics().moveTo(-12, 0).lineTo(12, 0).stroke({ color: 0xFFFFFF, width: 4 }));
  object.addChild(new PIXI.Graphics().moveTo(0, -12).lineTo(0, 12).stroke({ color: 0xFFFFFF, width: 4 }));

  self.on('+move', ({ x }) => object.x = Math.max(Math.min(x, width / 2 + 240), width / 2 - 240));

  let reloaded = true;
  self.on('+reloadcomplete', () => reloaded = true);
  self.on('+action', () => {
    if (reloaded === true) {
      reloaded = false;
      self.emit('+addobject', ColorBall, { x: object.x, y: object.y, hue: balls[0], score: 1 });
      self.emit('+reload');
      circle.clear().circle(0, 0, 32).fill(hueToCol(balls[0]));
    } 
  });

  return {
    update() {
      object.rotation += 0.02;
    }
  }
}

function ColorBall(self, { x, y, hue = 0, score = 1 }) {
  const r = 28 + 3 * score;
  xnew.extend(Circle, { x, y, r, color: hueToCol(hue) });

  self.emit('+scoreup', score);
  xnew(ColorBallText, { hue, score });
  
  return {
    r, hue, score, isMearged: false,
    update() {
      if (self.object.y > height - 10) {
        self.emit('+gameover');
      }
      for (const target of xnew.find(ColorBall)) {
        if (self.mergeCheck(target)) {
          const score = self.score + target.score;
          const hue = meanHue(self.hue, target.hue);
          const x = (self.object.x * self.score + target.object.x * target.score) / score;
          const y = (self.object.y * self.score + target.object.y * target.score) / score;
          xnew.timer(() => {
            self.emit('+addobject', ColorBall, { x, y, hue, score });
            self.finalize();
            target.finalize();
          });
          self.isMearged = true;
          target.isMearged = true;
        }
      }
    },
    mergeCheck(target) {
      if (self === target || self.score !== target.score) return false;
      if (self.isMearged === true || target.isMearged === true) return false;
      if (diffHue(self.hue, target.hue) > Math.PI * 0.25) return false;
      const dx = target.object.x - self.object.x;
      const dy = target.object.y - self.object.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > self.r + target.r + 0.01) return false;
      return true;
    }
  }
}

function ColorBallText(self, { score }) {
  const object = xpixi.nest(new PIXI.Text(score, { fontSize: 34 + 6 * score, fill: 0xffffff }));
  object.anchor.set(0.5);
}

function GameOverText(self) {
  const object = xpixi.nest(new PIXI.Text('game over', { fontSize: 32, fill: 0x000000 }));
  object.position.set(width / 2, height / 2);
  object.anchor.set(0.5);
}

function Circle(self, { x, y, r, color = 0xFFFFFF }, options = {}) {
  const object = xpixi.nest(new PIXI.Container());
  const pyshics = xmatter.nest(Matter.Bodies.circle(x, y, r, options));
  const graphics = new PIXI.Graphics().circle(0, 0, r).fill(color);
  object.position.set(x, y);
  object.addChild(graphics);
  return {
    object,
    update() {
      object.rotation = pyshics.angle;
      object.position.set(pyshics.position.x, pyshics.position.y);
    },
    set color(color) {
      graphics.clear().circle(0, 0, r).fill(color);
    },
  };
}

// --------------------------------------------------
// color functions
// --------------------------------------------------

function hueToCol(hue) {
  const [h, s, v] = [hue, 0.9, 0.9];
  const r = h * 180.0 / Math.PI;
  const i = Math.floor(r / 60);
  const f = r / 60 - i;
  const x = Math.floor(255 * v);
  const p = Math.floor(255 * v * (1 - s));
  const q = Math.floor(255 * v * (1 - f * s));
  const t = Math.floor(255 * v * (1 - (1 - f) * s));
  let col = [0, 0, 0];
  switch (i % 6) {
    case 0: col = [x, t, p]; break;
    case 1: col = [q, x, p]; break;
    case 2: col = [p, x, t]; break;
    case 3: col = [p, q, x]; break;
    case 4: col = [t, p, x]; break;
    case 5: col = [x, p, q]; break;
  }
  return 256 * 256 * col[0] + 256 * col[1] + col[2];
}

function meanHue(a, b) {
  const mean = (a + b) / 2;
  return Math.abs(a - b) < Math.PI ? mean : (mean < Math.PI ? mean + Math.PI : mean - Math.PI);
}

function diffHue(a, b) {
  const diff = Math.abs(a - b);
  return diff < Math.PI ? diff : Math.PI * 2 - diff;
}