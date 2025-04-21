import { isObject, isString, isFunction, error } from '../common';
import { Unit } from './unit';
import { Scope } from './scope';

export class Timer {
    constructor({ timeout, finalize = null, delay = 0, loop = false }) {
        this.timeout = timeout;
        this.finalize = finalize;
        this.delay = delay;
        this.loop = loop;

        this.id = null;
        this.time = null;
        this.offset = 0.0;

        this.status = 0;

        this.listener = (event) => {
            document.hidden === false ? this._start() : this._stop();
        };
        if (document !== undefined) {
            document.addEventListener('visibilitychange', this.listener);
        }
    }

    clear() {
        if (this.id !== null) {
            clearTimeout(this.id);
            this.id = null;
            this.finalize?.();
        }
        if (document !== undefined) {
            document.removeEventListener('visibilitychange', this.listener);
        }
    }

    elapsed() {
        return this.offset + (this.id !== null ? (Date.now() - this.time) : 0);
    }

    start() {
        this.status = 1;
        this._start();
    }

    stop() {
        this._stop();
        this.status = 0;
    }

    _start() {
        if (this.status === 1 && this.id === null) {
            this.id = setTimeout(() => {
                this.timeout();

                this.id = null;
                this.time = null;
                this.offset = 0.0;

                if (this.loop) {
                    this.start();
                } else {
                    this.finalize?.();
                }
            }, this.delay - this.offset);
            this.time = Date.now();
        }
    }

    _stop() {
        if (this.status === 1 && this.id !== null) {
            this.offset = this.offset + Date.now() - this.time;
            clearTimeout(this.id);

            this.id = null;
            this.time = null;
        }
    }
}

export function timer(callback, delay) {
    let finalizer = null;

    const snapshot = Scope.snapshot;
    const timer = new Timer({
        timeout: () => Scope.execute(snapshot.unit, snapshot.context, callback),
        finalize: () => finalizer.finalize(),
        delay,
    });

    timer.start();

    finalizer = new Unit(snapshot.unit, undefined, (self) => {
        return {
            finalize() {
                timer.clear();
            }
        }
    });

    return { clear: () => timer.clear() };
}

export function interval(callback, delay) {
    let finalizer = null;

    const snapshot = Scope.snapshot;
    const timer = new Timer({
        timeout: () => Scope.execute(snapshot.unit, snapshot.context, callback),
        finalize: () => finalizer.finalize(),
        delay,
        loop: true,
    });

    timer.start();

    finalizer = new Unit(snapshot.unit, undefined, (self) => {
        return {
            finalize() {
                timer.clear();
            }
        }
    });

    return { clear: () => timer.clear() };
}

export function transition(callback, interval) {
    let finalizer = null;
    let updater = null;

    const snapshot = Scope.snapshot;
    const timer = new Timer({
        timeout: () => Scope.execute(snapshot.unit, snapshot.context, callback, { progress: 1.0 }),
        finalize: () => finalizer.finalize(),
        delay: interval,
    });
    const clear = function () {
        timer.clear();
    }

    timer.start();

    Scope.execute(snapshot.unit, snapshot.context, callback, { progress: 0.0 });

    updater = new Unit(null, undefined, (self) => {
        return {
            update() {
                const progress = timer.elapsed() / interval;
                if (progress < 1.0) {
                    Scope.execute(snapshot.unit, snapshot.context, callback, { progress });
                }
            },
        }
    });

    finalizer = new Unit(snapshot.unit, undefined, (self) => {
        return {
            finalize() {
                timer.clear();
                updater.finalize();
            }
        }
    });

    return { clear };
}

