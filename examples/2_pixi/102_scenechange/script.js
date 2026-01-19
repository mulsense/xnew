import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import * as PIXI from 'pixi.js';

xnew('#main', Main);

function Main(unit) {
  xnew.extend(xnew.basics.Screen, { width: 800, height: 400 });
 
  // pixi setup
  xpixi.initialize({ canvas: unit.canvas });
  unit.on('render', () => {
    xpixi.renderer.render(xpixi.scene);
  });

  let scene = xnew(Scene1);
  unit.on('+nextscene', (NextScene, props) => {
    scene.finalize();
    scene = xnew(NextScene, props);
  });
}

function Scene1(unit) {
  xnew(Text, { text: 'Scene1' });
  xnew(Box, { x: xpixi.canvas.width / 2, y: xpixi.canvas.height / 2, size: 160, color: 0xff2266 });

  unit.on('pointerdown', ({ event }) => xnew.emit('+nextscene', Scene2));
}

function Scene2(unit) {
  xnew(Text, { text: 'Scene2' });
  xnew(Box, { x: xpixi.canvas.width / 2, y: xpixi.canvas.height / 2, size: 160, color: 0x6622ff });

  unit.on('pointerdown', ({ event }) => xnew.emit('+nextscene', Scene1));
}

function Text(unit, { text }) {
  const object = xpixi.nest(new PIXI.Text(text, { fontSize: 24, fill: 0x000000 }));
  object.position.set(10, 10);
}

function Box(unit, { x, y, size, color }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-size / 2, -size / 2, size, size).fill(color));
  
  xnew.transition((progress) => object.alpha = progress, 2000);
  
  unit.on('update', () => {
    object.rotation += 0.01;
  });
}