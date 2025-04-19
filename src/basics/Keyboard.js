import { xnew } from '../core/xnew';

export function Keyboard(self) {
    const win = xnew(window);
    const state = {};

    win.on('keydown', (event) => {
        if (event.repeat === true) return;
        state[event.code] = 1;
        self.emit('-keydown', { code: event.code });
    });

    win.on('keyup', (event) => {
        if (state[event.code]) state[event.code] = 0;
        self.emit('-keyup', { code: event.code });
    });

    win.on('keydown', (event) => {
        if (event.repeat === true) return;
        self.emit('-arrowkeydown', { code: event.code, vector: getVector() });
    });

    win.on('keyup', (event) => {
        if (event.repeat === true) return;
        self.emit('-arrowkeyup', { code: event.code, vector: getVector() });
    });

    function getVector() {
        return {
            x: (getKey('ArrowLeft') ? -1 : 0) + (getKey('ArrowRight') ? +1 : 0),
            y: (getKey('ArrowUp') ? -1 : 0) + (getKey('ArrowDown') ? +1 : 0)
        };
    }
    function getKey(code) {
        return state[code] ? true : false;
    }
    // return {
    //     getKey(code) {
    //         if (isString(code) === false) return false;
    //         return (state[code] && state[code].up === null) ? true : false;
    //     },
    //     getKeyDown(code) {
    //         if (isString(code) === false) return false;
    //         return (state[code] && state[code].down === ticker.counter) ? true : false;
    //     },
    //     getKeyUp(code) {
    //         if (isString(code) === false) return false;
    //         return (state[code] && state[code].up === ticker.counter) ? true : false;
    //     },
    // };
}
