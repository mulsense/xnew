import { Unit } from '../../../src/core/unit';
import xnew from '../../../src/index';
import { ioMock, bootServer, bootClient } from './io-mock';

describe('xnew.sync.client / clients (presence)', () => {
    let hub: ReturnType<typeof ioMock>;
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); hub = ioMock(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    it('exposes own id and name via xnew.sync.client', () => {
        bootServer({ socket: hub.io }, function Server() {});
        let me: any;
        bootClient({ socket: hub.connect(), name: 'Alice' }, function C(unit: Unit) {
            xnew.client(() => { me = xnew.sync.client; });
        });
        expect(me).toEqual({ id: 'c1', name: 'Alice' });
    });

    it('shares the roster across all clients and the server', () => {
        let serverRoster: any[] = [];
        bootServer({ socket: hub.io }, function Server(unit: Unit) {
            xnew.server(() => { unit.on('update', () => { serverRoster = [...xnew.sync.clients]; }); });
        });
        let aRoster: any[] = [];
        let bRoster: any[] = [];
        bootClient({ socket: hub.connect(), name: 'Alice' }, function A(unit: Unit) {
            xnew.client(() => { unit.on('update', () => { aRoster = [...xnew.sync.clients]; }); });
        });
        bootClient({ socket: hub.connect(), name: 'Bob' }, function B(unit: Unit) {
            xnew.client(() => { unit.on('update', () => { bRoster = [...xnew.sync.clients]; }); });
        });
        Unit.start(Unit.engineRoot);
        Unit.update(Unit.engineRoot);
        const names = (r: any[]) => r.map((c) => c.name).sort();
        expect(names(aRoster)).toEqual(['Alice', 'Bob']);
        expect(names(bRoster)).toEqual(['Alice', 'Bob']);
        expect(names(serverRoster)).toEqual(['Alice', 'Bob']);
    });

    it('removes a client from the roster on disconnect', () => {
        let roster: any[] = [];
        bootServer({ socket: hub.io }, function Server(unit: Unit) {
            xnew.server(() => { unit.on('update', () => { roster = [...xnew.sync.clients]; }); });
        });
        const raw = hub.connect('cX');     // raw client joins on the shared hub
        raw.emit('sync:hello', { name: 'Zoe' });
        Unit.start(Unit.engineRoot); Unit.update(Unit.engineRoot);
        expect(roster.map((c) => c.name)).toEqual(['Zoe']);
        raw.disconnect();
        Unit.start(Unit.engineRoot); Unit.update(Unit.engineRoot);
        expect(roster).toEqual([]);
    });

    it('does not deliver reserved sync: events to app units', () => {
        const seen: string[] = [];
        bootServer({ socket: hub.io }, function Server(unit: Unit) {
            xnew.server(() => { unit.on('sync:hello', () => seen.push('leaked')); });
        });
        bootClient({ socket: hub.connect(), name: 'Alice' }, function C() {});
        expect(seen).toEqual([]);
    });
});
