import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

describe('xnew.chunk', () => {
    beforeEach(() => {
        jest.useFakeTimers({ now: 0 });
        Unit.reset();
    });
    afterEach(() => {
        Unit.engineRoot?.finalize();
        jest.useRealTimers();
    });

    it('runs callback exactly max times with ascending index, then resolves', async () => {
        const seen: number[] = [];
        let resolved = false;
        xnew(() => {
            xnew.chunk(({ index }) => seen.push(index), 5).then(() => { resolved = true; });
        });
        await jest.advanceTimersByTimeAsync(100);
        expect(seen).toEqual([0, 1, 2, 3, 4]);
        expect(resolved).toBe(true);
    });

    it('with budgetMs 0 advances at most one iteration per frame (spreads work)', async () => {
        const seen: number[] = [];
        xnew(() => { xnew.chunk(({ index }) => seen.push(index), 5, { budgetMs: 0 }); });
        await jest.advanceTimersByTimeAsync(40); // ~1 frame (first ticker frame only records the start time)
        const afterOneFrame = seen.length;
        expect(afterOneFrame).toBeGreaterThanOrEqual(1);
        expect(afterOneFrame).toBeLessThan(5); // not all at once
        await jest.advanceTimersByTimeAsync(300);
        expect(seen).toEqual([0, 1, 2, 3, 4]);
    });

    it('resolves without calling callback when max is 0', async () => {
        const cb = jest.fn();
        let resolved = false;
        xnew(() => { xnew.chunk(cb, 0).then(() => { resolved = true; }); });
        await jest.advanceTimersByTimeAsync(20);
        expect(cb).not.toHaveBeenCalled();
        expect(resolved).toBe(true);
    });

    it('rejects and stops when the callback throws', async () => {
        const cb = jest.fn(({ index }: { index: number }) => { if (index === 2) throw new Error('boom'); });
        let caught: unknown = null;
        xnew(() => { xnew.chunk(cb, 5).catch((e: unknown) => { caught = e; }); });
        await jest.advanceTimersByTimeAsync(50);
        expect(cb).toHaveBeenCalledTimes(3); // 0, 1, 2 (throws) then stop
        expect(caught).toBeInstanceOf(Error);
    });

    it('stops the loop when the unit is finalized mid-run', async () => {
        const cb = jest.fn();
        const unit = xnew(() => { xnew.chunk(cb, 100, { budgetMs: 0 }); });
        await jest.advanceTimersByTimeAsync(40);
        const before = cb.mock.calls.length;
        expect(before).toBeGreaterThanOrEqual(1);
        unit.finalize();
        await jest.advanceTimersByTimeAsync(300);
        expect(cb.mock.calls.length).toBe(before);
    });

    it('runs .then callback in the caller unit scope', async () => {
        let scopedUnit: Unit | null = null;
        let target!: Unit;
        xnew((unit: Unit) => {
            target = unit;
            xnew.chunk(() => {}, 1).then(() => { scopedUnit = Unit.currentUnit; });
        });
        await jest.advanceTimersByTimeAsync(50);
        expect(scopedUnit).toBe(target);
    });

    it('is not collected by xnew.promise(unit) aggregation (resolves before the chunk finishes)', async () => {
        const seen: number[] = [];
        const aggregated = jest.fn();
        let chunkResolved = false;
        const unit = xnew(() => {
            // budgetMs: 0 → 1 iteration/frame, so the chunk is still running across many frames.
            xnew.chunk(({ index }) => seen.push(index), 50, { budgetMs: 0 }).then(() => { chunkResolved = true; });
        });
        // The chunk UnitPromise is intentionally NOT pushed to the unit's aggregation pool,
        // so aggregating this unit resolves immediately with an empty results set.
        xnew.promise(unit).then(aggregated);

        await jest.advanceTimersByTimeAsync(40); // ~1 frame: chunk has only just started
        expect(seen.length).toBeLessThan(50); // chunk is still running
        expect(chunkResolved).toBe(false);
        // aggregation already resolved without waiting on / including the chunk promise
        expect(aggregated).toHaveBeenCalledTimes(1);
        expect(aggregated).toHaveBeenCalledWith({ results: [] });
    });

    it('throws synchronously on invalid max', () => {
        xnew(() => {
            expect(() => xnew.chunk(() => {}, -1)).toThrow();
            expect(() => xnew.chunk(() => {}, 1.5)).toThrow();
            expect(() => xnew.chunk(() => {}, NaN)).toThrow();
        });
    });
});
