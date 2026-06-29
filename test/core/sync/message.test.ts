import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/index';
import { ioMock, bootServer, bootClient, asServer, asClient } from './io-mock';

//----------------------------------------------------------------------------------------------------
// sync.message — 組み込みのルームメッセージ（中継コンポーネント不要）
//   - client が xnew.sync.message({…}) で送ると、server が自動中継し、ルーム内の全 unit（全 client・
//     送信者含む）が unit.on('sync.message', ({ id, ...payload })) で受信する（id = 送信者 socket id）。
//   - server 発のメッセージは id = undefined で、全 client + server 自身の unit へ届く。
//   transport は in-memory な socket.io 風モック（test/core/sync/io-mock）を使う。
//----------------------------------------------------------------------------------------------------

describe('sync.message (built-in room message)', () => {
    let hub: ReturnType<typeof ioMock>;
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); hub = ioMock(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    it("relays a client message to every client (incl. the sender) with the sender id", () => {
        const a: any[] = [];
        const b: any[] = [];

        bootServer({ io: hub.io }, function Server() { xnew.sync.server(() => {}); });

        const clientA = bootClient({ socket: hub.connect('A') }, function Client(unit: Unit) {
            xnew.sync.client(() => {
                unit.on('sync.message', ({ id, text }: any) => a.push({ id, text }));
                return { say(text: string) { xnew.sync.message({ text }); } };
            });
        });
        bootClient({ socket: hub.connect('B') }, function Client(unit: Unit) {
            xnew.sync.client(() => { unit.on('sync.message', ({ id, text }: any) => b.push({ id, text })); });
        });

        asClient(() => (clientA as any).say('hi'));

        expect(a).toEqual([{ id: 'A', text: 'hi' }]);   // 自分の発言も中継で返る
        expect(b).toEqual([{ id: 'A', text: 'hi' }]);
    });

    it('a server-origin message reaches every client and the server itself, with id undefined', () => {
        const srv: any[] = [];
        const a: any[] = [];

        const server = bootServer({ io: hub.io }, function Server(unit: Unit) {
            xnew.sync.server(() => {
                unit.on('sync.message', ({ id, text }: any) => srv.push({ id, text }));
                return { announce(text: string) { xnew.sync.message({ text }); } };
            });
        });
        bootClient({ socket: hub.connect('A') }, function Client(unit: Unit) {
            xnew.sync.client(() => { unit.on('sync.message', ({ id, text }: any) => a.push({ id, text })); });
        });

        asServer(() => (server as any).announce('hello'));

        expect(srv).toEqual([{ id: undefined, text: 'hello' }]);   // server 自身の unit も受信
        expect(a).toEqual([{ id: undefined, text: 'hello' }]);     // client も受信（server 発は id 無し）
    });

    it("delivers the whole payload (not just text) under 'sync.message'", () => {
        const got: any[] = [];

        bootServer({ io: hub.io }, function Server() { xnew.sync.server(() => {}); });
        const clientA = bootClient({ socket: hub.connect('A') }, function Client(unit: Unit) {
            xnew.sync.client(() => {
                unit.on('sync.message', (m: any) => got.push(m));
                return { say(payload: any) { xnew.sync.message(payload); } };
            });
        });

        asClient(() => (clientA as any).say({ text: 'hi', emoji: '👍' }));

        expect(got).toHaveLength(1);
        expect(got[0]).toMatchObject({ id: 'A', text: 'hi', emoji: '👍' });   // payload はそのまま届く（+ type）
    });
});
