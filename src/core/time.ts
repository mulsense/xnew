//----------------------------------------------------------------------------------------------------
// ticker
//----------------------------------------------------------------------------------------------------

export class AnimationTicker {
    private id: number | null;

    constructor(callback: Function, fps: number = 60) {
        const self = this;
        this.id = null;
        let previous = 0;
        ticker();
        function ticker() {
            const delta = Date.now() - previous;
            if (delta > (1000 / fps) * 0.9) {
                callback();
                previous += delta;
            }
            self.id = requestAnimationFrame(ticker);
        }
    }
 
    clear(): void {
        if (this.id !== null) {
            cancelAnimationFrame(this.id);
            this.id = null;
        }
    }
}

//----------------------------------------------------------------------------------------------------
// timer
//----------------------------------------------------------------------------------------------------

export interface TimerOptions {
    transition?: Function,
    timeout?: Function,
    duration: number, 
    iterations: number,
    easing?: string
}

export class Timer {
    private options: TimerOptions;
    private id: NodeJS.Timeout | null;

    private time: number;
    private counter: number;
    private offset: number;
    private status: 0 | 1;
    private visibilitychange: ((this: Document, event: Event) => any);
    private ticker: AnimationTicker;

    constructor(options: TimerOptions) {
        this.options = options;

        this.id = null;
        this.time = 0.0;
        this.counter = 0;
        this.offset = 0.0;

        this.status = 0;
        this.ticker = new AnimationTicker((time: number) => {
            let p = Math.min(this.elapsed() / this.options.duration, 1.0);
            if (this.options.easing === 'ease-out') {
                p = Math.pow((1.0 - Math.pow((1.0 - p), 2.0)), 0.5);
            } else if (this.options.easing === 'ease-in') {
                p = Math.pow((1.0 - Math.pow((1.0 - p), 0.5)), 2.0);
            } else if (this.options.easing === 'ease') {
                p = (1.0 - Math.cos(p * Math.PI)) / 2.0;  // todo
            } else if (this.options.easing === 'ease-in-out') {
                p = (1.0 - Math.cos(p * Math.PI)) / 2.0;
            }
            this.options.transition?.(p);
        });
  
        this.visibilitychange = () => document.hidden === false ? this._start() : this._stop();
        document.addEventListener('visibilitychange', this.visibilitychange);

        this.options.transition?.(0.0);
        this.start();
    }

    public clear(): void {
        if (this.id !== null) {
            clearTimeout(this.id);
            this.id = null;
        }
        document.removeEventListener('visibilitychange', this.visibilitychange);
        this.ticker.clear();
    }

    public elapsed(): number {
        return this.offset + (this.id !== null ? (Date.now() - this.time) : 0);
    }

    public start(): void {
        this.status = 1;
        this._start();
    }

    public stop(): void {
        this._stop();
        this.status = 0;
    }

    private _start(): void {
        if (this.status === 1 && this.id === null) {
            this.id = setTimeout(() => {
                this.options.transition?.(1.0);
                this.options.timeout?.();

                this.id = null;
                this.time = 0.0;
                this.offset = 0.0;
                this.counter++;

                if (this.options.iterations === 0 || this.counter < this.options.iterations) {
                    this.start();
                } else {
                    this.clear();
                }
            }, this.options.duration - this.offset);
            this.time = Date.now();
        }
    }

    private _stop(): void {
        if (this.status === 1 && this.id !== null) {
            this.offset = this.offset + Date.now() - this.time;
            clearTimeout(this.id);

            this.id = null;
            this.time = 0.0;
        }
    }
}

