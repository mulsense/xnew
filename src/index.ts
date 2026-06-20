import { xnew as base } from './core/xnew';
import { Unit, UnitTimer, ComponentFn, Status as CoreStatus } from './core/unit';
import { Environment as CoreEnvironment } from './core/env';

// boot に渡す socket を型付けできるよう、socket 契約型を公開する。
export type { ClientSocket, ServerSocket, RootSocket, BootOptions, ClientInfo } from './utils/sync';

import { OpenAndClose, Accordion, Popup } from './basics/Transition';
import { SVG, SVGText } from './basics/SVG';
import { Screen } from './basics/Screen';
import { AnalogStick, DPad } from './basics/Controller';
import { Panel } from './basics/Panel';
import { Scene } from './basics/Scene';
import { Lobby, Room } from './basics/Sync';
import { Selectable } from './basics/Selectable';
import { VolumeController } from './basics/Volume';

import { image } from './utils/image';
import { audio, AudioTrack } from './utils/audio';
import { sync } from './utils/sync';

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
    Lobby,
    Room,
    Selectable,
    VolumeController,
};

namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
    export type UnitTimer = InstanceType<typeof UnitTimer>;
    export type Component<P extends object = any, A extends object = {}> = ComponentFn<P, A>;
    export type Environment = CoreEnvironment;
    export type Status = CoreStatus;
    export namespace audio {
        export type AudioTrack = InstanceType<typeof AudioTrack>;
    }
}

const xnew = Object.assign(base, { basics, audio, image, sync });

export default xnew;