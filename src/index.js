import { xnew } from './core/xnew';
export default xnew;

import { DragEvent } from './basics/DragEvent';
import { GestureEvent } from './basics/GestureEvent';
import { ResizeEvent } from './basics/ResizeEvent';
import { PointerEvent } from './basics/PointerEvent';

import { Screen } from './basics/Screen';
import { Modal } from './basics/Modal';
import { Keyboard } from './basics/Keyboard';
Object.defineProperty(xnew, 'Screen', { enumerable: true, value: Screen });
Object.defineProperty(xnew, 'DragEvent', { enumerable: true, value: DragEvent });
Object.defineProperty(xnew, 'GestureEvent', { enumerable: true, value: GestureEvent });
Object.defineProperty(xnew, 'PointerEvent', { enumerable: true, value: PointerEvent });
Object.defineProperty(xnew, 'ResizeEvent', { enumerable: true, value: ResizeEvent });
Object.defineProperty(xnew, 'Modal', { enumerable: true, value: Modal });
Object.defineProperty(xnew, 'Keyboard', { enumerable: true, value: Keyboard });

