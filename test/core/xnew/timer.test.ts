import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

describe('xnew timer helpers', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    describe('xnew.timeout', () => {
        it('fires the callback once after the given duration', () => {
            const cb = jest.fn();
            xnew(() => { xnew.timeout(cb, 500); });
            jest.advanceTimersByTime(499);
            expect(cb).not.toHaveBeenCalled();
            jest.advanceTimersByTime(1);
            expect(cb).toHaveBeenCalledTimes(1);
        });
        it('clear() cancels a scheduled callback', () => {
            const cb = jest.fn();
            xnew(() => { const t = xnew.timeout(cb, 500); t.clear(); });
            jest.advanceTimersByTime(1000);
            expect(cb).not.toHaveBeenCalled();
        });
    });

    describe('xnew.interval', () => {
        it('fires the callback up to the given number of iterations', () => {
            const cb = jest.fn();
            xnew(() => { xnew.interval(cb, 100, 3); });
            jest.advanceTimersByTime(100); expect(cb).toHaveBeenCalledTimes(1);
            jest.advanceTimersByTime(100); expect(cb).toHaveBeenCalledTimes(2);
            jest.advanceTimersByTime(100); expect(cb).toHaveBeenCalledTimes(3);
            jest.advanceTimersByTime(100); expect(cb).toHaveBeenCalledTimes(3);
        });
        it('keeps firing indefinitely when iterations is 0', () => {
            const cb = jest.fn();
            xnew(() => { xnew.interval(cb, 50, 0); });
            jest.advanceTimersByTime(50 * 5);
            expect(cb).toHaveBeenCalledTimes(5);
        });
    });

    describe('xnew.transition', () => {
        it('emits 0 immediately and 1 on completion', () => {
            const cb = jest.fn();
            xnew(() => { xnew.transition(cb, 100); });
            expect(cb).toHaveBeenCalledWith({ value: 0 });
            jest.advanceTimersByTime(100);
            expect(cb).toHaveBeenLastCalledWith({ value: 1 });
        });
    });
});
