export const context: AudioContext = new AudioContext();
export const master: GainNode = context.createGain();
master.gain.value = 1.0;
master.connect(context.destination);
