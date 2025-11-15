import { xnew as base } from './core/xnew';
import { Unit } from './core/unit';

import { ResizeEvent } from './basics/ResizeEvent';
import { PointerEvent } from './basics/PointerEvent';
import { KeyboardEvent } from './basics/KeyboardEvent';
import { Screen } from './basics/Screen';

import { InputFrame } from './basics/Input';

import { ModalFrame, ModalContent } from './basics/Modal';
import { TabFrame, TabButton, TabContent } from './basics/Tab';
import { AccordionFrame, AccordionHeader, AccordionBullet, AccordionContent } from './basics/Accordion';
import { DragFrame, DragTarget } from './basics/Drag';
import { AnalogStick, DirectionalPad } from './basics/Controller';

import { audio } from './audio/audio';

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
    InputFrame,
    DragFrame,
    DragTarget,
    AnalogStick,
    DirectionalPad,
};

namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}

const xnew: (typeof base) & { basics: typeof basics; audio: typeof audio } = Object.assign(base, {
    basics,
    audio
});

export default xnew;