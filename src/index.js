import { xnew } from './core/xnew';
export default xnew;

import { ResizeEvent } from './basics/ResizeEvent';
import { UserEvent } from './basics/UserEvent';

import { Screen } from './basics/Screen';
import { Modal } from './basics/Modal';
Object.defineProperty(xnew, 'Screen', { enumerable: true, value: Screen });
Object.defineProperty(xnew, 'UserEvent', { enumerable: true, value: UserEvent });
Object.defineProperty(xnew, 'ResizeEvent', { enumerable: true, value: ResizeEvent });
Object.defineProperty(xnew, 'Modal', { enumerable: true, value: Modal });

