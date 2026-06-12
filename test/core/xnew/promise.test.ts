import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

describe('xnew promise helpers', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        Unit.reset();
    });
    afterEach(() => {
        Unit.engineRoot?.finalize();
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

            // then receives an object of keyed results; nothing keyed here, so it is empty
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

    describe('xnew.promise (deferred mode)', () => {
        it('returns a settle handle and resolves via resolve()', async () => {
            const done = jest.fn();
            let defer!: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            xnew(() => {
                defer = xnew.promise();
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
            let defer!: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            xnew(() => {
                defer = xnew.promise();
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

        it('passes a keyed deferred value to then under its key', async () => {
            const done = jest.fn();
            let defer!: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            xnew(() => {
                defer = xnew.promise('ready');
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);
            expect(done).not.toHaveBeenCalled();

            defer.resolve(42);
            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ ready: 42 });
        });

        it('excludes a keyless deferred value from the results object', async () => {
            const done = jest.fn();
            let defer!: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            xnew(() => {
                defer = xnew.promise();
                xnew.then(done);
            });

            defer.resolve('ignored');
            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({});
        });

        it('rejects via reject() and triggers xnew.catch', async () => {
            const caught = jest.fn();
            let defer!: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            xnew(() => {
                defer = xnew.promise();
                xnew.catch(caught);
            });

            defer.reject('boom');
            await jest.advanceTimersByTimeAsync(0);

            expect(caught).toHaveBeenCalledTimes(1);
            expect(caught).toHaveBeenCalledWith('boom');
        });

        it('throws when called with two arguments but the promise is undefined (runtime misuse)', () => {
            // The overloads reject this at compile time; cast to exercise the runtime guard
            // for dynamic callers whose promise variable is undefined at runtime.
            expect(() => {
                xnew(() => {
                    (xnew.promise as (key: string, promise: unknown) => unknown)('key', undefined);
                });
            }).toThrow();
        });
    });

    describe('keyed xnew.promise', () => {
        it('passes keyed promise values to then under their key', async () => {
            const done = jest.fn();
            xnew(() => {
                xnew.promise('a', Promise.resolve(1));
                xnew.promise('b', Promise.resolve(2));
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ a: 1, b: 2 });
        });

        it('excludes keyless promises from the results object', async () => {
            const done = jest.fn();
            xnew(() => {
                xnew.promise('a', Promise.resolve(1));
                xnew.promise(Promise.resolve('ignored'));
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ a: 1 });
        });

        it('binds the key to the final value of a then-chain', async () => {
            const done = jest.fn();
            xnew(() => {
                xnew.promise('a', Promise.resolve(1)).then((v: number) => v + 10).then((v: number) => v * 2);
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ a: 22 });
        });

        it('lets a later duplicate key win', async () => {
            const done = jest.fn();
            xnew(() => {
                xnew.promise('a', Promise.resolve('first'));
                xnew.promise('a', Promise.resolve('second'));
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ a: 'second' });
        });

        it('collects a child unit keyed results when registered with a key', async () => {
            const done = jest.fn();
            xnew(() => {
                const child = xnew(() => {
                    xnew.promise('x', Promise.resolve(7));
                });
                xnew.promise('child', child);
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ child: { x: 7 } });
        });

        it('does not run the then callback when a keyed promise rejects', async () => {
            const done = jest.fn();
            xnew(() => {
                xnew.promise('a', Promise.reject('boom'));
                // attach catch handlers so the rejection never surfaces as unhandled
                xnew.then(done).catch(() => {});
                xnew.catch(() => {});
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).not.toHaveBeenCalled();
        });
    });
});
