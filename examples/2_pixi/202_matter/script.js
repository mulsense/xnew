import xnew from 'xnew';
import xpixi from 'xnew/addons/xpixi';
import xmatter from 'xnew/addons/xmatter';
import * as PIXI from 'pixi.js';
import Matter from 'matter-js';

const width = 800, height = 400;

xnew('#main', (self) => {
  const screen = xnew(xnew.basics.Screen, { width, height });
  xpixi.initialize({ canvas: screen.element });

  xnew(Contents);
});

function Contents(self) {
  xmatter.initialize();

  xnew(Circle, { x: 350, y: 50, r: 40, color: 0xFF0000 });
  xnew(Rectangle, { x: 400, y: 200, w: 80, h: 80, color: 0x00FF00 });
  xnew(Polygon, { x: 450, y: 50, s: 6, r: 40, color: 0x0000FF });
  xnew(Rectangle, { x: 400, y: 400, w: 800, h: 20, color: 0x888888, options: { isStatic: true } });

  const button = xnew('<button style="position: absolute; top: 0;">', 'reset');
  button.on('click', () => self.reboot());
}

function Circle(self, { x, y, r, color = 0xFFFFFF, options = {} }) {
  const object = xpixi.nest(new PIXI.Container());
  const pyshics = xmatter.nest(Matter.Bodies.circle(x, y, r, options));
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().circle(0, 0, r).fill(color));

  self.on('update', () => {
    object.rotation = pyshics.angle;
    object.position.set(pyshics.position.x, pyshics.position.y);
  });
}

function Rectangle(self, { x, y, w, h, color = 0xFFFFFF, options = {} }) {
  const object = xpixi.nest(new PIXI.Container());
  const pyshics = xmatter.nest(Matter.Bodies.rectangle(x, y, w, h, options));
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-w / 2, -h / 2, w, h).fill(color));

  self.on('update', () => {
    object.rotation = pyshics.angle;
    object.position.set(pyshics.position.x, pyshics.position.y);
  });
}

function Polygon(self, { x, y, s, r, color = 0xFFFFFF, options = {} }) {
  const object = xpixi.nest(new PIXI.Container());
  const pyshics = xmatter.nest(Matter.Bodies.polygon(x, y, s, r, options));
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().regularPoly(0, 0, r, s).fill(color));

  self.on('update', () => {
      object.rotation = pyshics.angle;
      object.position.set(pyshics.position.x, pyshics.position.y);
  });
}