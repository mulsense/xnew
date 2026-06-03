import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

describe('mode inheritance', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); xnew.config.mode = null; });
    afterEach(() => { Unit.rootUnit?.finalize(); xnew.config.mode = null; jest.useRealTimers(); });

    it('a top-level unit adopts the current config.mode', () => {
        xnew.config.mode = 'authoritative';
        const unit = xnew((u: Unit) => {});
        xnew.config.mode = null;
        expect(unit._.mode).toBe('authoritative');
    });

    it('a nested unit inherits its parent mode regardless of config.mode', () => {
        let child!: Unit;
        xnew.config.mode = 'authoritative';
        xnew((u: Unit) => {
            xnew.config.mode = 'replica';   // no effect on a child whose parent mode is non-null
            child = xnew((c: Unit) => {}) as unknown as Unit;
        });
        xnew.config.mode = null;
        expect(child._.mode).toBe('authoritative');
    });

    it('defaults to null when config.mode is null', () => {
        const unit = xnew((u: Unit) => {});
        expect(unit._.mode).toBeNull();
    });
});
