import { xnew as base } from './core/xnew';
import { Unit } from './core/unit';

import { AccordionFrame, AccordionHeader, AccordionBullet, AccordionContent } from './basics/Accordion';
import { ResizeEvent, PointerEvent, KeyboardEvent } from './basics/Event';
import { Screen } from './basics/Screen';
import { ModalFrame, ModalContent } from './basics/Modal';
import { TabFrame, TabButton, TabContent } from './basics/Tab';
import { DragFrame, DragTarget } from './basics/Drag';
import { AnalogStick, DirectionalPad } from './basics/Controller';

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
};

namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}
const xnew: (typeof base) & { basics: typeof basics;} = Object.assign(base, { basics });

export default xnew;