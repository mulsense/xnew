import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

describe('mode inheritance', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); xnew.config.mode = null; });
    afterEach(() => { Unit.rootUnit?.finalize(); xnew.config.mode = null; jest.useRealTimers(); });

    it('a top-level unit adopts the current config.mode', () => {
        xnew.config.mode = 'server';
        const unit = xnew((u: Unit) => {});
        xnew.config.mode = null;
        expect(unit._.mode).toBe('server');
    });

    it('a nested unit inherits its parent mode regardless of config.mode', () => {
        let child!: Unit;
        xnew.config.mode = 'server';
        xnew((u: Unit) => {
            xnew.config.mode = 'client';   // no effect on a child whose parent mode is non-null
            child = xnew((c: Unit) => {}) as unknown as Unit;
        });
        xnew.config.mode = null;
        expect(child._.mode).toBe('server');
    });

    it('defaults to null when config.mode is null', () => {
        const unit = xnew((u: Unit) => {});
        expect(unit._.mode).toBeNull();
    });
});

describe('xnew.boot', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); xnew.config.mode = null; });
    afterEach(() => { Unit.rootUnit?.finalize(); xnew.config.mode = null; jest.useRealTimers(); });

    it('applies the mode during the callback and returns its result', () => {
        const unit = xnew.boot('server', () => xnew((u: Unit) => {}));
        expect(unit._.mode).toBe('server');
    });

    it('restores the previous config.mode after the callback', () => {
        xnew.boot('client', () => xnew((u: Unit) => {}));
        expect(xnew.config.mode).toBeNull();
    });

    it('restores the previous config.mode even when the callback throws', () => {
        expect(() => xnew.boot('server', () => { throw new Error('boom'); })).toThrow('boom');
        expect(xnew.config.mode).toBeNull();
    });

    it('restores to the outer mode when nested', () => {
        let inner!: Unit; let outer!: Unit;
        xnew.boot('server', () => {
            inner = xnew.boot('client', () => xnew((u: Unit) => {})) as unknown as Unit;
            outer = xnew((u: Unit) => {}) as unknown as Unit;   // back to 'server' after the nested boot
        });
        expect(inner._.mode).toBe('client');
        expect(outer._.mode).toBe('server');
        expect(xnew.config.mode).toBeNull();
    });
});
