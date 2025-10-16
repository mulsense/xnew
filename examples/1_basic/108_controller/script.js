import xnew from 'xnew';
import xutil from 'xnew/addons/xutil';

xnew('#main', (self) => {
  xnew(Box);
  xnew(Controller);
});

function Controller(self) {
  // prevent default event
  xnew(window).on('keydown', (event) => event.preventDefault());
  self.on('touchstart contextmenu wheel', (event) => event.preventDefault());

  // virtual joyscick
  const stick = xnew('<div style="position: absolute; left: 10px; bottom: 10px;">', xutil.AnalogStick, { size: 130 });
  stick.on('-down -move -up', ({ vector }) => xnew.emit('+move', { vector }));

  // virtual D-pad
  const dpad = xnew('<div style="position: absolute; left: 10px; bottom: 150px;">', xutil.DPad, { size: 130 });
  dpad.on('-down -move -up', ({ vector }) => xnew.emit('+move', { vector }));

  // virtual button
  const button = xnew('<div style="position: absolute; right: 20px; bottom: 20px;">', xutil.CircleButton);
  button.on('-down', () => xnew.emit('+action'));

  // keyboard
  const user = xnew(xnew.UserEvent);
  user.on('-arrowkeydown -arrowkeyup', ({ vector }) => xnew.emit('+move', { vector }));
  user.on('-keydown', ({ code }) => {
    if (code === 'Space') {
      xnew.emit('+action')
    }
  });

  // xnew(Gamepad);
}

function Box(self) {
  const box = xnew.nest('<div style="position: absolute; width: 200px; height: 200px; inset: 0; margin: auto; background: #08F;">');
  let current = { x: 0, y: 0, r: 0 };
  let move = { x: 0, y: 0 };
  let direction = +1;
  self.on('+move', ({ vector }) => move = vector);
  self.on('+action', () => direction *= -1);

  self.on('update', () => {
    current.x += move.x * 10;
    current.y += move.y * 10;
    current.r += direction;
    box.style.left = current.x + 'px';
    box.style.top = current.y + 'px';
    box.style.transform = `rotate(${current.r}deg)`;
  });
}

// function Gamepad(self) {
//     const gamepads = new Map;
    
//     const win = xnew(window);

//     win.on('gamepadconnected', (e) => {
//         console.log('ゲームパッド接続:', e.gamepad.id, e.gamepad.index);
//         gamepads.set(e.gamepad.index, {
//             gamepad: e.gamepad,
//             previousButtons: new Map,
//             previousAxes: []
//         });
//         xnew.emit('-gamepadconnected', e.gamepad);
//     });
        
//     win.on('gamepaddisconnected', (e) => {
//         console.log('ゲームパッド切断:', e.gamepad.id);
//         gamepads.delete(e.gamepad.index);
//     });

//     self.on('update', () => {
//       const currents = navigator.getGamepads();

//       gamepads.forEach((gamepad, gamepadIndex) =>  {
//         const current = currents[gamepadIndex];

//         current.buttons.forEach((button, buttonIndex) => {
//           const isPressed = button.pressed;
//           const wasPressed = gamepads.get(gamepadIndex).previousButtons.get(buttonIndex) ?? false;
        
//           if (isPressed === true && wasPressed === false) {
//             gamepads.get(gamepadIndex).previousButtons.set(buttonIndex, true);
//             console.log(gamepad, button);
//             xnew.emit('-gamepadbuttondown', { gamepad,  button: buttonIndex });
//           }
//           if (isPressed === false && wasPressed === true) {
//             gamepads.get(gamepadIndex).previousButtons.set(buttonIndex, false);
//             xnew.emit('-gamepadbuttonup', { gamepad, button: buttonIndex });
//           }
//         });
        
//         current.axes.forEach((axis, axisIndex) => {
//           const previousValue = gamepads.get(gamepadIndex).previousAxes[axisIndex] || 0;
//           const threshold = 0.01;
          
//           if (Math.abs(axis - previousValue) >= threshold) {
//             xnew.emit('-gamepadaxismove', { gamepad, axis: axisIndex });
//               // this.triggerCallback('axisMove', {
//               //     gamepadIndex: gamepad.index,
//               //     axisIndex: axisIndex,
//               //     value: axisValue,
//               //     previousValue: previousValue
//               // });
//           }
//         });
//       });
//     });
//        //     const gamepads = navigator.getGamepads();
//     //     for (let i = 0; i < gamepads.length; i++) {
//     //         if (gamepads[i]) {
//     //             this.gamepads[i] = {
//     //                 gamepad: gamepads[i],
//     //                 previousButtons: [],
//     //                 previousAxes: []
//     //             };
//     //             this.triggerCallback('connect', gamepads[i]);
//     //             this.startPolling();
//     //         }
//     //     }    
//     //     // 既に接続されているゲームパッドをチェック
//     //     this.checkExistingGamepads();

//     //     this.on('buttonPress', (data) => {
            
//     //         // 具体的なボタンの処理例
//     //         switch(data.buttonIndex) {
              
//     //         }
//     //         // this.vec.x = this.input.left ? -1 : this.input.right ? 1 : 0;
//     //         // this.vec.y = this.input.up ? -1 : this.input.down ? 1 : 0;
//     //     });

//     //     // ボタンが離された時
//     //     this.on('buttonRelease', (data) => {
//     //         switch(data.buttonIndex) {
                
//     //         }
//     //     });

//     //     // アナログスティックが動いた時
//     //     this.on('axisMove', (data) => {
            
//     //         // 左スティックの処理例
//     //         if (data.axisIndex === 0) { // 左スティック X軸
//     //             this.vec.x = data.value.toFixed(3);
//     //         } else if (data.axisIndex === 1) { // 左スティック Y軸
//     //             this.vec.y = data.value.toFixed(3);
//     //         }
//     //     });
//     // }
    
    
    
// }