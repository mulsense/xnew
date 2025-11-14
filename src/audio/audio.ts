export const context: AudioContext = new AudioContext();
export const master: GainNode = context.createGain();
master.gain.value = 1.0;
master.connect(context.destination);

export const config = {
    get volume(): number {
        return master.gain.value;
    },
    set volume(value: number) {
        master.gain.value = value;
    }
}