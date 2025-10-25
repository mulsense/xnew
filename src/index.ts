import { ResizeEvent } from './basics/ResizeEvent';
import { UserEvent } from './basics/UserEvent';
import { Screen } from './basics/Screen';

import { InputFrame } from './basics/Input';

import { ModalFrame, ModalContent } from './basics/Modal';
import { TabFrame, TabButton, TabContent } from './basics/Tab';
import { AccordionFrame, AccordionButton, AccordionBullet, AccordionContent } from './basics/Accordion';
import { PanelFrame, PanelGroup } from './basics/Panel';
import { DragFrame, DragTarget } from './basics/SubWIndow';
import { VirtualStick, VirtualDPad, VirtualButton } from './basics/Controller';

import { Unit } from './core/unit';
import { xnew as base, xnewtype as basetype } from './core/xnew';

interface xnewtype extends basetype {
    Screen: Function;
    UserEvent: Function;
    ResizeEvent: Function;
    ModalFrame: Function;
    ModalContent: Function;
    AccordionFrame: Function;
    AccordionButton: Function;
    AccordionBullet: Function;
    AccordionContent: Function;
    TabFrame: Function;
    TabButton: Function;
    TabContent: Function;
    PanelFrame: Function;
    PanelGroup: Function;
    InputFrame: Function;
    DragFrame: Function;
    DragTarget: Function;
    VirtualStick: Function;
    VirtualDPad: Function;
    VirtualButton: Function;
}

namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}

const xnew: xnewtype = Object.assign(base, {
    Screen,
    UserEvent,
    ResizeEvent,
    ModalFrame,
    ModalContent,
    AccordionFrame,
    AccordionButton,
    AccordionBullet,
    AccordionContent,
    TabFrame,
    TabButton,
    TabContent,
    PanelFrame,
    PanelGroup,
    InputFrame,
    DragFrame,
    DragTarget,
    VirtualStick,
    VirtualDPad,
    VirtualButton
});

export default xnew;