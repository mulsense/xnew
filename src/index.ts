import { xnew as base } from './core/xnew';
import { Unit, UnitPromise } from './core/unit';

import { AccordionFrame, AccordionHeader, AccordionBullet, AccordionContent } from './basics/Accordion';
import { ResizeEvent, PointerEvent, KeyboardEvent } from './basics/Event';
import { Screen } from './basics/Screen';
import { ModalFrame, ModalContent } from './basics/Modal';
import { TabFrame, TabButton, TabContent } from './basics/Tab';
import { DragFrame, DragTarget } from './basics/Drag';
import { AnalogStick, DirectionalPad } from './basics/Controller';
import { VolumeController } from './basics/Audio';

import { icons } from './icons/icons';

const basics = {
    Screen,
    PointerEvent,
    ResizeEvent,
    KeyboardEvent,
    ModalFrame,
    ModalContent,
    AccordionFrame,
    AccordionHeader,
    AccordionBullet,
    AccordionContent,
    TabFrame,
    TabButton,
    TabContent,
    DragFrame,
    DragTarget,
    AnalogStick,
    DirectionalPad,
    VolumeController
};
import { master, AudioFile, AudioFilePlayOptions, AudioFilePauseOptions, Synthesizer, SynthesizerOptions } from './audio/audio';

const audio = {
    load(path: string): UnitPromise {
        const music = new AudioFile(path);
        const object = {
            play(options: AudioFilePlayOptions) {
                const unit = xnew();
                if (music.played === null) {
                    music.play(options);
                    unit.on('-finalize', () => music.pause({ fade: options.fade }));
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

namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}
const xnew: (typeof base) & {
    basics: typeof basics;
    audio: typeof audio;
    icons: typeof icons;
} = Object.assign(base, { basics, audio, icons });

export default xnew;