import { context, connect, AudioNodeMap } from './audio';

const store = new Map<string, any>();

export function load(path: string) {
    return new AudioFile(path);
}

class AudioFile {
    data: any;
    startTime: number | null;
    nodes: AudioNodeMap;

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
                    this.nodes.source.buffer = this.data.buffer;
                })
                .catch(() => {
                    console.warn(`"${path}" could not be loaded.`)
                });
            store.set(path, this.data);
        }

        this.startTime = null;

        this.nodes = connect({
            source: ['BufferSource', {}, 'volume'],
            volume: ['Gain', { gain: 1.0 }, 'master'],
        });
    }
    isReady(): boolean {
        return this.data.buffer ? true : false;
    }
    get promise(): Promise<void> {
        return this.data.promise;
    }
    set volume(value: number) {
        this.nodes.volume.gain.value = value;
    }
    get volume(): number {
        return this.nodes.volume.gain.value;
    }
    set loop(value: boolean) {
        this.nodes.source.loop = value;
    }
    get loop(): boolean {
        return this.nodes.source.loop;
    }
    play(offset: number = 0) {
        if (this.startTime !== null) return;
        if (this.isReady()) {
            this.startTime = context!.currentTime;
            this.nodes.source.playbackRate.value = 1;
            this.nodes.source.start(context!.currentTime, offset / 1000);
        } else {
            this.promise.then(() => this.play());
        }
    }
    pause() {
        if (this.startTime === null) return;
        this.nodes.source.stop(context!.currentTime);
        const elapsed = (context!.currentTime - this.startTime) % this.data.buffer.duration * 1000;
        this.startTime = null;
        return elapsed;
    }
};