import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

describe('xnew promise helpers', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        Unit.reset();
    });
    afterEach(() => {
        Unit.rootUnit?.finalize();
        jest.useRealTimers();
    });

    describe('xnew.then', () => {
        it('runs once after all registered promises resolve', async () => {
            const done = jest.fn();
            xnew(() => {
                xnew.promise(Promise.resolve(1));
                xnew.promise(Promise.resolve(2));
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledTimes(1);
        });

        it('does not run until the slowest registered promise resolves', async () => {
            const done = jest.fn();
            xnew(() => {
                xnew.promise(Promise.resolve('fast'));
                xnew.promise(new Promise((resolve) => setTimeout(() => resolve('slow'), 100)));
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);
            expect(done).not.toHaveBeenCalled();

            await jest.advanceTimersByTimeAsync(100);
            expect(done).toHaveBeenCalledTimes(1);
        });

        it('passes the unit results object to the callback', async () => {
            const done = jest.fn();
            xnew(() => {
                xnew.promise(Promise.resolve(1));
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            // then receives the current unit's results object (empty here, nothing collected)
            expect(done).toHaveBeenCalledTimes(1);
            expect(done).toHaveBeenCalledWith({});
        });
    });

    describe('xnew.catch', () => {
        it('runs with the rejection reason when a registered promise rejects', async () => {
            const caught = jest.fn();
            xnew(() => {
                xnew.promise(Promise.resolve('ok'));
                xnew.promise(Promise.reject('boom'));
                xnew.catch(caught);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(caught).toHaveBeenCalledTimes(1);
            expect(caught).toHaveBeenCalledWith('boom');
        });

        it('does not run when every registered promise resolves', async () => {
            const caught = jest.fn();
            xnew(() => {
                xnew.promise(Promise.resolve(1));
                xnew.promise(Promise.resolve(2));
                xnew.catch(caught);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(caught).not.toHaveBeenCalled();
        });
    });

    describe('xnew.finally', () => {
        it('runs after all registered promises resolve', async () => {
            const onFinally = jest.fn();
            xnew(() => {
                xnew.promise(Promise.resolve(1));
                xnew.promise(Promise.resolve(2));
                xnew.finally(onFinally);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(onFinally).toHaveBeenCalledTimes(1);
        });

        it('runs after a registered promise rejects', async () => {
            const onFinally = jest.fn();
            xnew(() => {
                xnew.promise(Promise.reject('boom'));
                // attach a catch so the rejection is handled and never surfaces as unhandled
                xnew.finally(onFinally).catch(() => {});
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(onFinally).toHaveBeenCalledTimes(1);
        });
    });

    describe('xnew.defer', () => {
        it('settles the registered promise via resolve()', async () => {
            const done = jest.fn();
            let defer!: { resolve: () => void; reject: () => void };
            xnew(() => {
                defer = xnew.defer();
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);
            expect(done).not.toHaveBeenCalled();

            defer.resolve();
            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledTimes(1);
        });

        it('ignores subsequent settle calls (idempotent)', async () => {
            const done = jest.fn();
            const caught = jest.fn();
            let defer!: { resolve: () => void; reject: () => void };
            xnew(() => {
                defer = xnew.defer();
                xnew.then(done);
                xnew.catch(caught);
            });

            defer.resolve();
            // a later reject after the first settle must be a no-op
            defer.reject();
            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledTimes(1);
            expect(caught).not.toHaveBeenCalled();
        });
    });

    describe('xnew.collect', () => {
        it('merges its output into the results passed to then', async () => {
            const done = jest.fn();
            xnew(() => {
                xnew.collect({ data: 123 });
                xnew.promise(Promise.resolve('ignored value'));
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledTimes(1);
            expect(done).toHaveBeenCalledWith({ data: 123 });
        });

        it('accumulates multiple collect calls', async () => {
            const done = jest.fn();
            xnew(() => {
                xnew.collect({ a: 1 });
                xnew.collect({ b: 2 });
                xnew.promise(Promise.resolve(0));
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ a: 1, b: 2 });
        });
    });
});
