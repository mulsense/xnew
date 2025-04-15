import { isObject, isNumber, isString, isFunction } from './util';

class Ticker {
    constructor() {
        this.animation = null;
        this.reset()
    }

    reset() {
        if (this.animation !== null) {
            this.animation = null;
            cancelAnimationFrame(this.animation);
        }
        this.callbacks = [];
        this.counter = 0;
        this.previous = Date.now();
    }

    append(callback) {
        if (isFunction(callback) === false) {
            throw new Error('The argument is invalid.');
        } else if (this.callbacks.includes(callback) === false) {
            this.callbacks.push(callback);
        }
    }

    start() {
        if (isFunction(requestAnimationFrame) === true && this.animation === null) {
            this.animation = requestAnimationFrame(Ticker.execute.bind(this));
        }
    }

    stop() {
        if (isFunction(cancelAnimationFrame) === true && this.animation !== null) {
            cancelAnimationFrame(this.animation);
            this.animation = null;
        }
    }

    static execute() {
        const interval = 1000 / 60;
        const time = Date.now();
        if (time - this.previous > interval * 0.8) {
            this.callbacks.forEach((callback) => callback(time));
            this.previous = time;
            this.counter++;
        }
        this.animation = requestAnimationFrame(Ticker.execute.bind(this));
    }
}

export const ticker = new Ticker();
ticker.start();