//----------------------------------------------------------------------------------------------------
// ticker
//----------------------------------------------------------------------------------------------------

export class AnimationTicker {
    private id: number | null;

    constructor(callback: Function, fps: number = 60) {
        const self = this;
        this.id = null;
        let previous = 0;

        function ticker() {
            const delta = Date.now() - previous;
            if (delta > (1000 / fps) * 0.9) {
                callback();
                previous += delta;
            }
            self.id = requestAnimationFrame(ticker);
        }
        self.id = requestAnimationFrame(ticker);
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

    private startid: NodeJS.Timeout | null;
    private endid: NodeJS.Timeout | null;

    private time: number;
    private counter: number;
    private offset: number;
    private status: 0 | 1;
    private visibilitychange: ((this: Document, event: Event) => any);
    private ticker: AnimationTicker;

    constructor(options: TimerOptions) {
        this.options = options;

        this.startid = null;
        this.endid = null;
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

            } else if (this.options.easing === 'ease' || this.options.easing === 'ease-in-out') {
                // p = (1.0 - Math.cos(p * Math.PI)) / 2.0;

                const bias = (this.options.easing === 'ease') ? 0.7 : 1.0;
                const s = p ** bias;
                p = s * s * (3 - 2 * s);
            }
            this.options.transition?.(p);
        });
  
        this.visibilitychange = () => document.hidden === false ? this._start() : this._stop();
        document.addEventListener('visibilitychange', this.visibilitychange);

        this.startid = setTimeout(() => {
            this.options.transition?.(0.0);
        }, 0);
        this.start();
    }

    public clear(): void {
        if (this.startid !== null) {
            clearTimeout(this.startid);
            this.startid = null;
        }
        if (this.endid !== null) {
            clearTimeout(this.endid);
            this.endid = null;
        }
        document.removeEventListener('visibilitychange', this.visibilitychange);
        this.ticker.clear();
    }

    public elapsed(): number {
        return this.offset + (this.endid !== null ? (Date.now() - this.time) : 0);
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
        if (this.status === 1 && this.endid === null) {
            this.endid = setTimeout(() => {
                this.options.transition?.(1.0);
                this.options.timeout?.();

                this.endid = null;
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
        if (this.status === 1 && this.endid !== null) {
            this.offset = this.offset + Date.now() - this.time;
            clearTimeout(this.endid);

            this.endid = null;
            this.time = 0.0;
        }
    }
}

