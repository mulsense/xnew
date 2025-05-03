import { isObject, isNumber, isString, isFunction } from '../common';

export class Ticker {
    static animation = null;
    static callbacks = [];
    static previous = Date.now();

    static clear() {
        Ticker.callbacks = [];
        Ticker.previous = Date.now();
    }

    static push(callback) {
        Ticker.callbacks.push(callback);
    }

    static start() {
        if (isFunction(requestAnimationFrame) === true && Ticker.animation === null) {
            Ticker.animation = requestAnimationFrame(Ticker.execute);
        }
    }

    static stop() {
        if (isFunction(cancelAnimationFrame) === true && Ticker.animation !== null) {
            cancelAnimationFrame(Ticker.animation);
            Ticker.animation = null;
        }
    }

    static execute() {
        const interval = 1000 / 60;
        const time = Date.now();
        if (time - Ticker.previous > interval * 0.8) {
            Ticker.callbacks.forEach((callback) => callback(time));
            Ticker.previous = time;
        }
        Ticker.animation = requestAnimationFrame(Ticker.execute);
    }
}
