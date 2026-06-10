import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

describe('mode inheritance', () => {
    let transport: ReturnType<typeof xnew.sync.loopback>;
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); transport = xnew.sync.loopback(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    it('a booted top-level unit adopts the given mode', () => {
        const unit = xnew.sync.boot(transport.server, (u: Unit) => {});
        expect(unit._.mode).toBe('server');
    });

    it('a nested unit inherits its parent mode', () => {
        let child!: Unit;
        xnew.sync.boot(transport.server, (u: Unit) => {
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
    let transport: ReturnType<typeof xnew.sync.loopback>;
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); transport = xnew.sync.loopback(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    it('creates the unit with the given mode and returns it', () => {
        const unit = xnew.sync.boot(transport.server, (u: Unit) => {});
        expect(unit._.mode).toBe('server');
    });

    it('forwards extra args to the unit (target, Component)', () => {
        const el = document.createElement('div');
        const unit = xnew.sync.boot(transport.connect(), el, (u: Unit) => {});
        expect(unit._.mode).toBe('client');
        expect(unit.element).toBe(el);
    });

    it('propagates a throw from the component', () => {
        expect(() => xnew.sync.boot(transport.server, () => { throw new Error('boom'); })).toThrow('boom');
    });

    it('does not leak mode into a later plain xnew root', () => {
        xnew.sync.boot(transport.connect(), (u: Unit) => {});
        const plain = xnew((u: Unit) => {});
        expect(plain._.mode).toBeNull();   // mode は options で渡るだけ。グローバルに残らない
    });
});
