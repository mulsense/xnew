import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import * as PIXI from 'pixi.js';

xnew('#main', Main);

function Main(self) {
  xnew(xnew.Screen, { width: 800, height: 450 });
  xpixi.initialize();

  xnew(Scene1);
  self.on('+addscene', xnew);
}

function Scene1(self) {
  xnew(Text, 'Scene1');
  xnew(Box, { x: 800 / 2, y: 400 / 2, size: 160, color: 0xff2266 });

  self.on('pointerdown', () => {
    xnew.emit('+addscene', Scene2);
    self.finalize();
  });
}

function Scene2(self) {
  xnew(Text, 'Scene2');
  xnew(Box, { x: 800 / 2, y: 400 / 2, size: 160, color: 0x6622ff });

  self.on('pointerdown', () => {
    xnew.emit('+addscene', Scene1);
    self.finalize();
  });
}

function Text(self, value) {
  const object = xpixi.nest(new PIXI.Text(value, { fontSize: 24, fill: 0x000000 }));
  object.position.set(10, 10);
}

function Box(self, { x, y, size, color }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-size / 2, -size / 2, size, size).fill(color));
  
  xnew.transition(({ progress }) => object.alpha = progress, 2000);

  return {
    update() {
      object.rotation += 0.01;
    },
  };
}