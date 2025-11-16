//----------------------------------------------------------------------------------------------------
// ticker
//----------------------------------------------------------------------------------------------------

export class Ticker {
    private id: number | null;

    constructor(callback: Function) {
        const self = this;
        this.id = null;
        let previous = 0;
        ticker();

        function ticker() {
            const time = Date.now();
            const interval = 1000 / 60;
            if (time - previous > interval * 0.9) {
                callback(time);
                previous = time;
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

export class Timer {
    private timeout: Function | null;
    private transition: Function | null;
    private interval: number;
    private loop: boolean;
    private easing: string;
    private id: NodeJS.Timeout | null;

    private time: number;
    private offset: number;
    private status: 0 | 1;
    private visibilitychange: ((this: Document, event: Event) => any);
    private ticker: Ticker;

    constructor(transition: Function | null, timeout: Function | null, interval?: number, { loop = false, easing = 'linear' }: { loop?: boolean, easing?: string } = {}) {
        this.transition = transition;
        this.timeout = timeout;

        this.interval = interval ?? 0;
        this.loop = loop;
        this.easing = easing;

        this.id = null;
        this.time = 0.0;
        this.offset = 0.0;

        this.status = 0;
        this.ticker = new Ticker((time: number) => {
            let p = Math.min(this.elapsed() / this.interval, 1.0);
            if (easing === 'ease-out') {
                p = Math.pow((1.0 - Math.pow((1.0 - p), 2.0)), 0.5);
            } else if (easing === 'ease-in') {
                p = Math.pow((1.0 - Math.pow((1.0 - p), 0.5)), 2.0);
            } else if (easing === 'ease') {
                p = (1.0 - Math.cos(p * Math.PI)) / 2.0;
            } else if (easing === 'ease-in-out') {
                p = (1.0 - Math.cos(p * Math.PI)) / 2.0;
            }
            this.transition?.(p);
        });
  
        this.visibilitychange = () => document.hidden === false ? this._start() : this._stop();
        document.addEventListener('visibilitychange', this.visibilitychange);

        if (this.interval > 0.0) {
            this.transition?.(0.0);
        }
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
                this.timeout?.();
                this.transition?.(1.0);

                this.id = null;
                this.time = 0.0;
                this.offset = 0.0;

                this.loop ? this.start() : this.clear();
            }, this.interval - this.offset);
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

