import { context, master, connect } from './audio';

//----------------------------------------------------------------------------------------------------
// defines
//----------------------------------------------------------------------------------------------------

type SynthProps = {
    oscillator?: OscillatorOptions | null;
    filter?: FilterOptions | null;
    amp?: AmpOptions | null;
};
type SynthEffects = {
    bmp?: number | null;
    reverb?: ReverbOptions | null;
};
type Envelope = {
    amount: number;
    ADSR: [number, number, number, number];
};
type LFO = {
    amount: number;
    type: OscillatorType;
    rate: number;
};
type OscillatorOptions = {
    type?: OscillatorType;
    envelope?: Envelope | null;
    LFO?: LFO | null;
};
type FilterOptions = {
    type?: BiquadFilterType;
    cutoff?: number;
};
type AmpOptions = {
    envelope?: Envelope | null;
};
type ReverbOptions = {
    time?: number;
    mix?: number;
};

export function synthesizer(props?: SynthProps, effects?: SynthEffects) {
    return new Synthesizer(props, effects);
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function isObject(val: any): val is object {
    return val !== null && typeof val === 'object';
}
function isNumber(val: any): val is number {
    return typeof val === 'number' && !isNaN(val);
}

class Synthesizer {
    oscillator: OscillatorOptions;
    filter: FilterOptions;
    amp: AmpOptions;
    bmp: number;
    reverb: ReverbOptions;

    static initialize() {
        window.addEventListener('touchstart', initialize, true);
        window.addEventListener('mousedown', initialize, true);
        function initialize() {
            new Synthesizer().press(440);
            window.removeEventListener('touchstart', initialize, true);
            window.removeEventListener('mousedown', initialize, true);
        }
    }

    constructor(
        { oscillator = null, filter = null, amp = null }: SynthProps = {},
        { bmp = null, reverb = null }: SynthEffects = {}
    ) {
        this.oscillator = isObject(oscillator) ? oscillator : {};
        this.oscillator.type = setType(this.oscillator.type, ['sine', 'triangle', 'square', 'sawtooth']);
        this.oscillator.envelope = setEnvelope(this.oscillator.envelope as Partial<Envelope>, -36, +36);
        this.oscillator.LFO = setLFO(this.oscillator.LFO as Partial<LFO>, 36);

        this.filter = isObject(filter) ? filter : {};
        this.filter.type = setType(this.filter.type, ['lowpass', 'highpass', 'bandpass']);
        this.filter.cutoff = isNumber((this.filter as any).cutoff) ? clamp((this.filter as any).cutoff, 4, 8192) : undefined;

        this.amp = isObject(amp) ? amp : {};
        this.amp.envelope = setEnvelope(this.amp.envelope as Partial<Envelope>, 0, 1);

        this.bmp = isNumber(bmp) ? clamp(bmp, 60, 240) : 120;

        this.reverb = isObject(reverb) ? reverb : {};
        this.reverb.time = isNumber(this.reverb.time) ? clamp(this.reverb.time, 0, 2000) : 0.0;
        this.reverb.mix = isNumber(this.reverb.mix) ? clamp(this.reverb.mix, 0, 1.0) : 0.0;

        function setType<T>(type: any, list: T[], value = 0): T {
            return list.includes(type) ? type : list[value];
        }

        function setEnvelope(envelope: Partial<Envelope> | null | undefined, minAmount: number, maxAmount: number): Envelope | null {
            if (!isObject(envelope)) return null;
            const result: Envelope = {
                amount: isNumber(envelope.amount) ? clamp(envelope.amount, minAmount, maxAmount) : 0,
                ADSR: [
                    isNumber(envelope.ADSR?.[0]) ? clamp(envelope.ADSR[0], 0, 8000) : 0,
                    isNumber(envelope.ADSR?.[1]) ? clamp(envelope.ADSR[1], 0, 8000) : 0,
                    isNumber(envelope.ADSR?.[2]) ? clamp(envelope.ADSR[2], 0, 1) : 0,
                    isNumber(envelope.ADSR?.[3]) ? clamp(envelope.ADSR[3], 0, 8000) : 0,
                ]
            };
            return result;
        }

        function setLFO(LFO: Partial<LFO> | null | undefined, maxAmount: number): LFO | null {
            if (!isObject(LFO)) return null;
            const oscTypes: OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth'];
            const type: OscillatorType = oscTypes.includes(LFO.type as OscillatorType)
                ? (LFO.type as OscillatorType)
                : 'sine';
            const result: LFO = {
                amount: isNumber(LFO.amount) ? clamp(LFO.amount, 0, maxAmount) : 0,
                type,
                rate: isNumber(LFO.rate) ? clamp(LFO.rate, 1, 128) : 1,
            };
            return result;
        }
    }

    static keymap: { [key: string]: number } = {
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

    static notemap: { [key: string]: number } = {
        '1m': 4.000, '2n': 2.000, '4n': 1.000, '8n': 0.500, '16n': 0.250, '32n': 0.125,
    };

    press(frequency: number | string, duration: number | string | null = null, wait: number = 0.0) {
        frequency = typeof frequency === 'string' ? Synthesizer.keymap[frequency] : frequency;

        duration = typeof duration === 'string' ? (Synthesizer.notemap[duration] * 60 / this.bmp) : (duration !== null ? (duration / 1000) : duration);
        const start = context!.currentTime + wait / 1000;
        let stop: number | null = null;

        const nodes = {} as {
            oscillator: OscillatorNode,
            filter?: BiquadFilterNode,
            amp: GainNode,
            target: GainNode,
            convolver?: ConvolverNode,
            convolverDepth?: GainNode,
            oscillatorLFO?: OscillatorNode,
            oscillatorLFODepth?: GainNode,
        };
        nodes.oscillator = context.createOscillator();

        nodes.amp = context.createGain();
        nodes.amp.gain.value = 0.0;
        nodes.target = context.createGain();
        nodes.target.gain.value = 1.0;

        nodes.amp.connect(nodes.target);
        nodes.target.connect(master);

        if (this.filter.type && this.filter.cutoff) {
            nodes.filter = context.createBiquadFilter();
            nodes.oscillator.connect(nodes.filter);
            nodes.filter.connect(nodes.amp);
        } else {
            nodes.oscillator.connect(nodes.amp);
        }

        if (this.reverb.time! > 0.0 && this.reverb.mix! > 0.0) {
            nodes.convolver = context.createConvolver();
            nodes.convolver.buffer = impulseResponse({ time: this.reverb.time! });
            nodes.convolverDepth = context.createGain();
            nodes.convolverDepth.gain.value = 1.0;
            nodes.amp.connect(nodes.convolver);
            nodes.convolver.connect(nodes.convolverDepth);
            nodes.convolverDepth.connect(master);
        }

        if (this.oscillator.LFO) {
            nodes.oscillatorLFO = context.createOscillator();
            nodes.oscillatorLFODepth = context.createGain();
            nodes.oscillatorLFO.connect(nodes.oscillatorLFODepth);
            nodes.oscillatorLFODepth.connect(nodes.oscillator.frequency);
        }

        nodes.oscillator.type = this.oscillator.type as OscillatorType;
        nodes.oscillator.frequency.value = clamp(frequency as number, 10.0, 5000.0);

        if (this.filter.type && this.filter.cutoff && nodes.filter) {
            nodes.filter.type = this.filter.type as BiquadFilterType;
            nodes.filter.frequency.value = this.filter.cutoff;
        }
        if (this.reverb.time! > 0.0 && this.reverb.mix! > 0.0) {
            nodes.target.gain.value *= (1.0 - this.reverb.mix!);
            nodes.convolverDepth!.gain.value *= this.reverb.mix!;
        }

        {
            if (this.oscillator.LFO && nodes.oscillatorLFO && nodes.oscillatorLFODepth) {
                nodes.oscillatorLFODepth.gain.value = (frequency as number) * (Math.pow(2.0, this.oscillator.LFO.amount / 12.0) - 1.0);
                nodes.oscillatorLFO.type = this.oscillator.LFO.type;
                nodes.oscillatorLFO.frequency.value = this.oscillator.LFO.rate;
                nodes.oscillatorLFO.start(start);
            }

            if (this.oscillator.envelope) {
                const amount = (frequency as number) * (Math.pow(2.0, this.oscillator.envelope.amount / 12.0) - 1.0);
                startEnvelope(nodes.oscillator.frequency, frequency as number, amount, this.oscillator.envelope.ADSR);
            }
            if (this.amp.envelope) {
                startEnvelope(nodes.amp.gain, 0.0, this.amp.envelope.amount, this.amp.envelope.ADSR);
            }

            nodes.oscillator.start(start);
        }
        if (duration !== null) {
            release.call(this);
        }

        function release(this: Synthesizer) {
            duration = duration ?? (context!.currentTime - start);
            if (this.amp.envelope) {
                const ADSR = this.amp.envelope.ADSR;
                const adsr = [ADSR[0] / 1000, ADSR[1] / 1000, ADSR[2], ADSR[3] / 1000];
                const rate = adsr[0] === 0.0 ? 1.0 : Math.min((duration as number) / adsr[0], 1.0);
                stop = start + Math.max((adsr[0] + adsr[1]) * rate, duration as number) + adsr[3];
            } else {
                stop = start + (duration as number);
            }

            if (nodes.oscillatorLFO) {
                nodes.oscillatorLFO.stop(stop);
            }

            if (this.oscillator.envelope) {
                const amount = (frequency as number) * (Math.pow(2.0, this.oscillator.envelope.amount / 12.0) - 1.0);
                stopEnvelope(nodes.oscillator.frequency, frequency as number, amount, this.oscillator.envelope.ADSR);
            }
            if (this.amp.envelope) {
                stopEnvelope(nodes.amp.gain, 0.0, this.amp.envelope.amount, this.amp.envelope.ADSR);
            }

            nodes.oscillator.stop(stop);
        }

        function startEnvelope(param: AudioParam, base: number, amount: number, ADSR: [number, number, number, number]) {
            const adsr = [ADSR[0] / 1000, ADSR[1] / 1000, ADSR[2], ADSR[3] / 1000];
            param.value = base;
            param.setValueAtTime(base, start);
            param.linearRampToValueAtTime(base + amount, start + adsr[0]);
            param.linearRampToValueAtTime(base + amount * adsr[2], start + (adsr[0] + adsr[1]));
        }
        function stopEnvelope(param: AudioParam, base: number, amount: number, ADSR: [number, number, number, number]) {
            const adsr = [ADSR[0] / 1000, ADSR[1] / 1000, ADSR[2], ADSR[3] / 1000];
            const rate = adsr[0] === 0.0 ? 1.0 : Math.min((duration as number) / adsr[0], 1.0);

            if (rate < 1.0) {
                param.cancelScheduledValues(start);
                param.setValueAtTime(base, start);
                param.linearRampToValueAtTime(base + amount * rate, start + adsr[0] * rate);
                param.linearRampToValueAtTime(base + amount * rate * adsr[2], start + (adsr[0] + adsr[1]) * rate);
            }
            param.linearRampToValueAtTime(base + amount * rate * adsr[2], start + Math.max((adsr[0] + adsr[1]) * rate, duration as number));
            param.linearRampToValueAtTime(base, start + Math.max((adsr[0] + adsr[1]) * rate, duration as number) + adsr[3]);
        }

        return {
            release: release.bind(this),
        }
    }
}

Synthesizer.initialize();
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
