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
    private timeout: Function;
    private transition: Function | null;
    private delay: number;
    private loop: boolean;
    private id: NodeJS.Timeout | null;

    private time: number;
    private offset: number;
    private status: 0 | 1;
    private visibilitychange?: ((this: Document, event: Event) => any);
    private ticker: (time: number) => void;

    constructor(timeout: Function, transition: Function | null, delay: number, loop: boolean = false) {
        this.timeout = timeout;
        this.transition = transition;
        this.delay = delay;
        this.loop = loop;

        this.id = null;
        this.time = 0.0;
        this.offset = 0.0;

        this.status = 0;

        this.ticker = (time: number): void => {
            this.transition?.(this.elapsed() / this.delay);
        };

        this.transition?.(0.0);

        if (this.delay <= 0) {
            timeout();
            this.transition?.(1.0);
        } else {
            if (document instanceof Document) {
                this.visibilitychange = () => document.hidden === false ? this._start() : this._stop();
                document.addEventListener('visibilitychange', this.visibilitychange);
            }
            this.start();
            Ticker.set(this.ticker);
        }
    }

    public clear(): void {
        if (this.id !== null) {
            clearTimeout(this.id);
            this.id = null;
        }
        if (document instanceof Document && this.visibilitychange !== undefined) {
            document.removeEventListener('visibilitychange', this.visibilitychange);
        }
        Ticker.clear(this.ticker);
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
                this.timeout();

                this.id = null;
                this.time = 0.0;
                this.offset = 0.0;

                if (this.loop) {
                    this.start();
                }
            }, this.delay - this.offset);
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

