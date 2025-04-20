const width = 800, height = 600;

function Main(self) {
  xnew(xnew.Screen, { width, height });
  xpixi.setup();
  xnew(Background);
  xnew(TitleScene);
}

function Background(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.addChild(new PIXI.Graphics().rect(0, 0, width, height).fill(0xFFFFFF));
}

function TitleScene(self) {
  xnew(TitleText);

  xnew(window).on('keydown pointerdown', () => {
    xnew(self.parent, GameScene);
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

  const list = [];
  xnew(Queue, list);
  xnew(Cursor, list);

  self.on('+addball', ({ x, y, hue, score }) => {
    xnew(ColorBall, { x, y, r: 26 + 3 * score, hue, score });
  });

  self.on('+gameover', () => {
    xnew(GameOverText);
    self.stop();

    xnew(window).on('keydown pointerdown', () => {
      xnew(self.parent, TitleScene)
      self.finalize();
    });
  });
}

function Controller(self) {
  const screen = xnew.find(xnew.Screen)[0];
  const pointer = xnew(screen.canvas, xnew.PointerEvent);
  pointer.on('-pointermove', ({ position }) => {
    self.emit('+move', { x: position.x * screen.scale.x });
  });
  pointer.on('-pointerdown', ({ position }) => {
    self.emit('+action');
  });
}

function Queue(self, list) {
  for(let i = 0; i < 4; i++) {
    list.push(Math.random() * Math.PI * 2);
  }

  xnew((self) => {
    const object = xpixi.nest(new PIXI.Container());
    object.addChild(new PIXI.Graphics().moveTo(0, 5).lineTo(80, 5).stroke({ color: 0x000000, width: 6, cap: 'round' }));
    object.addChild(new PIXI.Graphics().moveTo(0, 55).lineTo(80, 55).stroke({ color: 0x000000, width: 6, cap: 'round' }));
    object.y = 10;
  });
 
  xnew((self) => {
    const object = xpixi.nest(new PIXI.Container());
    const circle3 = xnew(Circle, { x: 80 - 3 * 30, y: 40, r: 20, color: hueToHex(list[3]) }, { isStatic: true });
    const circle2 = xnew(Circle, { x: 80 - 2 * 30, y: 40, r: 20, color: hueToHex(list[2]) }, { isStatic: true });
    const circle1 = xnew(Circle, { x: 80 - 1 * 30, y: 40, r: 20, color: hueToHex(list[1]) }, { isStatic: true });

    self.on('+reload', () => {
      list.shift();
      list.push(Math.random() * Math.PI * 2);
      circle1.setColor(hueToHex(list[1]));
      circle2.setColor(hueToHex(list[2]));
      circle3.setColor(hueToHex(list[3]));
      xnew.transition(({ progress }) => {
        object.x = 30 * progress - 10;
        if (progress === 1.0) {
          self.emit('+reloadcomplete');
        }
      }, 500);
    });
    xnew.transition(({ progress }) => object.x = 30 * progress - 10, 1000);
  });
}

function Cursor(self, list) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(400, 50);

  const circle = new PIXI.Graphics().circle(0, 0, 32).fill(hueToHex(list[0]));
  object.addChild(circle);

  const line1 = new PIXI.Graphics().moveTo(-12, 0).lineTo(12, 0).stroke({ color: 0xFFFFFF, width: 4, cap: 'round' });
  const line2 = new PIXI.Graphics().moveTo(0, -12).lineTo(0, 12).stroke({ color: 0xFFFFFF, width: 4, cap: 'round' });
  object.addChild(line1);
  object.addChild(line2);

  self.on('+move', ({ x }) => {
    object.position.x = Math.max(Math.min(x, width / 2 + 260), width / 2 - 260);
  });

  let reloaded = true;
  self.on('+reloadcomplete', () => reloaded = true);
  self.on('+action', () => {
    if (reloaded === true) {
      reloaded = false;
      self.emit('+addball', { x: object.position.x, y: object.position.y, hue: list[0], score: 1 });
      self.emit('+reload');
      circle.clear().circle(0, 0, 32).fill(hueToHex(list[0]));
    } 
  });

  return {
    update() {
      object.rotation += 0.02;
    }
  }
}

function ScoreText(self) {
  const object = xpixi.nest(new PIXI.Text('score 0', { fontSize: 32, fill: 0x000000 }));
  object.position.set(width - 10, 0 + 10);
  object.anchor.set(1.0, 0.0);

  let sum = 0;
  self.on('+scoreup', (score) => object.text = `score ${sum += score}`);
}

function Bowl(self) {
  for (let angle = 0; angle <= 180; angle++) {
    const x = 400 + Math.cos(angle * Math.PI / 180) * 280;
    const y = 300 + Math.sin(angle * Math.PI / 180) * 280;
    xnew(Circle, { x, y, r: 8, color: 0x00AAAA }, { isStatic: true });
  }
}

function ColorBall(self, { x, y, r, hue = 0, score = 1 }) {
  xnew.extend(Circle, { x, y, r, color: hueToHex(hue) });

  self.emit('+scoreup', score);
  xnew(ColorBallText, { hue, score });
  
  let isClosed = false;
  return {
    update() {
      if (self.object.y > height - 10) {
        self.emit('+gameover');
        return;
      }
      
      for (const target of xnew.find(ColorBall)) {
        if (self.mergeCheck(target)) {
          const score = self.score + target.score;
          const hue = meanHue(self.hue, target.hue);
          const x = (self.object.x * self.score + target.object.x * target.score) / (self.score + target.score);
          const y = (self.object.y * self.score + target.object.y * target.score) / (self.score + target.score);
          xnew.timer(() => self.emit('+addball', { x, y, hue, score }), 1);
          self.close();
          target.close();
        }
      }
    },
    get r() {
      return r;
    },
    get hue() {
      return hue;
    },
    get isClosed() {
      return isClosed;
    },
    get score() {
      return score;
    },
    close() {
      isClosed = true;
      xnew.timer(() => self.finalize(), 10);
    },
    mergeCheck(target) {
      if (self === target || self.isClosed === true || target.isClosed === true) return false;
      const dx = target.object.x - self.object.x;
      const dy = target.object.y - self.object.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > self.r + target.r + 0.01) {
        return false;
      }
      if (self.score === target.score && diffHue(self.hue, target.hue) < Math.PI * 0.25) {
        return true;
      }
    }
  }
}

function ColorBallText(self, { score }) {
  const object = xpixi.nest(new PIXI.Text(`${score}`, { fontSize: 34 + 6 * score, fill: 0xffffff }));
  object.anchor.set(0.5);
}

function GameOverText(self) {
  const object = xpixi.nest(new PIXI.Text('game over', { fontSize: 32, fill: 0x000000 }));
  object.position.set(width / 2, height / 2);
  object.anchor.set(0.5);
}

function Circle(self, { x, y, r, color = 0xFFFFFF } = {}, options = {}) {
  const pyshics = xmatter.nest(Matter.Bodies.circle(x, y, r, options));
  const object = xpixi.nest(new PIXI.Container());
  const graphics = new PIXI.Graphics().circle(0, 0, r).fill(color);
  object.position.set(x, y);
  object.addChild(graphics);
  return {
    update() {
      object.rotation = pyshics.angle;
      object.position.set(pyshics.position.x, pyshics.position.y);
    },
    setColor(color) {
      graphics.clear().circle(0, 0, 20).fill(color);
    },
    get object() {
      return object;
    },
  };
}

// --------------------------------------------------
// color functions
// --------------------------------------------------

function hueToHex(hue) {
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
  return Math.floor(256 * 256 * col[0] + 256 * col[1] + col[2]);
}

function meanHue(a, b) {
  if (Math.abs(a - b) < Math.PI) {
    return (a + b) / 2;
  } else if (a + b < 2 * Math.PI) {
    return (a + b) / 2 + Math.PI;
  } else {
    return (a + b) / 2 - Math.PI;
  }
}

function diffHue(a, b) {
  if (Math.abs(a - b) < Math.PI) {
    return Math.abs(a - b);
  } else if (a > b)  {
    return Math.abs(a - b - Math.PI * 2);
  } else {
    return Math.abs(b - a - Math.PI * 2);
  }
}