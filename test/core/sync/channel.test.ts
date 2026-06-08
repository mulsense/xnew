import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

//----------------------------------------------------------------------------------------------------
// イベントチャンネル（socket.io 互換 transport: loopback / bind / emit / on）
//   - client.emit('move', payload) → server.on('move', (clientId, payload)) へ clientId 付きで届く
//   - bind でルートに socket をバインドし、コンポーネント / handler 内から emit/on を使う
//   - 1 イベントに複数ハンドラ登録可。受信時に closure の state を直接更新する（ポーリング無し）
//----------------------------------------------------------------------------------------------------

describe('event channel (socket.io-compatible transport)', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); Unit.config.mode = null; Unit.config.transport = null; });
    afterEach(() => { Unit.rootUnit?.finalize(); Unit.config.mode = null; Unit.config.transport = null; jest.useRealTimers(); });

    it('loopback routes client.emit to server.on tagged with clientId', () => {
        const hub = xnew.sync.loopback();
        const received: Array<[string, any]> = [];
        hub.server.on('move', (clientId, payload) => { received.push([clientId, payload]); });

        const c1 = hub.connect('c1');
        const c2 = hub.connect('c2');
        c1.emit('move', { dx: 1 });
        c2.emit('move', { dx: -1 });

        expect(received).toEqual([['c1', { dx: 1 }], ['c2', { dx: -1 }]]);
    });

    it('loopback delivers server broadcast and per-client push to client.on', () => {
        const hub = xnew.sync.loopback();
        const c1seen: any[] = [];
        const c2seen: any[] = [];
        const c1 = hub.connect('c1');
        const c2 = hub.connect('c2');
        c1.on('state', (p) => c1seen.push(p));
        c2.on('state', (p) => c2seen.push(p));

        hub.server.emit('state', { tick: 1 });          // broadcast
        hub.server.to('c2').emit('state', { tick: 2 }); // only c2

        expect(c1seen).toEqual([{ tick: 1 }]);
        expect(c2seen).toEqual([{ tick: 1 }, { tick: 2 }]);
    });

    it('server fires connect/disconnect handlers', () => {
        const hub = xnew.sync.loopback();
        const log: string[] = [];
        hub.server.on('connect', (clientId) => log.push(`+${clientId}`));
        hub.server.on('disconnect', (clientId) => log.push(`-${clientId}`));

        const c1 = hub.connect('c1');
        c1.disconnect();

        expect(log).toEqual(['+c1', '-c1']);
    });

    it('supports multiple handlers per event (socket.io EventEmitter style)', () => {
        const hub = xnew.sync.loopback();
        const seenA: string[] = [];
        const seenB: string[] = [];
        hub.server.on('move', (clientId) => seenA.push(clientId));
        hub.server.on('move', (clientId) => seenB.push(clientId));   // 2 つ目も発火する

        hub.connect('c1').emit('move', {});
        expect(seenA).toEqual(['c1']);
        expect(seenB).toEqual(['c1']);
    });

    it('use(): boot auto-binds the socket and auto-generates clientId', () => {
        xnew.sync.use(xnew.sync.loopback());   // 以後の boot が socket を自動バインド

        const received: Array<[string, any]> = [];
        const server = xnew.sync.boot('server', function Server(unit: Unit) {
            xnew.server(() => { unit.on('move', ({ id, x }: any) => received.push([id, { x }])); });
        });

        let id1: string | undefined;
        let id2: string | undefined;
        xnew.sync.boot('client', function Client(unit: Unit) {
            xnew.client(() => { id1 = xnew.sync.clientId; unit.on('update', () => xnew.sync.emit('move', { x: 1 })); });
        });
        xnew.sync.boot('client', function Client(unit: Unit) {
            xnew.client(() => { id2 = xnew.sync.clientId; });
        });

        expect(id1).toBe('c1');   // 自動発番（手動 clientId 不要）
        expect(id2).toBe('c2');

        Unit.start(Unit.rootUnit);
        Unit.update(Unit.rootUnit);   // c1 の client が emit（手動 bind 無しで届く）

        expect(received).toEqual([['c1', { x: 1 }]]);
        expect(server).toBeDefined();
    });

    it('use(): boot binds the transport even on the very first call (engine root not yet created)', () => {
        // 回帰: 初回 xnew で reset が走るとエンジンルートが socketSlot を消費してしまう問題（node 起動時に発覚）。
        // boot がルートを先に用意することで、boot ルートが socket を受け取れる。
        (Unit as any).rootUnit = undefined;   // 「まだ何も生成されていない」状態を再現
        xnew.sync.use(xnew.sync.loopback());
        let id: string | undefined;
        xnew.sync.boot('client', function Client() {
            xnew.client(() => { id = xnew.sync.clientId; });
        });
        expect(id).toBe('c1');   // socket がバインドされ clientId が解決できる（throw しない）
    });

    it('updates state directly on message receipt (no polling) via closure', () => {
        const hub = xnew.sync.loopback();
        xnew.sync.use(hub);
        let state: Record<string, any> = {};
        xnew.sync.boot('server', function Server(unit: Unit) {
            xnew.server(() => {
                state = xnew.sync.state({ x: 0 });
                // 受信時に closure の state を直接更新（inbox 不要）。unit 生成等はしない。
                unit.on('move', ({ dx }: any) => { state.x += dx; });
            });
        });

        const socket = hub.connect();
        // 生 socket から送るときも xnew.sync.emit と同じ封筒 { syncId, data } で送る。
        socket.emit('move', { data: { dx: 5 } });
        socket.emit('move', { data: { dx: 2 } });
        expect(state.x).toBe(7);
    });

    it('full loopback: Player updates its own state on move receipt; World spawns from presence', () => {
        // Player: 自分宛の 'move' を受けたら（tick を待たず）closure の state を直接更新。
        function Player(unit: Unit, props: { clientId?: string } = {}) {
            const state = xnew.sync.state({ x: 0, y: 0, clientId: props.clientId ?? '' });
            xnew.server(() => {
                unit.on('move', ({ id, dx, dy }: any) => {
                    if (id !== state.clientId) { return; }     // 自分宛だけ（無印=全体なので id で絞る）
                    state.x += dx ?? 0;
                    state.y += dy ?? 0;
                });
            });
            xnew.client(() => { xnew.nest('<div>'); });
        }
        // World: 接続集合(presence)を on('connect'/'disconnect') で持ち、spawn/despawn は update(tick内)で行う。
        function World(unit: Unit, props: { view?: HTMLElement } = {}) {
            xnew.sync.register({ Player });
            // socket は use(hub) により boot が自動バインドする。
            xnew.server(() => {
                const connected = new Set<string>();
                const players = new Map<string, Unit>();
                unit.on('connect', ({ id }: any) => connected.add(id));
                unit.on('disconnect', ({ id }: any) => connected.delete(id));
                unit.on('update', () => {
                    for (const clientId of connected) {
                        if (!players.has(clientId)) { players.set(clientId, xnew(Player, { clientId }) as unknown as Unit); }
                    }
                    for (const [clientId, player] of [...players.entries()]) {
                        if (!connected.has(clientId)) { player.finalize(); players.delete(clientId); }
                    }
                });
            });
            xnew.client(() => {
                if (props.view) { xnew.nest(props.view); }
                unit.on('update', () => { xnew.sync.emit('move', { dx: 1, dy: 0 }); });
            });
        }

        const hub = xnew.sync.loopback();
        xnew.sync.use(hub);
        const view1 = document.createElement('div');
        const view2 = document.createElement('div');

        const server = xnew.sync.boot('server', World);                  // on('connect') を登録
        const client1 = xnew.sync.boot('client', World, { view: view1 }); // connect → presence に c1
        const client2 = xnew.sync.boot('client', World, { view: view2 }); // connect → presence に c2

        const sync = () => {
            const tree = xnew.sync.capture(server);
            xnew.sync.apply(client1, tree);
            xnew.sync.apply(client2, tree);
        };
        function cycle() {
            Unit.start(Unit.rootUnit);
            Unit.update(Unit.rootUnit);   // server World: presence から spawn / client: emit('move')
            sync();
            Unit.start(Unit.rootUnit);
            Unit.render(Unit.rootUnit);
        }
        cycle();   // f1: server spawn 2 Player（この frame の client emit は Player 登録前なので素通り）
        cycle();   // f2: client emit → 各 Player の on('move') が受信時に state を更新
        cycle();

        const tree = xnew.sync.capture(server);
        const players = tree.filter((n) => n.name === 'Player');
        expect(players.length).toBe(2);
        const byClient = Object.fromEntries(players.map((p) => [p.state.clientId, p.state]));
        expect(byClient.c1.x).toBeGreaterThanOrEqual(1);
        expect(byClient.c2.x).toBeGreaterThanOrEqual(1);

        // 両 replica が 2 Player を持つ（World 直下に同期生成）
        expect(client1._.children.filter((c: Unit) => c._.state).length).toBe(2);
        expect(client2._.children.filter((c: Unit) => c._.state).length).toBe(2);

        // 切断 → 次フレームで despawn（boot が自動バインドした socket は _.socket で取得できる）
        client2._.socket.disconnect();
        Unit.update(Unit.rootUnit);
        expect(xnew.sync.capture(server).filter((n) => n.name === 'Player').length).toBe(1);
    });

    it('mirror(): wires the down-channel (server broadcast / client apply) in one call', () => {
        function Mover(unit: Unit) {
            const state = xnew.sync.state({ x: 0 });
            xnew.server(() => { unit.on('update', () => { state.x += 1; }); });
        }
        function World(unit: Unit) {
            xnew.sync.register({ Mover });
            xnew.sync.mirror(unit);   // ← 下りはこの 1 行だけ（emit('sync')/on('sync') を書かない）
            xnew.server(() => { xnew(Mover); });
        }
        xnew.sync.use(xnew.sync.loopback());
        const server = xnew.sync.boot('server', World);   // mirror が update で broadcast
        const client = xnew.sync.boot('client', World);   // mirror が on('sync') で apply

        Unit.start(Unit.rootUnit);
        Unit.update(Unit.rootUnit);   // server Mover が x+=1、World(server) が 'sync' を broadcast → client が apply
        Unit.start(Unit.rootUnit);

        const replica = client._.children.find((c: Unit) => c._.state);
        expect(replica).toBeDefined();
        expect(replica!._.state!.x).toBe(xnew.sync.capture(server).find((n) => n.name === 'Mover')!.state.x);
        expect(replica!._.state!.x).toBeGreaterThanOrEqual(1);
    });

    it('socketio(): adapts a socket.io-like io to the server Transport (onAny → (clientId,payload))', () => {
        // 最小の socket.io 風モック（io.on('connection') / socket.onAny / socket.on('disconnect') / io.emit）
        let connectionCb: ((s: any) => void) | null = null;
        const io = { on: (ev: string, cb: any) => { if (ev === 'connection') { connectionCb = cb; } }, emit: () => {}, to: () => ({ emit: () => {} }) };
        const transport = xnew.sync.socketio(io);
        const received: Array<[string, any]> = [];
        transport.server.on('move', (clientId, payload) => received.push([clientId, payload]));

        // 接続をシミュレート: onAny で来たイベントが (socket.id, payload) に橋渡しされる
        const anyHandlers: Function[] = [];
        const socket = { id: 's1', onAny: (cb: any) => anyHandlers.push(cb), on: () => {} };
        connectionCb!(socket);
        anyHandlers.forEach((cb) => cb('move', { dx: 1 }));

        expect(received).toEqual([['s1', { dx: 1 }]]);
    });

    it('socketio({ room }): scopes broadcast to io.to(room) and filters connections by query.room', () => {
        // socket.io 風モック: io.to(r) は r ごとの emit を記録、connection で socket を渡す。
        const sent: Array<[string, string, any]> = [];   // [room, event, payload]
        const joined: string[] = [];
        let connectionCb: ((s: any) => void) | null = null;
        const io = {
            on: (ev: string, cb: any) => { if (ev === 'connection') { connectionCb = cb; } },
            to: (room: string) => ({ emit: (event: string, payload: any) => sent.push([room, event, payload]) }),
            emit: () => {},
        };
        const transport = xnew.sync.socketio(io, { room: 'r1' });
        const got: Array<[string, any]> = [];
        transport.server.onAny((event, clientId, payload) => got.push([clientId, payload]));

        // socket モック: onAny を保持。join を記録。
        const anyOf = new Map<string, Function>();
        const mk = (sid: string, room: string) => ({
            id: sid, handshake: { query: { room } },
            join: (r: string) => joined.push(`${sid}->${r}`),
            onAny: (cb: any) => anyOf.set(sid, cb),
            on: () => {},
        });
        connectionCb!(mk('s1', 'r1'));
        connectionCb!(mk('s2', 'r2'));   // 別ルーム → 無視される

        expect(joined).toContain('s1->r1');
        expect(joined).not.toContain('s2->r2');
        expect(anyOf.has('s2')).toBe(false);   // r2 の socket は wire されない

        anyOf.get('s1')!('move', { syncId: 1, data: { x: 1 } });
        expect(got).toEqual([['s1', { syncId: 1, data: { x: 1 } }]]);

        transport.server.emit('sync', [{ id: 1 }]);
        expect(sent).toContainEqual(['r1', 'sync', [{ id: 1 }]]);   // broadcast は io.to('r1') へ
    });

    it('unit.on sync handler runs in the registering unit scope (inner xnew(...) parents correctly)', () => {
        function Child(_: Unit) {}
        let world!: Unit;
        function World(unit: Unit) {
            world = unit;
            // ハンドラ内で生成した Child は、登録元(World)の子として作られなければならない。
            unit.on('join', ({ id }: any) => xnew(Child, { key: id, clientId: id }));
        }
        const transport = xnew.sync.loopback();
        xnew.sync.use(transport);
        xnew.sync.boot('server', World);

        // 同じ transport の client が join を送ると server の on('join') が発火する（id=clientId）。
        transport.connect('c1').emit('join');

        const child = xnew.find(Child, { key: 'c1' })[0];
        expect(child).toBeDefined();
        expect(child.parent).toBe(world);   // stale な currentUnit でなく World の子
    });

    it("'-event' routes only to the handler whose unit shares the emitter syncId (same component)", () => {
        const hub = xnew.sync.loopback();
        xnew.sync.use(hub);
        const hits: string[] = [];
        // server 側: syncId を持つ 2 ユニットが各々 on('-move') を登録。
        function Tagged(unit: Unit, props: { tag?: string; syncId?: number } = {}) {
            unit._.syncId = props.syncId ?? null;
            xnew.server(() => { unit.on('-move', ({ vector }: any) => hits.push(`${props.tag}:${vector.x}`)); });
        }
        xnew.sync.boot('server', function Server() {
            xnew.server(() => { xnew(Tagged, { tag: 'A', syncId: 10 }); xnew(Tagged, { tag: 'B', syncId: 20 }); });
        });

        // client 側: syncId=10 のユニットから '-move' を送ると、同じ syncId の A だけに届く。
        xnew.sync.boot('client', function Client(unit: Unit) {
            xnew.client(() => {
                unit._.syncId = 10;
                xnew.sync.emit('-move', { vector: { x: 1 } });
            });
        });

        expect(hits).toEqual(['A:1']);   // B(syncId=20) には届かない
    });
});
