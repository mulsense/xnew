import { context, master } from './audio';

const store = new Map<string, any>();

export function load(path: string) {
    return new AudioFile(path);
}

class AudioFile {
    data: any;
    startTime: number | null;
    source: AudioBufferSourceNode;
    amp: GainNode;

    constructor(path: string) {
        this.data = {};
        if (store.has(path)) {
            this.data = store.get(path);
        } else {
            this.data.buffer = null;
            this.data.promise = fetch(path)
                .then((response) => response.arrayBuffer())
                .then((response) => context!.decodeAudioData(response))
                .then((response) => {
                    this.data.buffer = response
                })
                .catch(() => {
                    console.warn(`"${path}" could not be loaded.`)
                });
            store.set(path, this.data);
        }

        this.startTime = null;

    }
    isReady(): boolean {
        return this.data.buffer ? true : false;
    }
    get promise(): Promise<void> {
        return this.data.promise;
    }
    // set volume(value: number) {
    //     this.amp.gain.value = value;
    // }
    // get volume(): number {
    //     return this.amp.gain.value;
    // }
    // set loop(value: boolean) {
    //     this.source.loop = value;
    // }
    // get loop(): boolean {
    //     return this.source.loop;
    // }
    play(offset: number = 0) {
        if (this.startTime !== null) return;
        if (this.isReady()) {
            console.log('start');
            this.source = context.createBufferSource();
            this.source.buffer = this.data.buffer;
            this.source.loop = true;
            this.amp = context.createGain();
            this.amp.gain.value = 1.0;
            this.source.connect(this.amp);
            this.amp.connect(master);

            this.startTime = context.currentTime;
            this.source.playbackRate.value = 1;
            this.source.start(context.currentTime, offset / 1000);
            this.source.onended = () => {
                console.log('ended');
                this.startTime = null;
                this.source.disconnect();
                this.amp.disconnect();
            };
        } else {
            this.promise.then(() => this.play());
        }
    }
    pause() {
        if (this.startTime === null) return;
        this.source.stop(context!.currentTime);
        const elapsed = (context.currentTime - this.startTime) % this.data.buffer.duration * 1000;
        this.startTime = null;
        return elapsed;
    }
};