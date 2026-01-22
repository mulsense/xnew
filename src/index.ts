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

namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}
const xnew: (typeof base) & { basics: typeof basics; } = Object.assign(base, { basics });

export default xnew;