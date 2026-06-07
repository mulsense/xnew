import { xnew as base } from './core/xnew';
import { Unit, UnitTimer, ComponentFn, Mode as CoreMode, Status as CoreStatus } from './core/unit';
import { Group as CoreGroup } from './core/group';

import { OpenAndClose, Accordion, Popup } from './basics/Transition';
import { SVG, SVGText } from './basics/SVG';
import { Screen } from './basics/Screen';
import { AnalogStick, DPad } from './basics/Controller';
import { Panel } from './basics/Panel';
import { Scene } from './basics/Scene';
import { Selectable } from './basics/Selectable';
import { VolumeController } from './basics/Volume';

import { ImageData, ImageDataArgs } from './utils/image';
import { master, AudioTrack, Synthesizer, SynthesizerOptions } from './utils/audio';

const basics = {
    SVG,
    SVGText,
    Screen,
    OpenAndClose,
    AnalogStick,
    DPad,
    Panel,
    Accordion,
    Popup,
    Scene,
    Selectable,
    VolumeController,
};

const audio = {
    AudioTrack,
    load(path: string) {
        const music = new AudioTrack(path);
        xnew().on('finalize', () => music.pause({ fade: 500 }));

        return xnew.promise(music.promise).then(() => music);
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

    from(canvas: HTMLCanvasElement): ImageData {
        return new ImageData(canvas);
    }
}

namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
    export type UnitTimer = InstanceType<typeof UnitTimer>;
    export type Component<P extends object = any, A extends object = {}> = ComponentFn<P, A>;
    export type Mode = CoreMode;
    export type Status = CoreStatus;
    export type Group<K = any> = CoreGroup<K>;
    export namespace audio {
        export type AudioTrack = InstanceType<typeof AudioTrack>;
    }
}

const xnew = Object.assign(base, { basics, audio, image });

export default xnew;