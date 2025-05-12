//----------------------------------------------------------------------------------------------------
// timer
//----------------------------------------------------------------------------------------------------

export class Timer {
    private timeout: Function;
    private delay: number;
    private loop: boolean;
    private id: NodeJS.Timeout | null;

    private time: number;
    private offset: number;
    private status: 0 | 1;
    private visibilitychange?: ((this: Document, event: Event) => any);

    constructor(timeout: Function, delay: number, loop: boolean = false) {
        this.timeout = timeout;
        this.delay = delay;
        this.loop = loop;

        this.id = null;
        this.time = 0.0;
        this.offset = 0.0;

        this.status = 0;

        if (document !== undefined) {
            this.visibilitychange = () => document.hidden === false ? this._start() : this._stop();
            document.addEventListener('visibilitychange', this.visibilitychange);
        }

        this.start();
    }

    public clear(): void {
        if (this.id !== null) {
            clearTimeout(this.id);
            this.id = null;
        }
        if (document !== undefined && this.visibilitychange !== undefined) {
            document.removeEventListener('visibilitychange', this.visibilitychange);
        }
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