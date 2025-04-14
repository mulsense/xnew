//----------------------------------------------------------------------------------------------------
// timer
//----------------------------------------------------------------------------------------------------

export class Timer
{
    constructor({ timeout, finalize = null, delay = 0, loop = false })
    {
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

    clear()
    {
        if (this.id !== null) {
            clearTimeout(this.id);
            this.id = null;
            this.finalize?.();
        }
        if (document !== undefined) {
            document.removeEventListener('visibilitychange', this.listener);
        }
    }

    elapsed()
    {
        return this.offset + (this.id !== null ? (Date.now() - this.time) : 0);
    }

    start()
    {
        this.status = 1;
        this._start();
    }

    stop()
    {
        this._stop();
        this.status = 0;
    }

    _start()
    {
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

    _stop()
    {
        if (this.status === 1 && this.id !== null) {
            this.offset = this.offset + Date.now() - this.time;
            clearTimeout(this.id);

            this.id = null;
            this.time = null;
        }
    }
}
