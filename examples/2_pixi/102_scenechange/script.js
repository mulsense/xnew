import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import * as PIXI from 'pixi.js';

xnew('#main', Main);

function Main(unit) {
  const screen = xnew(xnew.basics.Screen, { width: 800, height: 400 });
  xpixi.initialize({ canvas: screen.element });

  xnew(Scene1);
}

function Scene1(unit) {
  xnew(Text, { text: 'Scene1' });
  xnew(Box, { x: xpixi.canvas.width / 2, y: xpixi.canvas.height / 2, size: 160, color: 0xff2266 });

  unit.on('pointerdown', () => {
    unit.finalize();
    xnew.append(Main, Scene2);
  });
}

function Scene2(unit) {
  xnew(Text, { text: 'Scene2' });
  xnew(Box, { x: xpixi.canvas.width / 2, y: xpixi.canvas.height / 2, size: 160, color: 0x6622ff });

  unit.on('pointerdown', () => {
    unit.finalize();
    xnew.append(Main, Scene1);
  });
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