const width = 400, height = 300;

function Main(self) {
  const screen = xnew(xnew.Screen, { width: 800, height: 400 });

  xmatter.setup();
  xpixi.setup();

  const constraint = Matter.MouseConstraint.create(xmatter.engine, { element: screen.canvas });
  Matter.Composite.add(xmatter.engine.world, constraint);

  xnew(MatterContents);
  xnew(Cursor);

  const button = xnew({ tagName: 'button', style: 'position: absolute; top: 0;' }, 'reset');
  button.on('click', () => button.emit('+reset'));
}

function Cursor(self) {

}

function MatterContents(self) {
  self.on('+reset', () => self.reboot());

  xnew(Rectangle, { x: 400, y: 200, w: 80, h: 80, color: 0xFF0000 });
  xnew(Circle, { x: 350, y: 50, r: 40, color: 0x0000FF });
  xnew(Rectangle, { x: 400, y: 400, w: 800, h: 20, color: 0x00FF00, isStatic: true });
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
  };
}
function Polygon(self, ...args) {
  xmatter.nest(Matter.Bodies.polygon(...args));
}