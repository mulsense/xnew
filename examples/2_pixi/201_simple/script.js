import xnew from 'xnew';
import xpixi from 'xnew/addons/xpixi';
import * as PIXI from 'pixi.js';

const width = 800, height = 400;

xnew('#main', (self) => {
  xnew(xnew.Screen, { width, height, fit: 'contain' });
  xpixi.initialize();

  xnew(Boxes);
});

function Boxes(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(width / 2, height / 2);

  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      xnew(Box, { x: 80 * x, y: 80 * y, size: 40, color: 0xEA1E63 });
    }
  }
  self.on('update', () => {
    object.rotation += 0.01;
  });
}

function Box(self, { x, y, size, color }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-size / 2, -size / 2, size, size).fill(color));

  self.on('update', () => {
    object.rotation += 0.01;
  });
}