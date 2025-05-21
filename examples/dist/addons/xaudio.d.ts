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
    Q?: number;
    cutoff?: number;
    envelope?: Envelope | null;
    LFO?: LFO | null;
};
type AmpOptions = {
    envelope?: Envelope | null;
    LFO?: LFO | null;
};
type ReverbOptions = {
    time?: number;
    mix?: number;
};
type DelayOptions = {
    time?: number;
    feedback?: number;
    mix?: number;
};
type SynthProps = {
    oscillator?: OscillatorOptions | null;
    filter?: FilterOptions | null;
    amp?: AmpOptions | null;
};
type SynthEffects = {
    bmp?: number | null;
    reverb?: ReverbOptions | null;
    delay?: DelayOptions | null;
};
declare const _default: {
    synthesizer(props?: SynthProps, effects?: SynthEffects): Synthesizer;
};
export default _default;
declare class Synthesizer {
    oscillator: OscillatorOptions;
    filter: FilterOptions;
    amp: AmpOptions;
    bmp: number;
    reverb: ReverbOptions;
    delay: DelayOptions;
    options: {
        bmp: number;
    };
    constructor({ oscillator, filter, amp }?: SynthProps, { bmp, reverb, delay }?: SynthEffects);
    static keymap: {
        [key: string]: number;
    };
    static notemap: {
        [key: string]: number;
    };
    press(frequency: number | string, duration?: number | string | null, wait?: number): {
        release: () => void;
    };
}
