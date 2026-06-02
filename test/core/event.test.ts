import { Eventor } from '../../src/core/event';

//----------------------------------------------------------------------------------------------------
// Eventor — normalized DOM event binding.
//
// Real public surface (verified against src/core/event.ts):
//   new Eventor()                                   — no constructor args
//   add(element, type, listener, options?)          — element first, then type, then listener
//   remove(type, listener)                          — note: NO element argument
//
// Registration is deferred by one setTimeout(.., 0) tick (see listen()). With fake timers,
// jest.runOnlyPendingTimers() flushes that tick so the native listener is attached.
//
// Normalized payload per family (the object the listener receives):
//   basic / window.* / document.* / window.keydown|keyup : { event }
//   change / input                                        : { event, value }
//   click / pointer* / mouse* / touch* / *.outside        : { event, position: { x, y } }
//   wheel                                                 : { event, delta: { x, y } }
//   window.keydown|keyup .arrow / .wasd                   : { event, vector: { x, y } }
//   resize                                                : {}
//   drag*                                                 : { event, position, delta }
//----------------------------------------------------------------------------------------------------

const RECT = {
    left: 10, top: 20, right: 0, bottom: 0, width: 0, height: 0, x: 10, y: 20, toJSON() {},
} as DOMRect;

describe('Eventor', () => {
    let element: HTMLElement;
    let eventor: Eventor;

    beforeEach(() => {
        jest.useFakeTimers();
        element = document.createElement('div');
        document.body.appendChild(element);
        eventor = new Eventor();
    });

    afterEach(() => {
        element.remove();
        jest.useRealTimers();
    });

    describe('deferred registration', () => {
        it('defers registration by one tick', () => {
            const listener = jest.fn();
            eventor.add(element, 'click', listener);

            // Before the deferred tick: native listener is not attached yet.
            element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(listener).not.toHaveBeenCalled();

            jest.runOnlyPendingTimers();
            element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('remove() cancels a pending registration before the tick', () => {
            const listener = jest.fn();
            eventor.add(element, 'click', listener);
            eventor.remove('click', listener);

            jest.runOnlyPendingTimers();
            element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(listener).not.toHaveBeenCalled();
        });

        it('remove() stops a registered listener after the tick', () => {
            const listener = jest.fn();
            eventor.add(element, 'click', listener);
            jest.runOnlyPendingTimers();

            eventor.remove('click', listener);
            element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('pointer / mouse / click position', () => {
        beforeEach(() => {
            jest.spyOn(element, 'getBoundingClientRect').mockReturnValue(RECT);
        });

        it('passes { event, position } for a click (clientXY minus rect origin)', () => {
            const listener = jest.fn();
            eventor.add(element, 'click', listener);
            jest.runOnlyPendingTimers();

            const event = new MouseEvent('click', { clientX: 25, clientY: 45, bubbles: true });
            element.dispatchEvent(event);

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith({ event, position: { x: 15, y: 25 } });
        });

        it('passes { event, position } for a mousedown', () => {
            const listener = jest.fn();
            eventor.add(element, 'mousedown', listener);
            jest.runOnlyPendingTimers();

            const event = new MouseEvent('mousedown', { clientX: 30, clientY: 70, bubbles: true });
            element.dispatchEvent(event);

            expect(listener).toHaveBeenCalledWith({ event, position: { x: 20, y: 50 } });
        });

        it('passes { event, position } for a pointerdown', () => {
            const listener = jest.fn();
            eventor.add(element, 'pointerdown', listener);
            jest.runOnlyPendingTimers();

            const event = new MouseEvent('pointerdown', { clientX: 10, clientY: 20, bubbles: true });
            element.dispatchEvent(event);

            expect(listener).toHaveBeenCalledWith({ event, position: { x: 0, y: 0 } });
        });
    });

    describe('click.outside', () => {
        it('fires only when the event target is outside the element', () => {
            jest.spyOn(element, 'getBoundingClientRect').mockReturnValue(RECT);
            const inside = document.createElement('span');
            element.appendChild(inside);
            const outside = document.createElement('button');
            document.body.appendChild(outside);

            const listener = jest.fn();
            eventor.add(element, 'click.outside', listener);
            jest.runOnlyPendingTimers();

            // Click inside the element: ignored.
            inside.dispatchEvent(new MouseEvent('click', { clientX: 25, clientY: 45, bubbles: true }));
            expect(listener).not.toHaveBeenCalled();

            // Click outside the element: fires with normalized position.
            outside.dispatchEvent(new MouseEvent('click', { clientX: 25, clientY: 45, bubbles: true }));
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener.mock.calls[0][0]).toMatchObject({ position: { x: 15, y: 25 } });

            outside.remove();
        });
    });

    describe('change / input value extraction', () => {
        it('extracts a text input value on change', () => {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = 'hello';
            document.body.appendChild(input);

            const listener = jest.fn();
            eventor.add(input, 'change', listener);
            jest.runOnlyPendingTimers();

            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);

            expect(listener).toHaveBeenCalledWith({ event, value: 'hello' });
            input.remove();
        });

        it('extracts a checkbox checked state on change', () => {
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = true;
            document.body.appendChild(input);

            const listener = jest.fn();
            eventor.add(input, 'change', listener);
            jest.runOnlyPendingTimers();

            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);

            expect(listener).toHaveBeenCalledWith({ event, value: true });
            input.remove();
        });

        it('parses a number/range value as a float on input', () => {
            const input = document.createElement('input');
            input.type = 'range';
            input.value = '42';
            document.body.appendChild(input);

            const listener = jest.fn();
            eventor.add(input, 'input', listener);
            jest.runOnlyPendingTimers();

            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);

            expect(listener).toHaveBeenCalledWith({ event, value: 42 });
            input.remove();
        });
    });

    describe('wheel', () => {
        it('passes { event, delta } from legacy wheelDelta props', () => {
            const listener = jest.fn();
            eventor.add(element, 'wheel', listener);
            jest.runOnlyPendingTimers();

            // jsdom does not populate the legacy wheelDeltaX/Y props that the handler reads,
            // so assign them on the event instance to exercise the real payload mapping.
            const event = new WheelEvent('wheel', { bubbles: true });
            Object.defineProperty(event, 'wheelDeltaX', { value: -30 });
            Object.defineProperty(event, 'wheelDeltaY', { value: 120 });
            element.dispatchEvent(event);

            expect(listener).toHaveBeenCalledWith({ event, delta: { x: -30, y: 120 } });
        });
    });

    describe('basic element event', () => {
        it('passes { event } for an unrecognized event type', () => {
            const listener = jest.fn();
            eventor.add(element, 'focus', listener);
            jest.runOnlyPendingTimers();

            const event = new Event('focus');
            element.dispatchEvent(event);

            expect(listener).toHaveBeenCalledWith({ event });
        });
    });

    describe('window basic event', () => {
        it('strips the "window." prefix and binds on window with { event }', () => {
            const listener = jest.fn();
            eventor.add(element, 'window.resize', listener);
            jest.runOnlyPendingTimers();

            const event = new Event('resize');
            window.dispatchEvent(event);

            expect(listener).toHaveBeenCalledWith({ event });
        });
    });

    describe('document basic event', () => {
        it('strips the "document." prefix and binds on document with { event }', () => {
            const listener = jest.fn();
            eventor.add(element, 'document.visibilitychange', listener);
            jest.runOnlyPendingTimers();

            const event = new Event('visibilitychange');
            document.dispatchEvent(event);

            expect(listener).toHaveBeenCalledWith({ event });
        });
    });

    describe('window keyboard', () => {
        it('passes { event } for window.keydown and filters repeat events', () => {
            const listener = jest.fn();
            eventor.add(element, 'window.keydown', listener);
            jest.runOnlyPendingTimers();

            const repeated = new KeyboardEvent('keydown', { code: 'KeyX', repeat: true });
            window.dispatchEvent(repeated);
            expect(listener).not.toHaveBeenCalled();

            const fresh = new KeyboardEvent('keydown', { code: 'KeyX', repeat: false });
            window.dispatchEvent(fresh);
            expect(listener).toHaveBeenCalledWith({ event: fresh });
        });

        it('accumulates arrow keys into a vector (down = +y, up = -y)', () => {
            const listener = jest.fn();
            eventor.add(element, 'window.keydown.arrow', listener);
            jest.runOnlyPendingTimers();

            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
            expect(listener).toHaveBeenLastCalledWith(
                expect.objectContaining({ vector: { x: 0, y: -1 } }),
            );

            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
            expect(listener).toHaveBeenLastCalledWith(
                expect.objectContaining({ vector: { x: 1, y: -1 } }),
            );
        });

        it('decrements the arrow vector on keyup', () => {
            const listener = jest.fn();
            // keydown.arrow and keyup.arrow share a keymap only within one add(); the keyup
            // variant tracks its own state, so register keyup.arrow and prime keys via keydown.
            eventor.add(element, 'window.keyup.arrow', listener);
            jest.runOnlyPendingTimers();

            // keydown updates the internal keymap (does not fire this listener);
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
            expect(listener).not.toHaveBeenCalled();

            // keyup on ArrowLeft fires with the remaining held key (ArrowDown => y:+1).
            window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
            expect(listener).toHaveBeenLastCalledWith(
                expect.objectContaining({ vector: { x: 0, y: 1 } }),
            );
        });

        it('accumulates wasd keys into a vector (W = -y, D = +x)', () => {
            const listener = jest.fn();
            eventor.add(element, 'window.keydown.wasd', listener);
            jest.runOnlyPendingTimers();

            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            expect(listener).toHaveBeenLastCalledWith(
                expect.objectContaining({ vector: { x: 0, y: -1 } }),
            );

            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
            expect(listener).toHaveBeenLastCalledWith(
                expect.objectContaining({ vector: { x: 1, y: -1 } }),
            );
        });

        it('filters repeat events on the wasd binding', () => {
            const listener = jest.fn();
            eventor.add(element, 'window.keydown.wasd', listener);
            jest.runOnlyPendingTimers();

            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', repeat: true }));
            expect(listener).not.toHaveBeenCalled();
        });
    });

    // jsdom does not implement ResizeObserver, so the 'resize' element binding cannot be driven.
    it.todo('passes {} for a resize binding (jsdom: ResizeObserver not implemented)');

    // jsdom has no real Touch/TouchEvent constructor usable for these bindings; the handler shape
    // is identical to mouse/pointer ({ event, position }) but cannot be exercised reliably.
    it.todo('passes { event, position } for a touchstart (jsdom: Touch/TouchEvent not implemented)');

    // dragstart/dragmove/dragend rely on real PointerEvent.pointerId capture + window pointermove/up
    // sequencing; jsdom PointerEvent does not carry pointerId, so the drag state machine cannot run.
    it.todo('passes { event, position, delta } across a drag sequence (jsdom: PointerEvent.pointerId unsupported)');
});
