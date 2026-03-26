import { xnew as base } from './core/xnew';
import { Unit, UnitTimer } from './core/unit';

import { OpenAndClose, Accordion, Popup } from './basics/Transition';
import { SVG } from './basics/SVG';
import { Screen } from './basics/Screen';
import { AnalogStick, DPad } from './basics/Controller';
import { Panel } from './basics/Panel';
import { Scene } from './basics/Scene';
import { VolumeController } from './basics/Volume';

import { XImage, XImageArgs } from './utils/image';
import { master, AudioFile, Synthesizer, SynthesizerOptions } from './utils/audio';

const basics = {
    SVG,
    Screen,
    OpenAndClose,
    AnalogStick,
    DPad,
    Panel,
    Accordion,
    Popup,
    Scene,
    VolumeController,
};

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

const image = {

    from(canvas: HTMLCanvasElement): XImage {
        return new XImage(canvas);
    }
}

namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
    export type UnitTimer = InstanceType<typeof UnitTimer>;
}

const xnew = Object.assign(base, { basics, audio, image });

export default xnew;