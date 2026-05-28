//----------------------------------------------------------------------------------------------------
// time — runtime-agnostic tickers and timers
//
// xnew's root render loop and UnitTimer.timeout / interval / transition need a steady clock that
// behaves the same in browser and Node. Ticker feature-detects requestAnimationFrame (browser) and
// falls back to setTimeout (Node) so the rest of the package can stay runtime-agnostic. Timer
// layers easing and visibility-aware pause on top, for use in transition primitives.
//
// - Ticker              : callback at a target FPS — rAF in browser, setTimeout in Node
// - Timer / TimerOptions: setTimeout-based timer with optional easing transition; auto-paused on
//                         document visibility change (browser only)
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
// ticker
//----------------------------------------------------------------------------------------------------

export class Ticker {
    private cancel: (() => void) | null = null;

    constructor(callback: Function, fps: number = 60) {
        const minDelta = (1000 / fps) * 0.9;
        const interval = 1000 / fps;
        let previous = 0;

        const tick = () => {
            const delta = Date.now() - previous;
            if (delta > minDelta) {
                callback();
                previous += delta;
            }
            schedule();
        };

        const schedule = (): void => {
            if (typeof requestAnimationFrame !== 'undefined') {
                const id = requestAnimationFrame(tick);
                this.cancel = () => cancelAnimationFrame(id);
            } else {
                const id = setTimeout(tick, interval);
                this.cancel = () => clearTimeout(id);
            }
        };

        schedule();
    }

    clear(): void {
        if (this.cancel !== null) {
            this.cancel();
            this.cancel = null;
        }
    }
}

//----------------------------------------------------------------------------------------------------
// timer
//----------------------------------------------------------------------------------------------------

export interface TimerOptions {
    timeout?: Function,
    transition?: Function,
    duration: number, 
    easing?: string
}

export class Timer {
    private options: TimerOptions;

    private id: number | null;

    private time: { start: number, processed: number };
    private request: boolean;
    private visibilityListener: () => void;
    private ticker: Ticker;

    constructor(options: TimerOptions) {
        this.options = options;

        this.id = null;
        this.time = { start: 0.0, processed: 0.0 };

        this.request = true;
        this.ticker = new Ticker(() => this.animation());

        this.visibilityListener = () => document.hidden === false ? this._start() : this._stop();
        document.addEventListener('visibilitychange', this.visibilityListener);

        this.options.transition?.(0.0);
        this.start();
    }
    
    private animation(): void {
        let p = Math.min(this.elapsed() / this.options.duration, 1.0);
        if (this.options.easing === 'ease-out') {
            p = Math.pow((1.0 - Math.pow((1.0 - p), 2.0)), 0.5);
        } else if (this.options.easing === 'ease-in') {
            p = Math.pow((1.0 - Math.pow((1.0 - p), 0.5)), 2.0);
        } else if (this.options.easing === 'ease' || this.options.easing === 'ease-in-out') {
            const bias = (this.options.easing === 'ease') ? 0.7 : 1.0;
            const s = p ** bias;
            p = s * s * (3 - 2 * s);
        }
        this.options.transition?.(p);
    }

    public clear(): void {
        if (this.id !== null) {
            clearTimeout(this.id);
            this.id = null;
        }
        document.removeEventListener('visibilitychange', this.visibilityListener);
        this.ticker.clear();
    }

    public elapsed(): number {
        return this.time.processed + (this.id !== null ? (Date.now() - this.time.start) : 0);
    }

    public start(): void {
        this.request = true;
        this._start();
    }

    public stop(): void {
        this._stop();
        this.request = false;
    }

    private _start(): void {
        if (this.request === true && this.id === null) {
            this.id = setTimeout(() => {
                this.id = null;
                this.time = { start: 0.0, processed: 0.0 };

                this.options.transition?.(1.0);
                this.options.timeout?.();

                this.clear();
            }, this.options.duration - this.time.processed) as unknown as number; 
            this.time.start = Date.now();
        }
    }

    private _stop(): void {
        if (this.request === true && this.id !== null) {
            this.time.processed = this.time.processed + Date.now() - this.time.start;
            clearTimeout(this.id);
            this.id = null;
        }
    }
}

