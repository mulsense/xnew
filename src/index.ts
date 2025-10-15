import { ResizeEvent, UserEvent } from './basics/Event';
import { Screen } from './basics/Screen';
import { Modal, Accordion, Tab } from './basics/Block';

import { Unit } from './core/unit';
import { xnew as base, xnewtype as basetype } from './core/xnew';

interface xnewtype extends basetype {
    Screen: Function;
    UserEvent: Function;
    ResizeEvent: Function;
    Modal: Function;
    Accordion: Function;
    Tab: Function;
}

namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}

const xnew: xnewtype = Object.assign(base, {
    Screen,
    UserEvent,
    ResizeEvent,
    Modal,
    Accordion,
    Tab,
});

export default xnew;