import { ResizeEvent } from './basics/ResizeEvent';
import { UserEvent } from './basics/UserEvent';
import { Screen } from './basics/Screen';
// import { Modal } from './basics/Modal';
// import { Accordion } from './basics/Accordion';

import { Unit } from './core/unit';
import { xnew as base, xnewtype as basetype } from './core/xnew';

interface xnewtype extends basetype {
    Screen: Function;
    UserEvent: Function;
    ResizeEvent: Function;
}

namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}

const xnew: xnewtype = Object.assign(base, {
    Screen,
    UserEvent,
    ResizeEvent,
});

export default xnew;