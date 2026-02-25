//----------------------------------------------------------------------------------------------------
// visibility change
//----------------------------------------------------------------------------------------------------

class Visibility {
    private listener: ((this: Document, event: Event) => any);

    constructor(callback?: Function) {
        this.listener = () => callback?.(document.hidden === false);
        document.addEventListener('visibilitychange', this.listener);
    }

    clear(): void {
        document.removeEventListener('visibilitychange', this.listener);
    }
}

//----------------------------------------------------------------------------------------------------
// animation ticker
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
    callback?: Function,
    transition?: Function,
    duration: number, 
    easing?: string
}

export class Timer {
    private options: TimerOptions;

    private id: number | null;

    private time: { start: number, processed: number };
    private request: boolean;
    private visibility: Visibility;
    private ticker: AnimationTicker;

    constructor(options: TimerOptions) {
        this.options = options;

        this.id = null;
        this.time = { start: 0.0, processed: 0.0 };

        this.request = true;
        this.ticker = new AnimationTicker(() => this.animation());
  
        this.visibility = new Visibility((visible: boolean) => visible ? this._start() : this._stop());

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
        this.visibility.clear();
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
                this.options.callback?.();

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

