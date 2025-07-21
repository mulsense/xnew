import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import xnew from 'xnew';
import xpixi from 'xnew/addons/xpixi';
import xmatter from 'xnew/addons/xmatter';

const width = 800, height = 600;

xnew('#main', Main);

function Main(self) {
  xnew(xnew.Screen, { width, height });
  xpixi.initialize();

  xnew(Background);
  xnew(TitleScene);
  self.on('+nextscene', xnew);
}

function Background(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.addChild(new PIXI.Graphics().rect(0, 0, width, height).fill(0xDDFFFF));
}

function TitleScene(self) {
  xnew(TitleText);

  xnew(window).on('keydown pointerdown', () => {
    xnew.emit('+nextscene', GameScene);
    self.finalize();
  });
}

function TitleText(self) {
  const object = xpixi.nest(new PIXI.Text('touch start', { fontSize: 32, fill: 0x000000 }));
  object.position.set(width / 2, height / 2);
  object.anchor.set(0.5);
}

function GameScene(self) {
  xmatter.initialize();
 
  xnew(Controller);
  xnew(ScoreText);
  xnew(Bowl);
  xnew(Cursor);
  xnew(Queue);
  xnew(QueueCover);
  self.on('+addobject', xnew);

  self.on('+gameover', () => {
    xnew(GameOverText);

    xnew(window).on('keydown pointerdown', () => {
      xnew.emit('+nextscene', TitleScene);
      self.finalize();
    });
  });
}

function Controller(self) {
  const screen = xnew.find(xnew.Screen)[0];
  const user = xnew(screen.canvas, xnew.UserEvent);
  user.on('-pointermove -pointerdown', ({ position }) => {
    xnew.emit('+move', { x: position.x * screen.scale.x });
  });
  user.on('-pointerdown', () => xnew.emit('+action'));
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

function Queue(self) {
  const object = xpixi.nest(new PIXI.Container());
 
  const balls = [...Array(4)].map(() => Math.random() * Math.PI * 2);
  const circle1 = xnew(Circle, { x: 1 * 30, y: 0, r: 20, color: hueToCol(balls[3]) }, { isStatic: true });
  const circle2 = xnew(Circle, { x: 2 * 30, y: 0, r: 20, color: hueToCol(balls[2]) }, { isStatic: true });
  const circle3 = xnew(Circle, { x: 3 * 30, y: 0, r: 20, color: hueToCol(balls[1]) }, { isStatic: true });
  xnew.emit('+reloadcomplete', balls[0]);

  object.position.set(-20, 40);
  self.on('+reload', () => {
    balls.shift();
    balls.push(Math.random() * Math.PI * 2);
    circle1.color = hueToCol(balls[3]);
    circle2.color = hueToCol(balls[2]);
    circle3.color = hueToCol(balls[1]);
    xnew.transition((progress) => {
      object.x = 30 * progress - 50;
      if (progress === 1.0) {
        xnew.emit('+reloadcomplete', balls[0]);
      }
    }, 500);
  });
}

function QueueCover(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.addChild(new PIXI.Graphics().moveTo(0, -25).lineTo(80, -25).stroke({ color: 0x000000, width: 8 }));
  object.addChild(new PIXI.Graphics().moveTo(0, +25).lineTo(80, +25).stroke({ color: 0x000000, width: 8 }));
  object.position.set(0, 40);
}

function Cursor(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(400, 40);

  const circle = new PIXI.Graphics();
  object.addChild(circle);
  object.addChild(new PIXI.Graphics().moveTo(-12, 0).lineTo(12, 0).stroke({ color: 0xFFFFFF, width: 4 }));
  object.addChild(new PIXI.Graphics().moveTo(0, -12).lineTo(0, 12).stroke({ color: 0xFFFFFF, width: 4 }));

  self.on('+move', ({ x }) => object.x = Math.max(Math.min(x, width / 2 + 240), width / 2 - 240));

  let next = null;
  self.on('+reloadcomplete', (hue) => {
    next = hue;
    circle.circle(0, 0, 32).fill(hueToCol(next));
  });
  self.on('+action', () => {
    if (next !== null) {
      circle.clear();
      xnew.emit('+addobject', ColorBall, { x: object.x, y: object.y, hue: next, score: 1 });
      xnew.emit('+reload');
      next = null;
    } 
  });
  self.on('update', () => {
    object.rotation += 0.02;
  });
}

function ColorBall(self, { x, y, hue = 0, score = 1 }) {
  const r = 28 + 3 * score;
  xnew.extend(Circle, { x, y, r, color: hueToCol(hue) });

  xnew.emit('+scoreup', score);
  xnew(ColorBallText, { hue, score });
  
  self.on('update', () => {
    if (self.object.y > height - 10) {
      xnew.emit('+gameover');
    }
    for (const target of xnew.find(ColorBall)) {
      if (self.mergeCheck(target)) {
        const score = self.score + target.score;
        const hue = meanHue(self.hue, target.hue);
        const x = (self.object.x * self.score + target.object.x * target.score) / score;
        const y = (self.object.y * self.score + target.object.y * target.score) / score;
        xnew.timeout(() => {
          xnew.emit('+addobject', ColorBall, { x, y, hue, score });
          self.finalize();
          target.finalize();
        });
        self.isMearged = true;
        target.isMearged = true;
      }
    }
  });

  return {
    r, hue, score, isMearged: false,
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

  self.on('update', () => {
    object.rotation = pyshics.angle;
    object.position.set(pyshics.position.x, pyshics.position.y);
  });
  return {
    object,
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