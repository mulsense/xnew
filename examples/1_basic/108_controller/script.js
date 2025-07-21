import xnew from 'xnew';
import xutil from 'xnew/addons/xutil';

xnew('#main', Main);

function Main(self) {
  xnew(Box);
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

function Box(self) {
  xnew.nest({ style: { position: 'absolute', width: '200px', height: '200px', inset: 0, margin: 'auto', background: '#08F' } });

  let current = { x: 0, y: 0, r: 0 };
  let move = { x: 0, y: 0 };
  let direction = +1;
  self.on('+move', ({ vector }) => move = vector);
  self.on('+action', () => direction *= -1);

  self.on('update', () => {
    current.x += move.x * 10;
    current.y += move.y * 10;
    current.r += direction;
    self.element.style.left = current.x + 'px';
    self.element.style.top = current.y + 'px';
    self.element.style.transform = `rotate(${current.r}deg)`;
  });
}