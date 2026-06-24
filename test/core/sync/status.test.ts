import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/index';
import { ioMock, bootServer, bootClient, asServer } from './io-mock';

//----------------------------------------------------------------------------------------------------
// ルームステータス（xnew.sync.status / sync.statusupdate）
//   - server: メンバ接続/切断で台帳(clients)が更新され、サブツリーへ sync.statusupdate が配られる。
//             sync.status は { clients: [{id,name}] }。
//   - client: server からの status 配信を取り込み、sync.statusupdate を配る。sync.status は { id, clients, room }。
//----------------------------------------------------------------------------------------------------

describe('room status (sync.status / sync.statusupdate)', () => {
    let hub: ReturnType<typeof ioMock>;
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); hub = ioMock(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    it('server status.clients tracks members; sync.statusupdate fires on connect/disconnect', () => {
        const snapshots: string[][] = [];
        bootServer({ io: hub.io, room: { id: undefined, name: undefined } }, function Server(unit: Unit) {
            xnew.sync.server(() => { unit.on('sync.statusupdate', () => snapshots.push(xnew.sync.status.clients.map((c) => c.id))); });
        });
        // connect/disconnect が server の sync.statusupdate を発火し sync.status を読むので server 環境で囲む。
        asServer(() => {
            const a = hub.connect('a');
            hub.connect('b');
            a.disconnect();
        });
        expect(snapshots).toEqual([['a'], ['a', 'b'], ['b']]);
    });

    it('client receives status (id / clients / room) via broadcast', () => {
        bootServer({ io: hub.io, room: { id: undefined, name: undefined } }, function Server() {});
        let status: any;
        bootClient({ socket: hub.connect('c1') }, function Client(unit: Unit) {
            xnew.sync.client(() => { unit.on('sync.statusupdate', () => { status = xnew.sync.status; }); });
        });
        hub.connect('c2');   // c2 の接続で server が status を全 client へ broadcast → 配線済みの c1 が受信
        expect(status.id).toBe('c1');                                          // 自分自身の client id
        expect(status.clients.map((c: any) => c.id).sort()).toEqual(['c1', 'c2']);
    });
});
