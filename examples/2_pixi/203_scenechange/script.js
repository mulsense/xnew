import xnew from 'xnew';
import xpixi from 'xnew/addons/xpixi';
import * as PIXI from 'pixi.js';

xnew('#main', Main);

function Main(self) {
  const width = 800, height = 400;
  const screen = xnew(xnew.basics.Screen, { width, height });
  xpixi.initialize({ canvas: screen.element });

  xnew(Scene1);
}

function Scene1(self) {
  xnew(Text, { text: 'Scene1' });
  xnew(Box, { x: xpixi.canvas.width / 2, y: xpixi.canvas.height / 2, size: 160, color: 0xff2266 });

  self.on('pointerdown', () => {
    self.finalize();
    xnew.append(Main, Scene2);
  });
}

function Scene2(self) {
  xnew(Text, { text: 'Scene2' });
  xnew(Box, { x: xpixi.canvas.width / 2, y: xpixi.canvas.height / 2, size: 160, color: 0x6622ff });

  self.on('pointerdown', () => {
    self.finalize();
    xnew.append(Main, Scene1);
  });
}

function Text(self, { text }) {
  const object = xpixi.nest(new PIXI.Text(text, { fontSize: 24, fill: 0x000000 }));
  object.position.set(10, 10);
}

function Box(self, { x, y, size, color }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-size / 2, -size / 2, size, size).fill(color));
  
  xnew.transition((progress) => object.alpha = progress, 2000);
  
  self.on('update', () => {
    object.rotation += 0.01;
  });
}