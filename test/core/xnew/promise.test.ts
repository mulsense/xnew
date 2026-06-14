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

    describe('unit.promise.then — staging', () => {
        it('folds an xnew.promise registered inside the callback into the .then completion', async () => {
            // unit.promise.then の callback 内で xnew.promise を登録すると、その解決まで
            // .then の完了が待たれる（cb の return ではなく内部登録の解決が完了を意味する）。
            const onDone = jest.fn();
            let release!: () => void;
            const unit = xnew((u) => {
                xnew.promise(Promise.resolve(1));
                u.promise.then(() => {
                    const { resolve } = xnew.promise();
                    release = () => resolve();
                });
            });
            // 外から完了を観測（このスナップショットに「.then の完了」が同期登録されている前提）。
            unit.promise.then(onDone);

            await jest.advanceTimersByTimeAsync(0);
            expect(onDone).not.toHaveBeenCalled(); // 内部 xnew.promise が未解決 → 完了しない

            release();
            await jest.advanceTimersByTimeAsync(0);
            expect(onDone).toHaveBeenCalledTimes(1);
        });

        it('serializes: a later unit.promise.then waits for an earlier one to settle', async () => {
            const order: string[] = [];
            let releaseFirst!: () => void;
            xnew((u) => {
                u.promise.then(() => {
                    const { resolve } = xnew.promise();
                    releaseFirst = () => { order.push('first'); resolve(); };
                });
                u.promise.then(() => { order.push('second'); });
            });

            await jest.advanceTimersByTimeAsync(0);
            expect(order).toEqual([]); // first がまだ解決していない → second も走らない

            releaseFirst();
            await jest.advanceTimersByTimeAsync(0);
            expect(order).toEqual(['first', 'second']);
        });

        it('completes when the callback returns if it registers no inner promise', async () => {
            const onDone = jest.fn();
            const unit = xnew((u) => {
                xnew.promise(Promise.resolve(1));
                u.promise.then(() => { /* 内部登録なし → cb 終了が完了 */ });
            });
            unit.promise.then(onDone);

            await jest.advanceTimersByTimeAsync(0);
            expect(onDone).toHaveBeenCalledTimes(1);
        });

        it('a parent waiting on the child (xnew.promise(child)) waits for a deferred staged inside the child', async () => {
            // tohoku_shot のパターン: 子の unit.promise.then 内で立てた deferred を、親が xnew.promise(child)
            // 経由で待つ。staged 完了が子の _.promises に同期登録されるため、親のスナップショットに含まれる。
            const parentDone = jest.fn();
            let release!: () => void;
            function Child(u: Unit) {
                xnew.promise(Promise.resolve(1)); // load
                u.promise.then(() => {            // stage: bake
                    const { resolve } = xnew.promise();
                    release = () => resolve();
                });
            }
            xnew((p) => {
                xnew.promise(xnew(Child)); // 親は子 unit の完了を待つ
                p.promise.then(parentDone);
            });

            await jest.advanceTimersByTimeAsync(0);
            expect(parentDone).not.toHaveBeenCalled(); // 子の bake 未完 → 親も未完

            release();
            await jest.advanceTimersByTimeAsync(0);
            expect(parentDone).toHaveBeenCalledTimes(1);
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
