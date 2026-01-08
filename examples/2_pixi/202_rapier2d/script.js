import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xrapier2d from '@mulsense/xnew/addons/xrapier2d';
import * as PIXI from 'pixi.js';
import RAPIER from '@dimforge/rapier2d-compat';

xnew('#main', Main);

function Main(self) {
  const screen = xnew(xnew.basics.Screen, { width: 800, height: 400 });
  xpixi.initialize({ canvas: screen.canvas });
  xrapier2d.initialize({ gravity: { x: 0.0, y: 9.81 * 10 }, timestep: 3 / 60 });

  xnew.then(() => {
    const contents = xnew(Contents);
    const button = xnew('<button style="position: absolute; top: 0;">', 'reset');
    button.on('click', () => contents.reboot());
  });
}

function Contents(self) {
  // xnew(Circle, { x: 350, y: 50, r: 40, color: 0xFF0000 });
  xnew(Rectangle, { x: 400, y: 200, w: 80, h: 80, color: 0x00FF00 });
  xnew(Rectangle, { x: 400, y: 400, w: 380, h: 40, color: 0xFFFF00 , dynamic: false });
  // xnew(Polygon, { x: 450, y: 50, s: 6, r: 40, color: 0x0000FF });
}

function Circle(self, { x, y, r, color = 0xFFFFFF }, options = {}) {
  const object = xpixi.nest(new PIXI.Container());
  const pyshics = xmatter.nest(Matter.Bodies.circle(x, y, r, options));
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().circle(0, 0, r).fill(color));
  self.on('update', () => {
    object.rotation = pyshics.angle;
    object.position.set(pyshics.position.x, pyshics.position.y);
  });
}

function Rectangle(self, { x, y, w, h, color = 0xFFFFFF, dynamic = true, options = {} }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-w / 2, -h / 2, w, h).fill(color));

  // Create a dynamic rigid-body using xrapier2d
  const rigidBodyDesc = dynamic
    ? RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y)
    : RAPIER.RigidBodyDesc.fixed().setTranslation(x, y);
  const rigidBody = xrapier2d.world.createRigidBody(rigidBodyDesc);

  // Create a cuboid collider attached to the dynamic rigidBody
  const colliderDesc = RAPIER.ColliderDesc.cuboid(w / 2, h / 2);
  const collider = xrapier2d.world.createCollider(colliderDesc, rigidBody);
  console.log(rigidBody, collider);
  self.on('finalize', () => {
    xrapier2d.world.removeCollider(collider);
    xrapier2d.world.removeRigidBody(rigidBody);
  });
  self.on('update', () => {
    const position = rigidBody.translation();
    object.position.set(position.x, position.y);
  });
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
  self.on('update', () => {
    let position = rigidBody.translation();
    object.position.set(position.x, position.y);
  });

}