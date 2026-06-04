import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

describe('mode inheritance', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); Unit.config.mode = null; });
    afterEach(() => { Unit.rootUnit?.finalize(); Unit.config.mode = null; jest.useRealTimers(); });

    it('a top-level unit adopts the current config.mode', () => {
        Unit.config.mode = 'server';
        const unit = xnew((u: Unit) => {});
        Unit.config.mode = null;
        expect(unit._.mode).toBe('server');
    });

    it('a nested unit inherits its parent mode regardless of config.mode', () => {
        let child!: Unit;
        Unit.config.mode = 'server';
        xnew((u: Unit) => {
            Unit.config.mode = 'client';   // no effect on a child whose parent mode is non-null
            child = xnew((c: Unit) => {}) as unknown as Unit;
        });
        Unit.config.mode = null;
        expect(child._.mode).toBe('server');
    });

    it('defaults to null when config.mode is null', () => {
        const unit = xnew((u: Unit) => {});
        expect(unit._.mode).toBeNull();
    });
});

describe('xnew.boot', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); Unit.config.mode = null; });
    afterEach(() => { Unit.rootUnit?.finalize(); Unit.config.mode = null; jest.useRealTimers(); });

    it('creates the unit with the given mode and returns it', () => {
        const unit = xnew.boot('server', (u: Unit) => {});
        expect(unit._.mode).toBe('server');
    });

    it('forwards extra args to xnew (target, Component)', () => {
        const el = document.createElement('div');
        const unit = xnew.boot('client', el, (u: Unit) => {});
        expect(unit._.mode).toBe('client');
        expect(unit.element).toBe(el);
    });

    it('restores the previous mode after creation', () => {
        xnew.boot('client', (u: Unit) => {});
        expect(Unit.config.mode).toBeNull();
    });

    it('restores the previous mode even when the component throws', () => {
        expect(() => xnew.boot('server', () => { throw new Error('boom'); })).toThrow('boom');
        expect(Unit.config.mode).toBeNull();
    });

    it('restores to the previous mode, not hardcoded null', () => {
        Unit.config.mode = 'server';                       // 既に server コンテキスト下にいる想定
        const unit = xnew.boot('client', (u: Unit) => {});
        expect(unit._.mode).toBe('client');
        expect(Unit.config.mode).toBe('server');           // null 決め打ちでなく前の値へ復元
        Unit.config.mode = null;
    });
});
