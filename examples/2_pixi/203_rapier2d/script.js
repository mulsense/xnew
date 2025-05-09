import xnew from 'xnew';
import xpixi from 'xnew/addons/xpixi';
// import xmatter from 'xnew/addons/xmatter';
import * as PIXI from 'pixi.js';
import RAPIER from '@dimforge/rapier2d-compat';

let gravity = { x: 0.0, y: 9.81 };
let world = null;
// Create the ground

const width = 800, height = 400;
xnew('#main', Main);

function Main(self) {
  xnew(xnew.Screen, { width, height });
  xpixi.initialize();
  xnew.promise(RAPIER.init()).then(() => {
    console.log('RAPIER initialized');
    world = new RAPIER.World(gravity);
    world.timestep = 3 / 60;
    // let groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.1);
    // world.createCollider(groundColliderDesc);

    xnew(Contents);
  });

  const button = xnew({ tagName: 'button', style: 'position: absolute; top: 0;' }, 'reset');
  button.on('click', () => xnew.emit('+reset'));
}

function Contents(self) {
  self.on('+reset', () => self.reboot());
  // xmatter.initialize();

  // xnew(Circle, { x: 350, y: 50, r: 40, color: 0xFF0000 });
  xnew(Rectangle, { x: 400, y: 200, w: 80, h: 80, color: 0x00FF00 });
  xnew(Rectangle, { x: 400, y: 400, w: 380, h: 40, color: 0xFFFF00 }, false);
  // xnew(Polygon, { x: 450, y: 50, s: 6, r: 40, color: 0x0000FF });
  // xnew(Rectangle, { x: 400, y: 400, w: 800, h: 20, color: 0x888888 }, { isStatic: true });
  return {
    update() {
      // xmatter.update();
      world.step();
    },
  }
}

function Circle(self, { x, y, r, color = 0xFFFFFF }, options = {}) {
  const object = xpixi.nest(new PIXI.Container());
  const pyshics = xmatter.nest(Matter.Bodies.circle(x, y, r, options));
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().circle(0, 0, r).fill(color));
  return {
    object,
    update() {
      object.rotation = pyshics.angle;
      object.position.set(pyshics.position.x, pyshics.position.y);
    },
  };
}

function Rectangle(self, { x, y, w, h, color = 0xFFFFFF }, dynamic = true, options = {}) {
  const object = xpixi.nest(new PIXI.Container());
  // const pyshics = xmatter.nest(Matter.Bodies.rectangle(x, y, w, h, options));
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-w / 2, -h / 2, w, h).fill(color));

  // Create a dynamic rigid-body.
  let rigidBodyDesc = dynamic ? RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y) : RAPIER.RigidBodyDesc.fixed().setTranslation(x, y);
  let rigidBody = world.createRigidBody(rigidBodyDesc);
  
  // Create a cuboid collider attached to the dynamic rigidBody.
  let colliderDesc = RAPIER.ColliderDesc.cuboid(w/2, h/2);
  let collider = world.createCollider(colliderDesc, rigidBody);

  return {
    object,
    update() {
        let position = rigidBody.translation();
        object.position.set(position.x, position.y);
  
    },
  };
}

function Polygon(self, { x, y, s, r, color = 0xFFFFFF }, options = {}) {
  const object = xpixi.nest(new PIXI.Container());
  const pyshics = xmatter.nest(Matter.Bodies.polygon(x, y, s, r, options));
  object.position.set(x, y);
  const points = [];
  for (let i = 0; i < 360; i += 60) {
    points.push(Math.cos(i * Math.PI / 180) * r, Math.sin(i * Math.PI / 180) * r);
  }
  object.addChild(new PIXI.Graphics().regularPoly(0, 0, r, s).fill(color));
  return {
    update() {
      object.rotation = pyshics.angle;
      object.position.set(pyshics.position.x, pyshics.position.y);
    },
  };
}