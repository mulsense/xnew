import { Unit } from '../../../src/core/unit';
import xnew from '../../../src/index';

describe('mode inheritance', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    it('a booted top-level unit adopts the given mode', () => {
        const unit = xnew.sync.boot({ mode: 'server' }, (u: Unit) => {});
        expect(unit._.mode).toBe('server');
    });

    it('a nested unit inherits its parent mode', () => {
        let child!: Unit;
        xnew.sync.boot({ mode: 'server' }, (u: Unit) => {
            child = xnew((c: Unit) => {}) as unknown as Unit;
        });
        expect(child._.mode).toBe('server');
    });

    it('defaults to null without a boot', () => {
        const unit = xnew((u: Unit) => {});
        expect(unit._.mode).toBeNull();
    });
});

describe('xnew.sync.boot', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    it('creates the unit with the given mode and returns it', () => {
        const unit = xnew.sync.boot({ mode: 'server' }, (u: Unit) => {});
        expect(unit._.mode).toBe('server');
    });

    it('forwards extra args to the unit (target, Component)', () => {
        const el = document.createElement('div');
        const unit = xnew.sync.boot({ mode: 'client' }, el, (u: Unit) => {});
        expect(unit._.mode).toBe('client');
        expect(unit.element).toBe(el);
    });

    it('propagates a throw from the component', () => {
        expect(() => xnew.sync.boot({ mode: 'server' }, () => { throw new Error('boom'); })).toThrow('boom');
    });

    it('does not leak mode into a later plain xnew root', () => {
        xnew.sync.boot({ mode: 'client' }, (u: Unit) => {});
        const plain = xnew((u: Unit) => {});
        expect(plain._.mode).toBeNull();   // mode は options で渡るだけ。グローバルに残らない
    });
});
