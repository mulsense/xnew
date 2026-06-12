import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';
import { loopbackHub } from '../../../src/core/sync';

describe('xnew.sync.boot({ mode }) — loopback (no socket)', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    it('boots server + client on a shared in-memory hub and auto-numbers clientId', () => {
        xnew.sync.boot({ mode: 'server' }, function Server() {});
        let id1: string | undefined;
        let id2: string | undefined;
        xnew.sync.boot({ mode: 'client' }, function C1() { xnew.client(() => { id1 = xnew.sync.clientId; }); });
        xnew.sync.boot({ mode: 'client' }, function C2() { xnew.client(() => { id2 = xnew.sync.clientId; }); });
        expect(id1).toBe('c1');
        expect(id2).toBe('c2');
    });

    it('delivers connect to the boot-parent unit.on with the clientId', () => {
        const seen: string[] = [];
        xnew(function Host(unit: Unit) {
            xnew.sync.boot({ mode: 'server' }, function Server() {});
            unit.on('connect', ({ id }: any) => seen.push(id));
        });
        loopbackHub().connect('cX');   // a fresh client connects on the same shared hub
        expect(seen).toEqual(['cX']);
    });

    it('mode selects the root engine mode', () => {
        const s = xnew.sync.boot({ mode: 'server' }, function S() {});
        const c = xnew.sync.boot({ mode: 'client' }, function C() {});
        expect(s._.mode).toBe('server');
        expect(c._.mode).toBe('client');
    });
});
