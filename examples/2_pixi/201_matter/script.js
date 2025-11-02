import xnew from 'xnew';
import xpixi from 'xnew/addons/xpixi';
import xmatter from 'xnew/addons/xmatter';
import * as PIXI from 'pixi.js';
import Matter from 'matter-js';

xnew('#main', Main);

function Main(self) {
  const screen = xnew(xnew.basics.Screen, { width: 800, height: 400 });
  xpixi.initialize({ canvas: screen.element });

  const contents = xnew(Contents);
  const button = xnew('<button class="absolute top-0 m-2 px-2 border rounded-lg cursor-pointer hover:bg-gray-300">', 'reset');
  button.on('click', () => contents.reboot());
}

function Contents(self) {
  xmatter.initialize();

  // simple bodies
  xnew(Rectangle, { x: 100, y: 200, w: 80, h: 80, color: 0x00CC00 });
  xnew(Circle, { x: 300, y: 150, radius: 40, color: 0xCC0000 });
  xnew(Polygon, { x: 320, y: 50, sides: 6, radius: 40, color: 0x0000CC });

  // multiple bodies as a compound body
  xnew(Dumbbell, { x: 420, y: 50, size: 40, angle: 45 * Math.PI / 180, color: 0xCCCC00 });
  xnew(LShape, { x: 650, y: 50, size: 50, color: 0xCC00CC });
  xnew(Car, { x: 500, y: 100, size: 50, color: 0x00CCCC });

  // ground
  xnew(Rectangle, { x: 400, y: 400, w: 800, h: 20, color: 0x888888, options: { isStatic: true } });
}

function Rectangle(self, { x, y, w, h, color, options = {} }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-w / 2, -h / 2, w, h).fill(color));
 
  const pyshics = xmatter.nest(Matter.Bodies.rectangle(0, 0, w, h, options));
  Matter.Body.setPosition(pyshics, { x, y });

  self.on('update', () => {
    object.rotation = pyshics.angle;
    object.position.set(pyshics.position.x, pyshics.position.y);
  });
}

function Circle(self, { x, y, radius, color, options = {} }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().circle(0, 0, radius).fill(color));
 
  const pyshics = xmatter.nest(Matter.Bodies.circle(0, 0, radius, options));
  Matter.Body.setPosition(pyshics, { x, y });

  self.on('update', () => {
    object.rotation = pyshics.angle;
    object.position.set(pyshics.position.x, pyshics.position.y);
  });
}

function Polygon(self, { x, y, sides, radius, color, options = {} }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().regularPoly(0, 0, radius, sides).fill(color));
  
  const pyshics = xmatter.nest(Matter.Bodies.polygon(0, 0, sides, radius, options));
  Matter.Body.setPosition(pyshics, { x, y });

  self.on('update', () => {
      object.rotation = pyshics.angle;
      object.position.set(pyshics.position.x, pyshics.position.y);
  });
}

function Dumbbell(self, { x, y, size, angle, color, options = {} }) {
  const object = xpixi.nest(new PIXI.Container());
  const graphics = new PIXI.Graphics();
  graphics.rect(-size, -size / 8, size * 2, size / 4).fill(color);
  graphics.circle(-size, 0, size / 2).fill(color);
  graphics.circle(+size, 0, size / 2).fill(color);
  object.addChild(graphics);
  object.position.set(x, y);

  const bar = Matter.Bodies.rectangle(0, 0, size * 2, size / 4);
  const circleL = Matter.Bodies.circle(-size, 0, size / 2);
  const circleR = Matter.Bodies.circle(+size, 0, size / 2);
  const compound = xmatter.nest(Matter.Body.create({ parts: [bar, circleL, circleR], ...options }));
  Matter.Body.setPosition(compound, { x, y });
  Matter.Body.setAngle(compound, angle);

  self.on('update', () => {
    object.rotation = compound.angle;
    object.position.set(compound.position.x, compound.position.y);
  });
}

function Car(self, { x, y, size }) {
  const container = xpixi.nest(new PIXI.Container());

  const car = xmatter.nest(Matter.Composite.create({ label: 'car' }));
  const group = Matter.Body.nextGroup(true);
  const body = Matter.Bodies.rectangle(x, y, 80, 30, { collisionFilter: { group } });
  const wheelLeft = Matter.Bodies.circle(x - 25, y + 25, 15, { collisionFilter: { group }, friction: 0.9 });
  const wheelRight = Matter.Bodies.circle(x + 25, y + 25, 15, { collisionFilter: { group }, friction: 0.9 });

  // Attach wheels to the chassis with constraints
  const constraintLeft = Matter.Constraint.create({
    bodyA: body,
    bodyB: wheelLeft,
    pointA: { x: -25, y: 25 },
    length: 0,
    stiffness: 1
  });
  const constraintRight = Matter.Constraint.create({
    bodyA: body,
    bodyB: wheelRight,
    pointA: { x: 25, y: 25 },
    length: 0,
    stiffness: 1
  });
  Matter.Composite.addBody(car, body);
  Matter.Composite.addBody(car, wheelLeft);
  Matter.Composite.addBody(car, wheelRight);
  Matter.Composite.addConstraint(car, constraintLeft);
  Matter.Composite.addConstraint(car, constraintRight);
  Matter.Body.setAngularVelocity(wheelLeft, 1.5);
  Matter.Body.setAngularVelocity(wheelRight, 1.5);

  const bodyGraphics = new PIXI.Graphics();
  bodyGraphics.rect(-40, -15, 80, 30).fill(0x00AAFF);

  const wheelLeftGraphics = new PIXI.Graphics();
  wheelLeftGraphics.circle(0, 0, 15).fill(0x333333);

  const wheelRightGraphics = new PIXI.Graphics();
  wheelRightGraphics.circle(0, 0, 15).fill(0x333333);

  container.addChild(bodyGraphics);
  container.addChild(wheelLeftGraphics);
  container.addChild(wheelRightGraphics);

  self.on('update', () => {
    bodyGraphics.rotation = body.angle;
    bodyGraphics.position.set(body.position.x, body.position.y);
    wheelLeftGraphics.rotation = wheelLeft.angle;
    wheelLeftGraphics.position.set(wheelLeft.position.x, wheelLeft.position.y);
    wheelRightGraphics.rotation = wheelRight.angle;
    wheelRightGraphics.position.set(wheelRight.position.x, wheelRight.position.y);
  });
}

function LShape(self, { x, y, color, size, options = {} }) {
  const object = xpixi.nest(new PIXI.Container());

  const a = size;
  const b = size / 4;

  const bar1 = Matter.Bodies.rectangle(0, -a + b, a * 2, b * 2);
  const bar2 = Matter.Bodies.rectangle(-a + b, 0, b * 2, a * 2);
  const compound = xmatter.nest(Matter.Body.create({ parts: [bar1, bar2], ...options }));
  const offset = { x: compound.position.x, y: compound.position.y };
  Matter.Body.setPosition(compound, { x: x - offset.x, y: y - offset.y });

  const graphics = new PIXI.Graphics();
  graphics.rect(-a, -a, a * 2, b * 2).fill(color);
  graphics.rect(-a, -a, b * 2, a * 2).fill(color);
  object.addChild(graphics);
  object.position.set(x, y)
  object.pivot.set(offset.x, offset.y);

  self.on('update', () => {
    object.rotation = compound.angle;
    object.position.set(compound.position.x, compound.position.y);
  });
}
