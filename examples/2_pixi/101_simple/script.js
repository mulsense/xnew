import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import * as PIXI from 'pixi.js';

xnew(document.querySelector('#main'), Main);

function Main(unit) {
  const [width, height] = [800, 600];
  xnew.extend(xnew.basics.Screen, { aspect: width / height, fit: 'contain' });

  const canvas = xnew(`<canvas width="${width}" height="${height}" class="size-full align-bottom">`);

  // pixi setup
  xpixi.initialize({ canvas: canvas.element });
  unit.on('render', () => {
    xpixi.renderer.render(xpixi.scene);
  });

  xnew(Contents);
}

function Contents(unit) {
  xnew(Boxes);
}

function Boxes(unit) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(xpixi.canvas.width / 2, xpixi.canvas.height / 2); // center

  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      xnew(Box, { x: 120 * x, y: 120 * y, size: 60, color: 0xEA1E63 });
    }
  }

  unit.on('update', () => {
    object.rotation += 0.01;
  });
}

function Box(unit, { x, y, size, color }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-size / 2, -size / 2, size, size).fill(color));

  unit.on('update', () => {
    object.rotation += 0.01;
  });
}