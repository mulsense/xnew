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

import { Unit } from './core/unit';
import { xnew as base } from './core/xnew';

import { master, context } from './audio/audio';
import { load } from './audio/file';
import { synthesizer } from './audio/synthesizer';

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

const audio = {
    master,
    context,
    synthesizer,
    load
};

export interface xnew_interface {
    (...args: any[]): Unit;
    [key: string]: any;
    basics: typeof basics;
    audio: typeof audio;
}


namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}

const xnew: xnew_interface = Object.assign(base, {
    basics,
    audio,
});

export default xnew;