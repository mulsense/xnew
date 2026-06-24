import { xnew as base } from './core/xnew';
import { Unit, UnitTimer, ComponentFn, Status as CoreStatus } from './core/unit';
import { Environment as CoreEnvironment } from './core/env';

// boot 入力 / ルームステータスの型を公開する（socket は socket.io の io / socket をそのまま渡す）。
export type { BootServerOptions, BootClientOptions, SyncStatus, ClientStatus, RoomStatus } from './core/sync';

import { OpenAndClose, Accordion, Popup } from './basics/transition';
import { SVG, SVGText } from './basics/svg';
import { AnalogStick, DPad } from './basics/controller';
import { Panel } from './basics/panel';
import { Lobby, Room } from './basics/sync';
import { Aspect, Screen, Scene } from './basics/view';
import { AudioTrack as AudioTrackComponent, Synthesizer, Volume } from './basics/audio';

import { sync } from './core/sync';

const basics = {
    SVG,
    SVGText,
    Aspect,
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
    AudioTrack: AudioTrackComponent,
    Synthesizer,
    Volume,
};

namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
    export type UnitTimer = InstanceType<typeof UnitTimer>;
    export type Component<P extends object = any, A extends object = {}> = ComponentFn<P, A>;
    export type Environment = CoreEnvironment;
    export type Status = CoreStatus;
}

const xnew = Object.assign(base, { basics, sync });

export { xnew };