import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import * as PIXI from 'pixi.js';

xnew('#main', Main);

function Main(unit: xnew.Unit) {
  const screen = xnew(xnew.basics.Screen, { width: 800, height: 400, fit: 'contain' });
  xpixi.initialize({ canvas: screen.element });

  xnew(Boxes);
}

function Boxes(unit: xnew.Unit) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(xpixi.canvas.width / 2, xpixi.canvas.height / 2); // center

  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      xnew(Box, { x: 80 * x, y: 80 * y, size: 40, color: 0xEA1E63 });
    }
  }
  unit.on('-update', () => object.rotation += 0.01);
}

function Box(unit: xnew.Unit, { x, y, size, color }: any) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-size / 2, -size / 2, size, size).fill(color));

  unit.on('-update', () => object.rotation += 0.01);
}