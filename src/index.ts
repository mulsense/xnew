import { ResizeEvent } from './basics/ResizeEvent';
import { UserEvent } from './basics/UserEvent';
import { Screen } from './basics/Screen';

import { InputFrame } from './basics/Input';

import { ModalFrame, ModalContent } from './basics/Modal';
import { TabFrame, TabButton, TabContent } from './basics/Tab';
import { AccordionFrame, AccordionHeader, AccordionBullet, AccordionContent } from './basics/Accordion';
import { DragFrame, DragTarget } from './basics/SubWIndow';
import { TouchStick, DirectionalPad, TouchButton } from './basics/Touch';

import { Unit } from './core/unit';
import { xnew as base } from './core/xnew';

import { load } from './audio/loader';
import { synthesizer } from './audio/synthesizer';

const basics = {
    Screen,
    UserEvent,
    ResizeEvent,
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
    TouchStick,
    DirectionalPad,
    TouchButton,
};

const audio = {
    synthesizer, load
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