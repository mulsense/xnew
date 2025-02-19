import * as PIXI from 'pixi.js';

import xnew from 'xnew';
import * as xpixi from 'xnew/xpixi';

xnew('#main', (self) => {
  const screen = xnew(xnew.Screen, { width: 800, height: 400 });

  xnew(PixiMain, { canvas: screen.canvas });
});

function PixiMain(self, { canvas }) {
  xnew.extend(xpixi.BaseSystem, { canvas });

  xnew(Boxes);
}

function Boxes(self) {
  const object = new PIXI.Container();
  xnew.extend(xpixi.Connect, object);
  
  object.position.set(800 / 2, 400 / 2);
  
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      xnew(Box, { x: 80 * x, y: 80 * y, size: 40, color: 0xEA1E63 });
    }
  }
  return {
    update() {
      object.rotation += 0.01;
    },
  };
}

function Box(self, { x, y, size, color }) {
  const object = new PIXI.Container();
  xnew.extend(xpixi.Connect, object);

  object.x = x;
  object.y = y;

  const graphics = new PIXI.Graphics();
  object.addChild(graphics);

  graphics.beginFill(color);
  graphics.drawRect(-size / 2, -size / 2, size, size);
  graphics.endFill();

  return {
    update() {
      object.rotation += 0.01;
    },
  };
}