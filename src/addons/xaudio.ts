import xnew from '@mulsense/xnew';

export default {
    load(path: string) {
        const music = new AudioFile(path);
        const object = {
            play(options: AudioFilePlayOptions) {
                const unit = xnew();
                if (music.played === null) {
                    music.play(options);
                    unit.on('finalize', () => music.pause({ fade: options.fade }));
                }
            },
            pause(options: AudioFilePauseOptions) {
                music.pause(options);
            }
        }
        return xnew.promise(music.promise).then(() => object);
    },
    synthesizer(props: SynthesizerOptions) {
        return new Synthesizer(props);
    },
    get volume(): number {
        return master.gain.value;
    },
    set volume(value: number) {
        master.gain.value = value;
    }
}


const context: AudioContext = window.AudioContext ? new window.AudioContext() : (null!);
const master: GainNode = context ? context.createGain() : (null!);
if (context) {
    master.gain.value = 0.1;
    master.connect(context.destination);
}

//----------------------------------------------------------------------------------------------------
// audio file
//----------------------------------------------------------------------------------------------------

type AudioFilePlayOptions = {
    offset?: number;
    fade?: number;
    loop?: boolean;
};

type AudioFilePauseOptions = {
    fade?: number;
}

class AudioFile {
    private buffer?: AudioBuffer;
    private source: AudioBufferSourceNode | null;
    private amp: GainNode;
    private fade: GainNode;

    public promise: Promise<void>;
    public played: number | null;

    constructor(path: string) {
        this.promise = fetch(path)
            .then((response) => response.arrayBuffer())
            .then((response) => context.decodeAudioData(response))
            .then((response) => { this.buffer = response })
            .catch(() => {
                console.warn(`"${path}" could not be loaded.`)
            });
        this.amp = context.createGain();
        this.amp.gain.value = 1.0;
        this.amp.connect(master);
        this.fade = context.createGain();
        this.fade.gain.value = 1.0;
        this.fade.connect(this.amp);
        this.source = null;
        this.played = null;
    }

    set volume(value: number) {
        this.amp.gain.value = value;
    }

    get volume(): number {
        return this.amp.gain.value;
    }

    play({ offset = 0, fade = 0, loop = false }: AudioFilePlayOptions = {}) {
        if (this.buffer !== undefined && this.played === null) {
            this.source = context.createBufferSource();
            this.source.buffer = this.buffer;
            this.source.loop = loop;
            this.source.connect(this.fade);

            this.played = context.currentTime;
            this.source.playbackRate.value = 1;
            this.source.start(context.currentTime, offset / 1000);

            // Apply fade-in effect if fade duration is specified
            if (fade > 0) {
                this.fade.gain.setValueAtTime(0, context.currentTime);
                this.fade.gain.linearRampToValueAtTime(1.0, context.currentTime + fade / 1000);
            }

            this.source.onended = () => {
                this.played = null;
                this.source?.disconnect();
                this.source = null;
            };
        }
    }

    pause({ fade = 0 }: AudioFilePauseOptions = {}) {
        if (this.buffer !== undefined && this.played !== null) {
            const elapsed = (context.currentTime - this.played) % this.buffer.duration * 1000;

            // Apply fade-out effect if fade duration is specified
            if (fade > 0) {
                this.fade.gain.setValueAtTime(1.0, context.currentTime);
                this.fade.gain.linearRampToValueAtTime(0, context.currentTime + fade / 1000);
                this.source?.stop(context.currentTime + fade / 1000);
            } else {
                this.source?.stop(context.currentTime);
            }

            this.played = null;
            return elapsed;
        }
    }

    clear() {
        this.amp.disconnect();
        this.fade.disconnect();
        this.source?.disconnect();
    }
};

//----------------------------------------------------------------------------------------------------
// synthesizer
//----------------------------------------------------------------------------------------------------

type SynthesizerOptions = {
    oscillator: OscillatorOptions;
    amp: AmpOptions;
    filter?: FilterOptions;
    reverb?: ReverbOptions;
    bpm?: number; // 60 ~ 240
};

type OscillatorOptions = {
    type: OscillatorType; // sine, triangle, square, sawtooth
    envelope?: Envelope; // amount: -36 ~ +36
    LFO?: LFO; // amount: 0 ~ 36
};

type FilterOptions = {
    type: BiquadFilterType; // lowpass, highpass, bandpass
    cutoff: number; // 4 ~ 8192
};

type AmpOptions = {
    envelope: Envelope; // amount: 0 ~ 1
};

type ReverbOptions = {
    time: number; // 0 ~ 2000
    mix: number; // 0 ~ 1
};

type Envelope = {
    amount: number;
    ADSR: [number, number, number, number]; // A:0~8000, D:0~8000, S:0~1, R:0~8000
};

type LFO = {
    amount: number;
    type: OscillatorType; // lowpass, highpass, bandpass
    rate: number; // 1 ~ 128
};

const keymap: { [key: string]: number } = {
    'A0': 27.500, 'A#0': 29.135, 'B0': 30.868,
    'C1': 32.703, 'C#1': 34.648, 'D1': 36.708, 'D#1': 38.891, 'E1': 41.203, 'F1': 43.654, 'F#1': 46.249, 'G1': 48.999, 'G#1': 51.913, 'A1': 55.000, 'A#1': 58.270, 'B1': 61.735,
    'C2': 65.406, 'C#2': 69.296, 'D2': 73.416, 'D#2': 77.782, 'E2': 82.407, 'F2': 87.307, 'F#2': 92.499, 'G2': 97.999, 'G#2': 103.826, 'A2': 110.000, 'A#2': 116.541, 'B2': 123.471,
    'C3': 130.813, 'C#3': 138.591, 'D3': 146.832, 'D#3': 155.563, 'E3': 164.814, 'F3': 174.614, 'F#3': 184.997, 'G3': 195.998, 'G#3': 207.652, 'A3': 220.000, 'A#3': 233.082, 'B3': 246.942,
    'C4': 261.626, 'C#4': 277.183, 'D4': 293.665, 'D#4': 311.127, 'E4': 329.628, 'F4': 349.228, 'F#4': 369.994, 'G4': 391.995, 'G#4': 415.305, 'A4': 440.000, 'A#4': 466.164, 'B4': 493.883,
    'C5': 523.251, 'C#5': 554.365, 'D5': 587.330, 'D#5': 622.254, 'E5': 659.255, 'F5': 698.456, 'F#5': 739.989, 'G5': 783.991, 'G#5': 830.609, 'A5': 880.000, 'A#5': 932.328, 'B5': 987.767,
    'C6': 1046.502, 'C#6': 1108.731, 'D6': 1174.659, 'D#6': 1244.508, 'E6': 1318.510, 'F6': 1396.913, 'F#6': 1479.978, 'G6': 1567.982, 'G#6': 1661.219, 'A6': 1760.000, 'A#6': 1864.655, 'B6': 1975.533,
    'C7': 2093.005, 'C#7': 2217.461, 'D7': 2349.318, 'D#7': 2489.016, 'E7': 2637.020, 'F7': 2793.826, 'F#7': 2959.955, 'G7': 3135.963, 'G#7': 3322.438, 'A7': 3520.000, 'A#7': 3729.310, 'B7': 3951.066,
    'C8': 4186.009,
};

const notemap: { [key: string]: number } = {
    '1m': 4.000, '2n': 2.000, '4n': 1.000, '8n': 0.500, '16n': 0.250, '32n': 0.125,
};

class Synthesizer {
    props: SynthesizerOptions;
    constructor(props: SynthesizerOptions) { this.props = props; }
    
    press(frequency: number | string, duration?: number | string, wait?: number) {
        const props = this.props;
        const fv: number = typeof frequency === 'string' ? keymap[frequency] : frequency;
        const dv: number = typeof duration === 'string' ? (notemap[duration] * 60 / (props.bpm ?? 120)) : (typeof duration === 'number' ? (duration / 1000) : 0);

        const start = context.currentTime + (wait ?? 0) / 1000;

        const nodes = {} as {
            oscillator: OscillatorNode,
            amp: GainNode,
            target: GainNode,
            filter?: BiquadFilterNode,
            convolver?: ConvolverNode,
            convolverDepth?: GainNode,
            oscillatorLFO?: OscillatorNode,
            oscillatorLFODepth?: GainNode,
        };

        nodes.oscillator = context.createOscillator();
        nodes.oscillator.type = props.oscillator.type;
        nodes.oscillator.frequency.value = fv;
      
        if (props.oscillator.LFO) {
            nodes.oscillatorLFO = context.createOscillator();
            nodes.oscillatorLFODepth = context.createGain();
            nodes.oscillatorLFODepth.gain.value = fv * (Math.pow(2.0, props.oscillator.LFO.amount / 12.0) - 1.0);
            nodes.oscillatorLFO.type = props.oscillator.LFO.type;
            nodes.oscillatorLFO.frequency.value = props.oscillator.LFO.rate;
            nodes.oscillatorLFO.start(start);

            nodes.oscillatorLFO.connect(nodes.oscillatorLFODepth);
            nodes.oscillatorLFODepth.connect(nodes.oscillator.frequency);
        }

        nodes.amp = context.createGain();
        nodes.amp.gain.value = 0.0;
        nodes.target = context.createGain();
        nodes.target.gain.value = 1.0;

        nodes.amp.connect(nodes.target);
        nodes.target.connect(master);

        if (props.filter) {
            nodes.filter = context.createBiquadFilter();
            nodes.filter.type = props.filter.type as BiquadFilterType;
            nodes.filter.frequency.value = props.filter.cutoff;

            nodes.oscillator.connect(nodes.filter);
            nodes.filter.connect(nodes.amp);
        } else {
            nodes.oscillator.connect(nodes.amp);
        }

        if (props.reverb) {
            nodes.convolver = context.createConvolver();
            nodes.convolver.buffer = impulseResponse({ time: props.reverb.time });
            nodes.convolverDepth = context.createGain();
            nodes.convolverDepth.gain.value = 1.0;
            nodes.convolverDepth.gain.value *= props.reverb.mix;
            nodes.target.gain.value *= (1.0 - props.reverb.mix);

            nodes.amp.connect(nodes.convolver);
            nodes.convolver.connect(nodes.convolverDepth);
            nodes.convolverDepth.connect(master);
        }

        if (props.oscillator.envelope) {
            const amount = fv * (Math.pow(2.0, props.oscillator.envelope.amount / 12.0) - 1.0);
            startEnvelope(nodes.oscillator.frequency, fv, amount, props.oscillator.envelope.ADSR);
        }
        if (props.amp.envelope) {
            startEnvelope(nodes.amp.gain, 0.0, props.amp.envelope.amount, props.amp.envelope.ADSR);
        }

        nodes.oscillator.start(start);

        if (dv > 0) {
            release();
        } else {
            return { release }
        }
        
        function release() {
            let stop: number | null = null;
            const end = dv > 0 ? dv : (context.currentTime - start);
            if (props.amp.envelope) {
                const ADSR = props.amp.envelope.ADSR;
                const adsr = [ADSR[0] / 1000, ADSR[1] / 1000, ADSR[2], ADSR[3] / 1000];
                const rate = adsr[0] === 0.0 ? 1.0 : Math.min(end / (adsr[0] + 0.001), 1.0);
                stop = start + Math.max((adsr[0] + adsr[1]) * rate, end) + adsr[3];
            } else {
                stop = start + end;
            }

            if (nodes.oscillatorLFO) {
                nodes.oscillatorLFO.stop(stop);
            }

            if (props.oscillator.envelope) {
                const amount = fv * (Math.pow(2.0, props.oscillator.envelope.amount / 12.0) - 1.0);
                stopEnvelope(nodes.oscillator.frequency, fv, amount, props.oscillator.envelope.ADSR);
            }
            if (props.amp.envelope) {
                stopEnvelope(nodes.amp.gain, 0.0, props.amp.envelope.amount, props.amp.envelope.ADSR);
            }

            nodes.oscillator.stop(stop);

            setTimeout(() => {
                nodes.oscillator.disconnect();
                nodes.amp.disconnect();
                nodes.target.disconnect();
                nodes.oscillatorLFO?.disconnect();
                nodes.oscillatorLFODepth?.disconnect();
                nodes.filter?.disconnect();
                nodes.convolver?.disconnect();
                nodes.convolverDepth?.disconnect();
            }, 2000);
        }

        function stopEnvelope(param: AudioParam, base: number, amount: number, ADSR: [number, number, number, number]) {
            const end = dv > 0 ? dv : (context.currentTime - start);
            const rate = ADSR[0] === 0.0 ? 1.0 : Math.min(end / (ADSR[0] / 1000), 1.0);
            if (rate < 1.0) {
                param.cancelScheduledValues(start);
                param.setValueAtTime(base, start);
                param.linearRampToValueAtTime(base + amount * rate, start + ADSR[0] / 1000 * rate);
                param.linearRampToValueAtTime(base + amount * rate * ADSR[2], start + (ADSR[0] + ADSR[1]) / 1000 * rate);
            }
            param.linearRampToValueAtTime(base + amount * rate * ADSR[2], start + Math.max((ADSR[0] + ADSR[1]) / 1000 * rate, dv));
            param.linearRampToValueAtTime(base, start + Math.max((ADSR[0] + ADSR[1]) / 1000 * rate, end) + ADSR[3] / 1000);
        }

        function startEnvelope(param: AudioParam, base: number, amount: number, ADSR: [number, number, number, number]) {
            param.value = base;
            param.setValueAtTime(base, start);
            param.linearRampToValueAtTime(base + amount, start + ADSR[0] / 1000);
            param.linearRampToValueAtTime(base + amount * ADSR[2], start + (ADSR[0] + ADSR[1]) / 1000);
        }
        function impulseResponse({ time, decay = 2.0 }: { time: number, decay?: number }): AudioBuffer {
            const length = context.sampleRate * time / 1000;
            const impulse = context.createBuffer(2, length, context.sampleRate);

            const ch0 = impulse.getChannelData(0);
            const ch1 = impulse.getChannelData(1);
            for (let i = 0; i < length; i++) {
                ch0[i] = (2 * Math.random() - 1) * Math.pow(1 - i / length, decay);
                ch1[i] = (2 * Math.random() - 1) * Math.pow(1 - i / length, decay);
            }
            return impulse;
        }
    }
}
