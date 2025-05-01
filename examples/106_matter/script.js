import Matter from 'matter-js';
import xnew from 'xnew';
import xmatter from 'xnew/addons/xmatter';

xnew('#main', Main);

function Main(self) {
  const screen = xnew(xnew.Screen, { width: 800, height: 400 });

  xmatter.setup({
    render: Matter.Render.create({
      canvas: screen.canvas, engine: Matter.Engine.create(), options: {
        width: screen.canvas.width, height: screen.canvas.height, wireframes: false, background: 'rgba(0,0,0,0)',
      }
    })
  });

  const constraint = Matter.MouseConstraint.create(xmatter.engine, { element: screen.canvas });
  Matter.Composite.add(xmatter.engine.world, constraint);

  xnew(MatterContents);

  const button = xnew({ tagName: 'button', style: 'position: absolute; top: 0;' }, 'reset');
  button.on('click', () => button.emit('+reset'));
}

function MatterContents(self) {
  self.on('+reset', () => self.reboot());

  xnew(Rectangle, 400, 200, 80, 80);
  xnew(Polygon, 450, 50, 6, 40);
  xnew(Circle, 350, 50, 40);
  xnew(Rectangle, 400, 400, 800, 20, { isStatic: true });
}

function Rectangle(self, ...args) {
  xmatter.nest(Matter.Bodies.rectangle(...args));
}
function Circle(self, ...args) {
  xmatter.nest(Matter.Bodies.circle(...args));
}
function Polygon(self, ...args) {
  xmatter.nest(Matter.Bodies.polygon(...args));
}