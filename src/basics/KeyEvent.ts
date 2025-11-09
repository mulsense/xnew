import { xnew } from '../core/xnew';

export function KeyEvent(unit: xnew.Unit) {
    const state: any = {};

    xnew.listener(window).on('keydown', (event: any) => {
        state[event.code] = 1;
        unit.emit('-keydown', { event, type: '-keydown', code: event.code });
    });
    xnew.listener(window).on('keyup', (event: any) => {
        state[event.code] = 0;
        unit.emit('-keyup', { event, type: '-keyup', code: event.code });
    });
    xnew.listener(window).on('keydown', (event: any) => {
        unit.emit('-arrowkeydown', { event, type: '-arrowkeydown', code: event.code, vector: getVector() });
    });
    xnew.listener(window).on('keyup', (event: any) => {
        unit.emit('-arrowkeyup', { event, type: '-arrowkeyup', code: event.code, vector: getVector() });
    });

    function getVector() {
        return {
            x: (state['ArrowLeft'] ? -1 : 0) + (state['ArrowRight'] ? +1 : 0),
            y: (state['ArrowUp'] ? -1 : 0) + (state['ArrowDown'] ? +1 : 0)
        };
    }
}
