import { ResizeEvent } from './basics/ResizeEvent';
import { UserEvent } from './basics/UserEvent';
import { Screen } from './basics/Screen';
// import { Modal } from './basics/Modal';
// import { Accordion } from './basics/Accordion';

import { Unit } from './core/unit';
import { xnew as base } from './core/xnew';

interface xnew extends Function {
    [key: string]: any;
}
namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}

const xnew: xnew = Object.assign(base, {
    Screen,
    UserEvent,
    ResizeEvent,
});

export default xnew;