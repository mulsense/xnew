import * as PIXI from 'pixi.js';
import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xutil from '@mulsense/xnew/addons/xutil';

xnew('#main', Main);

function Main(self) {
  xnew(xnew.Screen, { width: 800, height: 400 });
  xpixi.initalize();

  xnew(Box, { x: 800 / 2, y: 400 / 2, size: 100, color: 0xEA1E63 });
  xnew(Controller);
}

function Controller(self) {
  // prevent default event
  xnew(window).on('keydown', (event) => event.preventDefault());
  self.on('touchstart contextmenu wheel', (event) => event.preventDefault());

  // virtual joyscick
  const stick = xnew({ style: 'position: absolute; left: 10px; bottom: 10px;' }, xutil.AnalogStick, { size: 130 });
  stick.on('-down -move -up', ({ vector }) => xnew.emit('+move', { vector }));

  // virtual D-pad
  const dpad = xnew({ style: 'position: absolute; left: 10px; bottom: 150px;' }, xutil.DPad, { size: 130 });
  dpad.on('-down -move -up', ({ vector }) => xnew.emit('+move', { vector }));

  // virtual button
  const button = xnew({ style: 'position: absolute; right: 20px; bottom: 20px;' }, xutil.CircleButton);
  button.on('-down', () => xnew.emit('+action'));

  // keyboard
  const user = xnew(xnew.UserEvent);
  user.on('-arrowkeydown -arrowkeyup', ({ vector }) => xnew.emit('+move', { vector }));
  user.on('-keydown', ({ code }) => {
    if (code === 'Space') {
      xnew.emit('+action')
    }
  });
}

function Box(self, { x, y, size, color }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);
  object.addChild(new PIXI.Graphics().rect(-size / 2, -size / 2, size, size).fill(color));

  let move = { x: 0, y: 0 };
  let direction = +1;
  self.on('+move', ({ vector }) => move = vector);
  self.on('+action', () => direction *= -1);

  return {
    update() {
      object.x += move.x * 5;
      object.y += move.y * 5;
      object.rotation += 0.01 * direction;
    },
  };
}