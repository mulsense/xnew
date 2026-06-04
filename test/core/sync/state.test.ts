import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

describe('xnew.sync.state', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); xnew.config.mode = null; });
    afterEach(() => { Unit.rootUnit?.finalize(); xnew.config.mode = null; jest.useRealTimers(); });

    it('registers syncState on the current unit and returns the same reference', () => {
        let state!: Record<string, any>;
        const unit = xnew((u: Unit) => { state = xnew.sync.state({ position: 0 }); });
        expect(unit._.syncState).toBe(state);
        expect(state.position).toBe(0);
    });

    it('merges on repeated calls, keeping the same reference', () => {
        let s1!: Record<string, any>; let s2!: Record<string, any>;
        xnew((u: Unit) => { s1 = xnew.sync.state({ a: 1 }); s2 = xnew.sync.state({ b: 2 }); });
        expect(s1).toBe(s2);
        expect(s1).toEqual({ a: 1, b: 2 });
    });
});
