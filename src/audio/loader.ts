import { AudioNodeMap } from './audio';
class AudioFile {
    // static store = new Map<string, any>();
    // data: any;
    // startTime: number | null;
    // nodes: AudioNodeMap;

    // constructor(path: string) {
    //     this.data = {};
    //     if (AudioFile.store.has(path)) {
    //         this.data = AudioFile.store.get(path);
    //     } else {
    //         this.data.buffer = null;
    //         this.data.promise = fetch(path)
    //             .then((response) => response.arrayBuffer())
    //             .then((response) => Audio.context!.decodeAudioData(response))
    //             .then((response) => this.data.buffer = response)
    //             .catch(() => {
    //                 console.warn(`"${path}" could not be loaded.`)
    //             });
    //         AudioFile.store.set(path, this.data);
    //     }

    //     this.startTime = null;

    //     this.nodes = Audio.connect({
    //         source: ['BufferSource', {}, 'volume'],
    //         volume: ['Gain', { gain: 1.0 }, 'master'],
    //     });
    // }
    // isReady(): boolean {
    //     return this.data.buffer ? true : false;
    // }
    // get promise(): Promise<void> {
    //     return this.data.promise;
    // }
    // set volume(value: number) {
    //     this.nodes.volume.gain.value = value;
    // }
    // get volume(): number {
    //     return this.nodes.volume.gain.value;
    // }
    // set loop(value: boolean) {
    //     this.nodes.source.loop = value;
    // }
    // get loop(): boolean {
    //     return this.nodes.source.loop;
    // }
    // play(offset: number = 0) {
    //     if (this.startTime !== null) return;
    //     if (this.isReady()) {
    //         this.startTime = Audio.context!.currentTime;
    //         this.nodes.source.buffer = this.data.buffer;
    //         this.nodes.source.playbackRate.value = 1;
    //         this.nodes.source.start(Audio.context!.currentTime, offset / 1000);
    //     } else {
    //         this.promise.then(() => this.play());
    //     }
    // }
    // stop() {
    //     if (this.startTime === null) return;
    //     this.nodes.source.stop(Audio.context!.currentTime);
    //     const elapsed = (Audio.context!.currentTime - this.startTime) % this.data.buffer.duration * 1000;
    //     this.startTime = null;
    //     return elapsed;
    // }
};