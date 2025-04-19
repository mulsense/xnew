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

  xnew(ScoreText);
  xnew(Bowl);

  const list = [];
  xnew(Queue, list);
  xnew(Cursor, list);

  self.on('+addball', ({ x, y, hue, score }) => {
    xnew(ColorBall, { x, y, r: 26 + 8 * score, hue, score });
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
function Queue(self, list) {
  const pobject = xpixi.nest(new PIXI.Container());
  for(let i = 0; i < 4; i++) {
    list.push(Math.random() * Math.PI * 2);
  }

  xnew((self) => {
    const pobject = xpixi.nest(new PIXI.Container());
    // pobject.addChild(new PIXI.Graphics().rect(0, 0, 100, 60).fill(0xAAAAAA));
    pobject.addChild(new PIXI.Graphics().rect(0, -5, 100, 8).fill(0x000000));
    pobject.addChild(new PIXI.Graphics().rect(0, +55, 100, 8).fill(0x000000));
    pobject.y = 10;
  });
 
  xnew((self) => {
    const pobject = xpixi.nest(new PIXI.Container());
    const circle3 = xnew(QueueCircle, list[3], 3);
    const circle2 = xnew(QueueCircle, list[2], 2);
    const circle1 = xnew(QueueCircle, list[1], 1);

    self.on('+reload', () => {
      list.shift();
      list.push(Math.random() * Math.PI * 2);
      circle1.setup(list[1]);
      circle2.setup(list[2]);
      circle3.setup(list[3]);
      pobject.x = -10;
    });
    pobject.x = -10;

    return {
      update() {
        if (pobject.x < 20) {
          pobject.x += 1;
        }
      }
    }
  });
}

function QueueCircle(self, hue, position) {
  const pobject = xpixi.nest(new PIXI.Container());
  const circle = new PIXI.Graphics().circle(0, 0, 20).fill(hsvToCol([hue, 0.9, 0.9]));
  pobject.addChild(circle);
  pobject.position.set(80 - position * 30, 40);
  return {
    setup(hue) {
      circle.clear().circle(0, 0, 20).fill(hsvToCol([hue, 0.9, 0.9]));
    }
  }
}

function Cursor(self, list) {
  const pobject = xpixi.nest(new PIXI.Container());

  const circle = new PIXI.Graphics().circle(0, 0, 32).fill(hsvToCol([list[0], 0.9, 0.9]));
  pobject.addChild(circle);

  const line1 = new PIXI.Graphics().moveTo(-12, 0).lineTo(12, 0).stroke({ color: 0xFFFFFF, width: 4, cap: 'round' });
  const line2 = new PIXI.Graphics().moveTo(0, -12).lineTo(0, 12).stroke({ color: 0xFFFFFF, width: 4, cap: 'round' });
  pobject.addChild(line1);
  pobject.addChild(line2);

  const screen = xnew.find(xnew.Screen)[0];
  const pointer = xnew(screen.canvas, xnew.PointerEvent);
  pointer.on('-pointermove', ({ position }) => {
    pobject.position.x = Math.max(Math.min(position.x * screen.scale.x, width / 2 + 260), width / 2 - 260);
  });
  pointer.on('-pointerdown', ({ position }) => {
    self.emit('+addball', { x: pobject.position.x, y: pobject.position.y, hue: list[0], score: 1 });

    self.emit('+reload');
    circle.clear().circle(0, 0, 32).fill(hsvToCol([list[0], 0.9, 0.9]));
  });

  pobject.position.set(400, 50);
  return {
    update() {
      pobject.rotation += 0.02;
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
    xnew(Circle, { x, y, r: 8, color: 0x00AAAA, isStatic: true });
  }
}

function ColorBall(self, { x, y, r, hue = 0, score = 1, isStatic = false }) {
  const col = hsvToCol([hue, 0.9, 0.9]);
  xnew.extend(Circle, { x, y, r, color: col, isStatic });

  self.emit('+scoreup', score);

  xnew(ColorText, { hue, score });
  
  let isActive = false;
  return {
    update() {
      if (self.mobject.position.y > height - 10) {
        self.emit('+gameover');
        return;
      }
      
      for (const target of xnew.find(ColorBall)) {
        if (self.mergeCheck(target)) {
          const score = self.score + target.score;
          const hue = meanHue(self.hue, target.hue);
          const x = (self.x * self.score + target.x * target.score) / (self.score + target.score);
          const y = (self.y * self.score + target.y * target.score) / (self.score + target.score);
          xnew.timer(() => self.emit('+addball', { x, y, hue, score }), 1);
          self.activate();
          target.activate();
        }
      }
    },
    get x() {
      return self.mobject.position.x;
    },
    get y() {
      return self.mobject.position.y;
    },
    get r() {
      return r;
    },
    get hue() {
      return hue;
    },
    get isActive() {
      return isActive;
    },
    get score() {
      return score;
    },
    activate() {
      isActive = true;
      xnew.timer(() => self.finalize(), 10);
    },
    mergeCheck(target) {
      if (self === target) return false;
      if (self.isActive === true || target.isActive === true) return false;
      const dx = target.x - self.x;
      const dy = target.y - self.y;
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
function ColorText(self, { hue, score }) {
  hue = hue + Math.PI;
  if (hue > Math.PI * 2) hue -= Math.PI * 2;
  const object = xpixi.nest(new PIXI.Text(`${score}`, { fontSize: 34 + 10 * score, fill: hsvToCol([0, 0, 1]) }));
  object.anchor.set(0.5);
}

function GameOverText(self) {
  const object = xpixi.nest(new PIXI.Text('game over', { fontSize: 32, fill: 0x000000 }));
  object.position.set(width / 2, height / 2);
  object.anchor.set(0.5);
}

function Rectangle(self, { x, y, w, h, color = 0xFFFFFF, isStatic = false } = {}) {
  const mobject = xmatter.nest(Matter.Bodies.rectangle(x, y, w, h, { isStatic }));
  const pobject = xpixi.nest(new PIXI.Container());
  pobject.position.set(x, y);
  pobject.addChild(new PIXI.Graphics().rect(-w / 2, -h / 2, w, h).fill(color));

  return {
    update() {
      pobject.rotation = mobject.angle;
      pobject.position.set(mobject.position.x, mobject.position.y);
    },
  };
}

function Circle(self, { x, y, r, color = 0xFFFFFF, isStatic = false } = {}) {
  const mobject = xmatter.nest(Matter.Bodies.circle(x, y, r, { isStatic }));
  const pobject = xpixi.nest(new PIXI.Container());
  pobject.position.set(x, y);
  pobject.addChild(new PIXI.Graphics().circle(0, 0, r).fill(color));
  return {
    update() {
      pobject.rotation = mobject.angle;
      pobject.position.set(mobject.position.x, mobject.position.y);
    },
    get pobject() {
      return pobject;
    },
    get mobject() {
      return mobject;
    },
  };
}

function hsvToCol([h, s, v]) {
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
  } else {
    if (a > b) {
      a -= Math.PI * 2;
    } else {
      b -= Math.PI * 2;
    }
    let mean = a + b;
    if (mean > Math.PI) {
      mean -= Math.PI * 2;
    } else if (mean < 0) {
      mean += Math.PI * 2;
    }
    return mean;
  }
}

function diffHue(a, b) {
  if (Math.abs(a - b) < Math.PI) {
    return Math.abs(a - b);
  } else {
    if (a > b) {
      a -= Math.PI * 2;
    } else {
      b -= Math.PI * 2;
    }
    return Math.abs(a - b);
  }
}