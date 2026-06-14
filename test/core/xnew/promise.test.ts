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

    describe('unit.promise.then', () => {
        it('runs once after all registered promises resolve', async () => {
            const done = jest.fn();
            xnew((unit) => {
                xnew.promise(Promise.resolve(1));
                xnew.promise(Promise.resolve(2));
                unit.promise.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledTimes(1);
        });

        it('does not run until the slowest registered promise resolves', async () => {
            const done = jest.fn();
            xnew((unit) => {
                xnew.promise(Promise.resolve('fast'));
                xnew.promise(new Promise((resolve) => setTimeout(() => resolve('slow'), 100)));
                unit.promise.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);
            expect(done).not.toHaveBeenCalled();

            await jest.advanceTimersByTimeAsync(100);
            expect(done).toHaveBeenCalledTimes(1);
        });

        it('passes the unit results object to the callback', async () => {
            const done = jest.fn();
            xnew((unit) => {
                xnew.promise(Promise.resolve(1));
                unit.promise.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            // then receives an object of keyed results; nothing keyed here, so it is empty
            expect(done).toHaveBeenCalledTimes(1);
            expect(done).toHaveBeenCalledWith({});
        });
    });

    describe('xnew.then', () => {
        it('runs the callback in unit scope after the promises registered so far resolve', async () => {
            const done = jest.fn();
            let scopedUnit: Unit | null = null;
            const unit = xnew(() => {
                xnew.promise(Promise.resolve(1));
                xnew.promise(Promise.resolve(2));
                xnew.then(() => { done(); scopedUnit = Unit.currentUnit; });
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledTimes(1);
            expect(scopedUnit).toBe(unit); // scope 内（currentUnit が自分）で走る
        });

        it('waits for the slowest of the snapshot promises', async () => {
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

        it('does NOT wait for promises registered after the call (no deadlock with a later deferred)', async () => {
            const done = jest.fn();
            let defer!: { resolve: (value?: unknown) => void };
            xnew(() => {
                xnew.promise(Promise.resolve(1));
                xnew.then(done);
                defer = xnew.promise(); // xnew.then より後に登録 → スナップショットに含まれない
            });

            await jest.advanceTimersByTimeAsync(0);

            // 後から登録した deferred が未解決でも then は走る
            expect(done).toHaveBeenCalledTimes(1);
            defer.resolve();
        });

        it('registers its result so unit.promise waits for the promise the callback returns', async () => {
            const onDone = jest.fn();
            let release!: () => void;
            const unit = xnew(() => {
                xnew.promise(Promise.resolve(1));
                // callback が返す promise（焼成完了のような非同期処理）も unit の完了に含まれる
                xnew.then(() => new Promise<void>((resolve) => { release = resolve; }));
            });
            unit.promise.then(onDone);

            await jest.advanceTimersByTimeAsync(0);
            expect(onDone).not.toHaveBeenCalled(); // 返した promise 未解決 → unit.promise も未解決

            release();
            await jest.advanceTimersByTimeAsync(0);
            expect(onDone).toHaveBeenCalledTimes(1);
        });

        it('propagates rejection of a returned native Promise to unit.promise', async () => {
            const onDone = jest.fn();
            const onErr = jest.fn();
            let fail!: (reason?: unknown) => void;
            const unit = xnew(() => {
                xnew.promise(Promise.resolve(1));
                xnew.then(() => new Promise<void>((_resolve, reject) => { fail = reject; }));
            });
            unit.promise.then(onDone).catch(onErr);

            await jest.advanceTimersByTimeAsync(0);
            fail('boom');
            await jest.advanceTimersByTimeAsync(0);

            expect(onDone).not.toHaveBeenCalled();
            expect(onErr).toHaveBeenCalledTimes(1);
        });

        it('accepts a callback returning xnew.promise (UnitPromise) and waits for its resolve', async () => {
            const onDone = jest.fn();
            let release!: () => void;
            const unit = xnew(() => {
                xnew.promise(Promise.resolve(1));
                xnew.then(() => xnew.promise((resolve: () => void) => { release = resolve; }));
            });
            unit.promise.then(onDone);

            await jest.advanceTimersByTimeAsync(0);
            expect(onDone).not.toHaveBeenCalled();

            release();
            await jest.advanceTimersByTimeAsync(0);
            expect(onDone).toHaveBeenCalledTimes(1);
        });

        it('flattens a returned UnitPromise to its resolved value for the next then (like a native Promise)', async () => {
            const got = jest.fn();
            xnew(() => {
                xnew.promise(Promise.resolve(0))
                    .then(() => xnew.promise((resolve: (v: number) => void) => resolve(42))) // return UnitPromise
                    .then((v: number) => got(v)); // 次の then は 42（UnitPromise オブジェクトではない）を受け取る
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(got).toHaveBeenCalledWith(42);
        });

        it('propagates rejection of a returned xnew.promise (UnitPromise) — no hang', async () => {
            const onDone = jest.fn();
            const onErr = jest.fn();
            let fail!: (reason?: unknown) => void;
            const unit = xnew(() => {
                xnew.promise(Promise.resolve(1));
                xnew.then(() => xnew.promise((_resolve: unknown, reject: (r?: unknown) => void) => { fail = reject; }));
            });
            unit.promise.then(onDone).catch(onErr);

            await jest.advanceTimersByTimeAsync(0);
            fail('boom');
            await jest.advanceTimersByTimeAsync(0);

            expect(onDone).not.toHaveBeenCalled();
            expect(onErr).toHaveBeenCalledTimes(1); // UnitPromise は内側 native promise に unwrap され reject 伝播
        });
    });

    describe('unit.promise.catch', () => {
        it('runs with the rejection reason when a registered promise rejects', async () => {
            const caught = jest.fn();
            xnew((unit) => {
                xnew.promise(Promise.resolve('ok'));
                xnew.promise(Promise.reject('boom'));
                unit.promise.catch(caught);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(caught).toHaveBeenCalledTimes(1);
            expect(caught).toHaveBeenCalledWith('boom');
        });

        it('does not run when every registered promise resolves', async () => {
            const caught = jest.fn();
            xnew((unit) => {
                xnew.promise(Promise.resolve(1));
                xnew.promise(Promise.resolve(2));
                unit.promise.catch(caught);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(caught).not.toHaveBeenCalled();
        });
    });

    describe('unit.promise.finally', () => {
        it('runs after all registered promises resolve', async () => {
            const onFinally = jest.fn();
            xnew((unit) => {
                xnew.promise(Promise.resolve(1));
                xnew.promise(Promise.resolve(2));
                unit.promise.finally(onFinally);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(onFinally).toHaveBeenCalledTimes(1);
        });

        it('runs after a registered promise rejects', async () => {
            const onFinally = jest.fn();
            xnew((unit) => {
                xnew.promise(Promise.reject('boom'));
                // attach a catch so the rejection is handled and never surfaces as unhandled
                unit.promise.finally(onFinally).catch(() => {});
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(onFinally).toHaveBeenCalledTimes(1);
        });
    });

    describe('xnew.promise (deferred mode)', () => {
        it('returns a settle handle and resolves via resolve()', async () => {
            const done = jest.fn();
            let defer!: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            xnew((unit) => {
                defer = xnew.promise();
                unit.promise.then(done);
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
            xnew((unit) => {
                defer = xnew.promise();
                unit.promise.then(done);
                unit.promise.catch(caught);
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
            xnew((unit) => {
                defer = xnew.promise('ready');
                unit.promise.then(done);
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
            xnew((unit) => {
                defer = xnew.promise();
                unit.promise.then(done);
            });

            defer.resolve('ignored');
            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({});
        });

        it('rejects via reject() and triggers unit.promise.catch', async () => {
            const caught = jest.fn();
            let defer!: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            xnew((unit) => {
                defer = xnew.promise();
                unit.promise.catch(caught);
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
            xnew((unit) => {
                xnew.promise('a', Promise.resolve(1));
                xnew.promise('b', Promise.resolve(2));
                unit.promise.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ a: 1, b: 2 });
        });

        it('excludes keyless promises from the results object', async () => {
            const done = jest.fn();
            xnew((unit) => {
                xnew.promise('a', Promise.resolve(1));
                xnew.promise(Promise.resolve('ignored'));
                unit.promise.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ a: 1 });
        });

        it('binds the key to the final value of a then-chain', async () => {
            const done = jest.fn();
            xnew((unit) => {
                xnew.promise('a', Promise.resolve(1)).then((v: number) => v + 10).then((v: number) => v * 2);
                unit.promise.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ a: 22 });
        });

        it('lets a later duplicate key win', async () => {
            const done = jest.fn();
            xnew((unit) => {
                xnew.promise('a', Promise.resolve('first'));
                xnew.promise('a', Promise.resolve('second'));
                unit.promise.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ a: 'second' });
        });

        it('collects a child unit keyed results when registered with a key', async () => {
            const done = jest.fn();
            xnew((unit) => {
                const child = xnew(() => {
                    xnew.promise('x', Promise.resolve(7));
                });
                xnew.promise('child', child);
                unit.promise.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ child: { x: 7 } });
        });

        it('can be awaited from outside the component via the returned unit', async () => {
            const done = jest.fn();
            const unit = xnew(() => {
                xnew.promise('x', Promise.resolve(7));
            });
            unit.promise.then(done);

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ x: 7 });
        });

        it('does not run the then callback when a keyed promise rejects', async () => {
            const done = jest.fn();
            xnew((unit) => {
                xnew.promise('a', Promise.reject('boom'));
                // attach catch handlers so the rejection never surfaces as unhandled
                unit.promise.then(done).catch(() => {});
                unit.promise.catch(() => {});
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).not.toHaveBeenCalled();
        });
    });
});
