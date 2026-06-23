//----------------------------------------------------------------------------------------------------
// audio — built-in audio components + the shared Web Audio bus
//
// Owns the package's single AudioContext + master GainNode (created at module load) so every audio
// source mixes through one bus, and exposes audio sources as components that live as units in the
// tree and release their nodes automatically when their unit finalizes.
//
// Side effect on import: instantiates window.AudioContext and connects the master gain. In a context-
// less environment (Node/SSR/jsdom or unsupported browsers) `context`/`master` fall back to null so
// import never throws.
//
// - AudioTrack        : component({ url, volume?, loop? }) — fetches + decodes an audio file and drives
//                       it with play / pause (play({ offset: 0 }) restarts, play() resumes). Registers
//                       the load with the unit's promise aggregation and releases nodes on finalize.
// - Synthesizer       : component(SynthesizerOptions) — oscillator + amp / filter / reverb + ADSR + LFO
//                       synth driven by press(frequency, duration?, wait?), with note-name ('A4', 'C#5')
//                       and rhythmic ('4n', '8n') key maps. A note with no duration sustains and
//                       returns { release } for the caller to stop.
// - Volume            : component() — master-gain accessor (volume / muted). The bridge that lets UI
//                       code read / write the global volume without touching the private master node.
//                       Standalone or used as a base via xnew.extend(xnew.basics.Volume).
//
// Usage:
//   const track = xnew(xnew.basics.AudioTrack, { url: 'bgm.mp3', loop: true });
//   track.play();
//   track.pause();
//
//   const synth = xnew(xnew.basics.Synthesizer, { oscillator: { type: 'sine' }, amp: { envelope: ... } });
//   synth.press('A4', '4n');
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

//----------------------------------------------------------------------------------------------------
// shared Web Audio bus — single AudioContext + master GainNode
//----------------------------------------------------------------------------------------------------

const DEFAULT_MASTER_GAIN = 0.1;
const DEFAULT_BPM = 120;
const RELEASE_CLEANUP_DELAY_MS = 2000;

// AudioContext が無い環境（Node/SSR/jsdom や未対応ブラウザ）では null に落とす（import 時に落ちない）。
const AudioContextCtor: typeof AudioContext | undefined =
    typeof window !== 'undefined' ? (window.AudioContext ?? (window as any).webkitAudioContext) : undefined;
const context: AudioContext = typeof AudioContextCtor === 'function' ? new AudioContextCtor() : null as unknown as AudioContext;
const master: GainNode = context !== null ? context.createGain() : null as unknown as GainNode;

if (context !== null && master !== null) {
    master.gain.value = DEFAULT_MASTER_GAIN;
    master.connect(context.destination);
}

//----------------------------------------------------------------------------------------------------
// AudioTrack — fetch + decode an audio file and drive it as a unit
//
// `startedAt` is the (virtual) AudioContext time at which playback would have started from offset 0
// — i.e. `currentTime - startedAt` is the position within the buffer. On pause, that position is
// frozen into `pausedOffsetMs` so a subsequent `play()` with no explicit offset picks it up — i.e.
// `play()` doubles as resume, while `play({ offset: 0 })` restarts from the beginning. `looping` is
// stored so `pause()` can mod the position by buffer.duration only when looping.
//----------------------------------------------------------------------------------------------------

export function AudioTrack(unit: Unit, { url, volume, loop = false }: { url: string, volume?: number, loop?: boolean }) {
    let buffer: AudioBuffer | undefined;
    let source: AudioBufferSourceNode | null = null;
    let startedAt: number | null = null;
    let pausedOffsetMs = 0;
    let looping = loop;

    const amp = context.createGain();
    amp.gain.value = volume ?? 1.0;
    amp.connect(master);
    const fade = context.createGain();
    fade.gain.value = 1.0;
    fade.connect(amp);

    const promise = fetch(url)
        .then((response) => response.arrayBuffer())
        .then((response) => context.decodeAudioData(response))
        .then((response) => { buffer = response; });
    xnew.promise(promise);

    // Hard-stops the source without triggering onended state cleanup. Caller resets remaining state.
    function forceStop() {
        if (source !== null) {
            source.onended = null;
            try {
                source.stop();
            } catch {
                // Source was never started or already stopped — safe to ignore.
            }
            source.disconnect();
            source = null;
        }
        startedAt = null;
    }

    function startSource(offsetMs: number, fadeMs: number) {
        const node = context.createBufferSource();
        source = node;
        node.buffer = buffer!;
        node.loop = looping;
        node.connect(fade);

        const now = context.currentTime;
        startedAt = now - offsetMs / 1000;
        node.start(now, offsetMs / 1000);

        // Always pin the fade gain to its target: a prior fade-out (pause) may have left it at 0, so
        // a fade=0 play would otherwise be silent.
        fade.gain.cancelScheduledValues(now);
        if (fadeMs > 0) {
            fade.gain.setValueAtTime(0, now);
            fade.gain.linearRampToValueAtTime(1.0, now + fadeMs / 1000);
        } else {
            fade.gain.setValueAtTime(1.0, now);
        }

        node.onended = () => {
            node.disconnect();
            // Only clear state if this is still the active source. `pause()` and re-trigger replace /
            // null out `source`, so a stale onended firing after their fade-out must not clobber
            // pausedOffsetMs.
            if (source === node) {
                source = null;
                startedAt = null;
                pausedOffsetMs = 0;
            }
        };
    }

    function stopSource(node: AudioBufferSourceNode, fadeMs: number) {
        const now = context.currentTime;
        if (fadeMs > 0) {
            fade.gain.setValueAtTime(1.0, now);
            fade.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
            node.stop(now + fadeMs / 1000);
        } else {
            node.stop(now);
        }
    }

    // Plays from `offset` (ms). `offset: 0` starts from the beginning; if `offset` is omitted, resumes
    // from the position saved by the last pause() — which is 0 on a fresh track, so the first call
    // plays from the beginning either way.
    //
    // Load-aware: calling before the buffer is decoded defers playback until the load resolves (so
    // `xnew(AudioTrack, { url }).play()` is safe without awaiting). Re-trigger: calling while already
    // playing restarts at the resolved offset — handy for rapid SE replay — rather than no-op.
    function play({ offset, fade: fadeMs = 0, loop: loopArg }: { offset?: number, fade?: number, loop?: boolean } = {}) {
        if (buffer === undefined) {
            promise.then(() => play({ offset, fade: fadeMs, loop: loopArg }));
            return;
        }
        if (loopArg !== undefined) {
            looping = loopArg;
        }
        if (startedAt !== null) {
            forceStop();
        }
        startSource(offset ?? pausedOffsetMs, fadeMs);
    }

    function pause({ fade: fadeMs = 0 }: { fade?: number } = {}) {
        if (buffer === undefined || startedAt === null) {
            return;
        }
        const elapsedSec = context.currentTime - startedAt;
        const positionSec = looping ? elapsedSec % buffer.duration : Math.min(elapsedSec, buffer.duration);
        pausedOffsetMs = positionSec * 1000;

        // Detach the current source before scheduling its stop. Its `onended` will fire after the
        // fade-out completes (or immediately for fade=0); the guard inside `onended` checks
        // `source === node` and, finding it false, skips state cleanup so pausedOffsetMs survives.
        const node = source!;
        source = null;
        startedAt = null;
        stopSource(node, fadeMs);
    }

    // Release the Web Audio nodes when the unit is finalized.
    unit.on('finalize', () => {
        forceStop();
        amp.disconnect();
        fade.disconnect();
        pausedOffsetMs = 0;
    });

    return {
        play,
        pause,
        get isPlaying(): boolean {
            return startedAt !== null;
        },
        get isLoaded(): boolean {
            return buffer !== undefined;
        },
        get volume(): number {
            return amp.gain.value;
        },
        set volume(value: number) {
            amp.gain.value = value;
        },
    };
}

//----------------------------------------------------------------------------------------------------
// Synthesizer — option types
//----------------------------------------------------------------------------------------------------

export type SynthesizerOptions = {
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
    type: OscillatorType;
    rate: number; // 1 ~ 128
};

//----------------------------------------------------------------------------------------------------
// note tables — frequency in Hz / note-length as a beat multiplier
//----------------------------------------------------------------------------------------------------

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

//----------------------------------------------------------------------------------------------------
// Synthesizer — helpers
//----------------------------------------------------------------------------------------------------

function resolveFrequency(value: number | string): number {
    if (typeof value === 'string') {
        return keymap[value];
    } else {
        return value;
    }
}

function resolveDurationSeconds(value: number | string | undefined, bpm: number): number {
    if (typeof value === 'string') {
        return notemap[value] * 60 / bpm;
    } else if (typeof value === 'number') {
        return value / 1000;
    } else {
        return 0;
    }
}

// Frequency offset in Hz for a +amount semitone modulation of baseFreq.
function semitoneOffset(baseFreq: number, amount: number): number {
    return baseFreq * (Math.pow(2.0, amount / 12.0) - 1.0);
}

function scheduleAttackDecay(param: AudioParam, start: number, base: number, amount: number, ADSR: [number, number, number, number]): void {
    const [a, d, s] = ADSR;
    param.value = base;
    param.setValueAtTime(base, start);
    param.linearRampToValueAtTime(base + amount, start + a / 1000);
    param.linearRampToValueAtTime(base + amount * s, start + (a + d) / 1000);
}

function scheduleRelease(param: AudioParam, start: number, dv: number, base: number, amount: number, ADSR: [number, number, number, number]): void {
    const [a, d, s, r] = ADSR;
    const end = dv > 0 ? dv : (context.currentTime - start);
    const rate = a === 0 ? 1.0 : Math.min(end / (a / 1000), 1.0);
    if (rate < 1.0) {
        param.cancelScheduledValues(start);
        param.setValueAtTime(base, start);
        param.linearRampToValueAtTime(base + amount * rate, start + (a / 1000) * rate);
        param.linearRampToValueAtTime(base + amount * rate * s, start + ((a + d) / 1000) * rate);
    }
    param.linearRampToValueAtTime(base + amount * rate * s, start + Math.max(((a + d) / 1000) * rate, dv));
    param.linearRampToValueAtTime(base, start + Math.max(((a + d) / 1000) * rate, end) + r / 1000);
}

function createImpulseResponse(timeMs: number, decay = 2.0): AudioBuffer {
    const length = context.sampleRate * timeMs / 1000;
    const impulse = context.createBuffer(2, length, context.sampleRate);
    const ch0 = impulse.getChannelData(0);
    const ch1 = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
        const k = Math.pow(1 - i / length, decay);
        ch0[i] = (2 * Math.random() - 1) * k;
        ch1[i] = (2 * Math.random() - 1) * k;
    }
    return impulse;
}

type LFOAttachment = { oscillator: OscillatorNode; depth: GainNode };

function attachLFO(target: OscillatorNode, baseFreq: number, lfo: LFO, start: number): LFOAttachment {
    const oscillator = context.createOscillator();
    const depth = context.createGain();
    depth.gain.value = semitoneOffset(baseFreq, lfo.amount);
    oscillator.type = lfo.type;
    oscillator.frequency.value = lfo.rate;
    oscillator.start(start);
    oscillator.connect(depth);
    depth.connect(target.frequency);
    return { oscillator, depth };
}

type ReverbAttachment = { convolver: ConvolverNode; depth: GainNode };

// Wet branch from `amp` to `master`. Also scales the dry-path `target` so wet+dry sums to ~1.
function attachReverb(amp: GainNode, target: GainNode, reverb: ReverbOptions): ReverbAttachment {
    const convolver = context.createConvolver();
    convolver.buffer = createImpulseResponse(reverb.time);
    const depth = context.createGain();
    depth.gain.value = reverb.mix;
    target.gain.value *= (1.0 - reverb.mix);

    amp.connect(convolver);
    convolver.connect(depth);
    depth.connect(master);
    return { convolver, depth };
}

//----------------------------------------------------------------------------------------------------
// Synthesizer — component
//----------------------------------------------------------------------------------------------------

export function Synthesizer(unit: Unit, props: SynthesizerOptions) {
    // Press a note: `frequency` is a Hz number or note name ('A4'); `duration` is ms or a note length
    // ('4n'). With a duration the note auto-releases; without one it sustains and returns { release }
    // so the caller can stop it. `wait` (ms) delays the attack.
    function press(frequency: number | string, duration?: number | string, wait?: number) {
        const freq = resolveFrequency(frequency);
        const dv = resolveDurationSeconds(duration, props.bpm ?? DEFAULT_BPM);
        const start = context.currentTime + (wait ?? 0) / 1000;

        // Sound source.
        const oscillator = context.createOscillator();
        oscillator.type = props.oscillator.type;
        oscillator.frequency.value = freq;

        const lfo = props.oscillator.LFO ? attachLFO(oscillator, freq, props.oscillator.LFO, start) : null;

        // amp → target → master, with optional wet path from amp.
        const amp = context.createGain();
        amp.gain.value = 0.0;
        const target = context.createGain();
        target.gain.value = 1.0;
        amp.connect(target);
        target.connect(master);

        // Optional filter inserted between oscillator and amp.
        let filter: BiquadFilterNode | null = null;
        if (props.filter) {
            filter = context.createBiquadFilter();
            filter.type = props.filter.type;
            filter.frequency.value = props.filter.cutoff;
            oscillator.connect(filter);
            filter.connect(amp);
        } else {
            oscillator.connect(amp);
        }

        const reverb = props.reverb ? attachReverb(amp, target, props.reverb) : null;

        // Schedule attack/decay phase.
        if (props.oscillator.envelope) {
            const amount = semitoneOffset(freq, props.oscillator.envelope.amount);
            scheduleAttackDecay(oscillator.frequency, start, freq, amount, props.oscillator.envelope.ADSR);
        }
        if (props.amp.envelope) {
            scheduleAttackDecay(amp.gain, start, 0.0, props.amp.envelope.amount, props.amp.envelope.ADSR);
        }

        oscillator.start(start);

        // Collect nodes to stop / disconnect when the note ends.
        const oscillators: OscillatorNode[] = [oscillator];
        const nodesToDisconnect: AudioNode[] = [oscillator, amp, target];
        if (lfo) {
            oscillators.push(lfo.oscillator);
            nodesToDisconnect.push(lfo.oscillator, lfo.depth);
        }
        if (filter) {
            nodesToDisconnect.push(filter);
        }
        if (reverb) {
            nodesToDisconnect.push(reverb.convolver, reverb.depth);
        }

        const release = () => {
            const end = dv > 0 ? dv : (context.currentTime - start);
            let stop: number;
            if (props.amp.envelope) {
                const [a, d, , r] = props.amp.envelope.ADSR;
                const aSec = a / 1000;
                const dSec = d / 1000;
                const rSec = r / 1000;
                const rate = aSec === 0.0 ? 1.0 : Math.min(end / (aSec + 0.001), 1.0);
                stop = start + Math.max((aSec + dSec) * rate, end) + rSec;
            } else {
                stop = start + end;
            }

            if (props.oscillator.envelope) {
                const amount = semitoneOffset(freq, props.oscillator.envelope.amount);
                scheduleRelease(oscillator.frequency, start, dv, freq, amount, props.oscillator.envelope.ADSR);
            }
            if (props.amp.envelope) {
                scheduleRelease(amp.gain, start, dv, 0.0, props.amp.envelope.amount, props.amp.envelope.ADSR);
            }

            for (const o of oscillators) {
                o.stop(stop);
            }

            setTimeout(() => {
                for (const n of nodesToDisconnect) {
                    n.disconnect();
                }
            }, RELEASE_CLEANUP_DELAY_MS);
        };

        if (dv > 0) {
            release();
        } else {
            return { release };
        }
    }

    return { press };
}

//----------------------------------------------------------------------------------------------------
// Volume — master-gain accessor as a component
//
// The package's master GainNode is module-private, so this component is the bridge that lets external
// code (UI widgets like a slider) read / write the global volume without touching the node directly.
// Use standalone (`const v = xnew(xnew.basics.Volume); v.volume = 0.5`) or as a base via
// `xnew.extend(xnew.basics.Volume)` so a UI unit gains the volume / muted accessors.
//----------------------------------------------------------------------------------------------------

export function Volume(unit: Unit) {
    return {
        get volume(): number {
            return master.gain.value;
        },
        set volume(value: number) {
            master.gain.value = value;
        },
        get muted(): boolean {
            return master.gain.value === 0;
        },
    };
}
