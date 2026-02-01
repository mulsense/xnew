import { xnew as base } from './core/xnew';
import { Unit } from './core/unit';

import { Accordion } from './basics/Accordion';
import { Screen } from './basics/Screen';
import { Modal } from './basics/Modal';
import { AnalogStick, DirectionalPad } from './basics/Controller';
import { TextStream } from './basics/Text';

const basics = {
    Screen,
    Modal,
    Accordion,
    TextStream,
    AnalogStick,
    DirectionalPad,
};

import { master, AudioFile, Synthesizer, SynthesizerOptions } from './audio/audio';

const audio = {
    load(path: string) {
        const music = new AudioFile(path);
        const object = {
            play(options: { offset?: number, fade?: number, loop?: boolean } = {}) {
                const unit = xnew();
                if (music.start === null) {
                    music.play(options);
                    unit.on('finalize', () => music.pause({ fade: options.fade }));
                }
            },
            pause(options: { fade?: number } = {}) {
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

namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}

const xnew = Object.assign(base, { basics, audio });

export default xnew;