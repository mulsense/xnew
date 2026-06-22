import { xnew as base } from './core/xnew';
import { Unit, UnitTimer, ComponentFn, Status as CoreStatus } from './core/unit';
import { Environment as CoreEnvironment } from './core/env';

// boot 入力 / ルームステータスの型を公開する（socket は socket.io の io / socket をそのまま渡す）。
export type { BootOptions, SyncStatus, ClientStatus, RoomStatus } from './utils/sync';

import { OpenAndClose, Accordion, Popup } from './basics/Transition';
import { SVG, SVGText } from './basics/SVG';
import { Screen } from './basics/Screen';
import { AnalogStick, DPad } from './basics/Controller';
import { Panel } from './basics/Panel';
import { Scene } from './basics/Scene';
import { Lobby, Room } from './basics/Sync';
import { VolumeController } from './basics/Volume';

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

const xnew = Object.assign(base, { basics, audio, sync });

export { xnew };