import { Timer } from '../src/core/time';

describe('Timer', () => {
    beforeEach(() => {
        jest.useFakeTimers({ now: 0 });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('timeout', () => {
        it('fires the callback exactly once at the given duration', () => {
            const timeout = jest.fn();
            new Timer({ timeout, duration: 500 });

            jest.advanceTimersByTime(499);
            expect(timeout).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1);
            expect(timeout).toHaveBeenCalledTimes(1);
        });
    });

    describe('transition', () => {
        it('emits 0.0 immediately and 1.0 on completion', () => {
            const transition = jest.fn();
            new Timer({ transition, duration: 100 });

            expect(transition).toHaveBeenNthCalledWith(1, 0.0);

            jest.advanceTimersByTime(100);
            expect(transition).toHaveBeenLastCalledWith(1.0);
        });

        it('emits monotonically increasing progress values', () => {
            const transition = jest.fn();
            new Timer({ transition, duration: 200 });

            jest.advanceTimersByTime(200);

            const progress = transition.mock.calls.map(([p]) => p);
            for (let i = 1; i < progress.length; i++) {
                expect(progress[i]).toBeGreaterThanOrEqual(progress[i - 1]);
            }
            expect(progress[0]).toBe(0);
            expect(progress[progress.length - 1]).toBe(1);
        });
    });

    describe('clear', () => {
        it('cancels a scheduled timeout', () => {
            const timeout = jest.fn();
            const timer = new Timer({ timeout, duration: 500 });

            timer.clear();
            jest.advanceTimersByTime(1000);

            expect(timeout).not.toHaveBeenCalled();
        });
    });

    describe('stop / start', () => {
        it('pauses the elapsed clock until restarted', () => {
            const timeout = jest.fn();
            const timer = new Timer({ timeout, duration: 500 });

            jest.advanceTimersByTime(300);
            timer.stop();
            jest.advanceTimersByTime(1000);
            expect(timeout).not.toHaveBeenCalled();

            timer.start();
            jest.advanceTimersByTime(199);
            expect(timeout).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1);
            expect(timeout).toHaveBeenCalledTimes(1);
        });
    });
});
