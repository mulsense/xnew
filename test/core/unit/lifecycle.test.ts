import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

describe('Unit lifecycle', () => {
    beforeEach(() => {
        jest.useFakeTimers({ now: 0 });
        Unit.reset();
    });
    afterEach(() => {
        Unit.engineRoot?.finalize();
        jest.useRealTimers();
    });

    it('emits start when started explicitly after a stop()', async () => {
        const onStart = jest.fn();
        let target!: Unit;
        xnew((unit: Unit) => {
            target = unit;
            unit.stop();
            unit.on('start', onStart);
        });
        setTimeout(() => target.start(), 500);

        await jest.advanceTimersByTimeAsync(499);
        expect(onStart).not.toHaveBeenCalled();
        await jest.advanceTimersByTimeAsync(50);
        expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('emits stop when transitioning from started to stopped', async () => {
        const onStop = jest.fn();
        const unit = xnew((u: Unit) => u.on('stop', onStop));
        await jest.advanceTimersByTimeAsync(40);
        unit.stop();
        expect(onStop).toHaveBeenCalledTimes(1);
    });

    it('emits finalize exactly once even when finalized twice', () => {
        const onFinalize = jest.fn();
        const unit = xnew((u: Unit) => u.on('finalize', onFinalize));
        unit.finalize();
        unit.finalize();
        expect(onFinalize).toHaveBeenCalledTimes(1);
    });

    it('does not emit stop again when already stopped', async () => {
        const onStop = jest.fn();
        const unit = xnew((u: Unit) => u.on('stop', onStop));
        await jest.advanceTimersByTimeAsync(40);
        unit.stop();
        unit.stop();
        expect(onStop).toHaveBeenCalledTimes(1);
    });

    it('passes an incrementing per-unit count and numeric delta to update listeners', async () => {
        const calls: Array<{ count: number, delta: number }> = [];
        xnew((u: Unit) => u.on('update', ({ count, delta }: any) => calls.push({ count, delta })));
        await jest.advanceTimersByTimeAsync(100);
        expect(calls.length).toBeGreaterThan(1);
        calls.forEach((c, i) => {
            expect(c.count).toBe(i); // 起動後 0 始まりで 1 ずつ増える
            expect(typeof c.delta).toBe('number');
            expect(c.delta).toBeGreaterThan(0);
        });
    });

    it('passes count / delta to render listeners as well', async () => {
        const counts: number[] = [];
        let sawNumericDelta = false;
        xnew((u: Unit) => u.on('render', ({ count, delta }: any) => {
            counts.push(count);
            if (typeof delta === 'number' && delta > 0) sawNumericDelta = true;
        }));
        await jest.advanceTimersByTimeAsync(100);
        expect(counts.length).toBeGreaterThan(1);
        counts.forEach((c, i) => expect(c).toBe(i));
        expect(sawNumericDelta).toBe(true);
    });

    it('counts per unit — a later unit starts its own count at 0', async () => {
        const a: number[] = [];
        xnew((u: Unit) => u.on('update', ({ count }: any) => a.push(count)));
        await jest.advanceTimersByTimeAsync(80);
        const aBeforeB = a.at(-1)!;

        const b: number[] = [];
        xnew((u: Unit) => u.on('update', ({ count }: any) => b.push(count)));
        await jest.advanceTimersByTimeAsync(80);

        expect(b[0]).toBe(0); // B の最初の update は 0（グローバルカウンタではない）
        expect(a.at(-1)!).toBeGreaterThan(aBeforeB); // A は独立に増え続ける
    });
});
