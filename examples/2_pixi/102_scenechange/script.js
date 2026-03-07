import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import * as PIXI from 'pixi.js';

xnew(document.querySelector('#main'), Main);

function Main(unit) {
  xnew.extend(xnew.basics.Screen, { width: 800, height: 600 });

  // pixi setup
  xpixi.initialize({ canvas: unit.canvas });
  unit.on('render', () => {
    xpixi.renderer.render(xpixi.scene);
  });

  xnew(Contents);
}

function Contents(unit) {
  xnew(MyFlow).next(Scene1);
}

function MyFlow(unit) {
  const defines = xnew.extend(xnew.basics.Flow);

  return {
    next(Component, props) {
      const cover = xnew('<div class="absolute inset-0 size-full z-10 bg-white" style="opacity: 0">');
      
      xnew.transition(({ value }) => cover.element.style.opacity = value, 500) // fadeout
      .timeout(() => defines.next(Component, props)) // change scene
      .transition(({ value }) => cover.element.style.opacity = 1 - value, 500) // fadein
      .timeout(() => cover.finalize()); // remove cover
    }
  }
}

function Scene1(unit) {
  xnew(Text, { text: 'Scene1' });
  xnew(Box, { x: xpixi.canvas.width / 2, y: xpixi.canvas.height / 2, size: 160, color: 0xff2266 });

  unit.on('pointerdown', ({ event }) => xnew.context(xnew.basics.Flow).next(Scene2));
}

function Scene2(unit) {
  xnew(Text, { text: 'Scene2' });
  xnew(Box, { x: xpixi.canvas.width / 2, y: xpixi.canvas.height / 2, size: 160, color: 0x6622ff });

  unit.on('pointerdown', ({ event }) => xnew.context(xnew.basics.Flow).next(Scene1));
}

function Text(unit, { text }) {
  const object = xpixi.nest(new PIXI.Text(text, { fontSize: 24, fill: 0x000000 }));
  object.position.set(10, 10);
}

function Box(unit, { x, y, size, color }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-size / 2, -size / 2, size, size).fill(color));
  
  unit.on('update', () => {
    object.rotation += 0.01;
  });
}