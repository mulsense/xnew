import { context, master } from './audio';

export function load(path: string) {
    return new AudioFile(path);
}

const store = new Map<string, any>();

class AudioFile {
    buffer?: AudioBuffer;
    promise: Promise<void>;
    source?: AudioBufferSourceNode;
    amp?: GainNode;

    start: number | null;
    constructor(path: string) {
        if (store.has(path)) {
            this.buffer = store.get(path);
            this.promise = Promise.resolve();
        } else {
            this.promise = fetch(path)
                .then((response) => response.arrayBuffer())
                .then((response) => context.decodeAudioData(response))
                .then((response) => {
                    this.buffer = response
                })
                .catch(() => {
                    console.warn(`"${path}" could not be loaded.`)
                });
            store.set(path, this.buffer);
        }

        this.start = null;
    }

    // set volume(value: number) {
    //     this.amp.gain.value = value;
    // }
    // get volume(): number {
    //     return this.amp.gain.value;
    // }

    play(offset: number = 0, loop: boolean = false) {
        if (this.buffer !== undefined && this.start === null) {
            this.source = context.createBufferSource();
            this.source.buffer = this.buffer;
            this.source.loop = loop;
            this.amp = context.createGain();
            this.amp.gain.value = 1.0;
            this.source.connect(this.amp);
            this.amp.connect(master);

            this.start = context.currentTime;
            this.source.playbackRate.value = 1;
            this.source.start(context.currentTime, offset / 1000);
            this.source.onended = () => {
                this.start = null;
                this.source?.disconnect();
                this.amp?.disconnect();
            };
        }
    }
    pause() {
        if (this.buffer !== undefined && this.start !== null) {
            this.source?.stop(context.currentTime);
            const elapsed = (context.currentTime - this.start) % this.buffer.duration * 1000;
            this.start = null;
            return elapsed;
        }
    }
};