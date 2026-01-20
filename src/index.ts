import { xnew as base } from './core/xnew';
import { Unit } from './core/unit';

import { AccordionFrame, AccordionContent } from './basics/Accordion';
import { Screen } from './basics/Screen';
import { ModalFrame, ModalContent } from './basics/Modal';
import { DragFrame, DragTarget } from './basics/Drag';
import { AnalogStick, DirectionalPad } from './basics/Controller';
import { TextStream } from './basics/Text';

const basics = {
    Screen,
    ModalFrame,
    ModalContent,
    AccordionFrame,
    AccordionContent,
    TextStream,
    DragFrame,
    DragTarget,
    AnalogStick,
    DirectionalPad,
};

namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}
const xnew: (typeof base) & { basics: typeof basics; } = Object.assign(base, { basics });

export default xnew;