import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import * as PIXI from 'pixi.js';

xnew(document.querySelector('#main'), Main);

function Main(unit) {
  xnew.extend(xnew.basics.Screen, { width: 800, height: 400 });
 
  // pixi setup
  xpixi.initialize({ canvas: unit.canvas });
  unit.on('render', () => {
    xpixi.renderer.render(xpixi.scene);
  });

  xnew(Contents);
}

function Contents(unit) {
  let scene = xnew(Scene1);

  unit.on('+scenechange', (NextScene, props) => {

    const duration = 500;
    const cover = xnew('<div class="absolute inset-0 size-full z-10 bg-white" style="opacity: 0">');
    xnew.transition((x) => {
      // fadeout
      cover.element.style.opacity = x;
    }, duration)
    .timeout((() => {
      // scene change
      scene.finalize();
      scene = xnew(NextScene, props);
    }), 500)
    .transition((x) => {
      // fadein
      cover.element.style.opacity = 1 - x;
    }, duration)
    .timeout(() => {
      // remove cover
      cover.finalize();
    });
  });
}

function Scene1(unit) {
  xnew(Text, { text: 'Scene1' });
  xnew(Box, { x: xpixi.canvas.width / 2, y: xpixi.canvas.height / 2, size: 160, color: 0xff2266 });

  unit.on('pointerdown', ({ event }) => xnew.emit('+scenechange', Scene2));
}

function Scene2(unit) {
  xnew(Text, { text: 'Scene2' });
  xnew(Box, { x: xpixi.canvas.width / 2, y: xpixi.canvas.height / 2, size: 160, color: 0x6622ff });

  unit.on('pointerdown', ({ event }) => xnew.emit('+scenechange', Scene1));
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