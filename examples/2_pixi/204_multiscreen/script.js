import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import * as PIXI from 'pixi.js';

xnew('#main', Main);

function Main(main) {
  xnew.extend(xnew.basics.Screen, { width: 800, height: 600 });

  // pixi setup
  xpixi.initialize({ canvas: main.canvas });

  const sub1 = xnew(SubScreen, { color: 0xEA1E63 });
  const sub2 = xnew(SubScreen, { color: 0x63EA1E });

  xnew(Texture, { texture: xpixi.sync(sub1.canvas), offset: 0 });
  xnew(Texture, { texture: xpixi.sync(sub2.canvas), offset: xpixi.canvas.width / 2 });
}

function SubScreen(unit, { color }) {
  xpixi.initialize({ canvas: new OffscreenCanvas(xpixi.canvas.width / 2, xpixi.canvas.height) });

  xnew(Boxes, { color });
  return { canvas: xpixi.canvas };
}

function Texture(unit, { texture, offset } = {}) {
  const object = xpixi.nest(new PIXI.Sprite(texture));
  object.position.set(offset, 0);
}

function Boxes(unit, { color }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(xpixi.canvas.width / 2, xpixi.canvas.height / 2); // center

  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      xnew(Box, { x: 80 * x, y: 80 * y, size: 40, color });
    }
  }
  unit.on('update', () => object.rotation += 0.01);
}

function Box(unit, { x, y, size, color }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-size / 2, -size / 2, size, size).fill(color));

  unit.on('update', () => object.rotation += 0.01);
}