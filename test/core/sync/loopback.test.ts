import { Unit } from '../../../src/core/unit';
import { syncOf } from '../../../src/core/sync';
import { xnew } from '../../../src/core/xnew';
import xsocket from '../../../src/addons/xsocket';

// 1 関数コンポーネント: server ブロック(update)と client ブロック(描画) を持つ
function Mover(unit: Unit) {
    const state = xnew.sync.state({ position: 0 });
    xnew.server(() => {
        unit.on('update', () => { state.position += 1; });   // server のみ
    });
    xnew.client(() => {
        const el = xnew.nest('<div>');
        unit.on('render', () => { (el as HTMLElement).style.left = `${state.position}px`; }); // client のみ
    });
}

describe('loopback simulation (server/client blocks)', () => {
    let transport: ReturnType<typeof xsocket.loopback>;
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); transport = xsocket.loopback(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    it('mirrors server state into the client subtree and renders it', () => {
        const server = xnew.sync.boot(transport.server, function Server() { xnew.sync.register({ Mover }); xnew(Mover); });
        const client = xnew.sync.boot(transport.connect(), function ClientRoot() { xnew.sync.register({ Mover }); });

        function cycle() {
            Unit.start(Unit.engineRoot);
            Unit.update(Unit.engineRoot);                              // server Mover: position += 1
            xnew.sync.apply(client, xnew.sync.capture(server));    // sync
            Unit.start(Unit.engineRoot);                               // start newly-created replica units
            Unit.render(Unit.engineRoot);                             // replica render
        }

        cycle();
        const replicaMover = client._.children[0];
        expect(syncOf(replicaMover).state!.position).toBe(1);
        expect((replicaMover.element as HTMLElement).style.left).toBe('1px');   // client block render consumed synced state

        cycle();
        expect(syncOf(replicaMover).state!.position).toBe(2);
        expect((replicaMover.element as HTMLElement).style.left).toBe('2px');
        expect(client._.children.length).toBe(1);
    });

    it('routes a single shared Main root to server/client by mode and mounts replicas into the nested element', () => {
        const view = document.createElement('div');   // 既存の描画先（例の #view 相当）

        // server/client 共通の非同期ルート。中で xnew.server / xnew.client に分岐する。
        function Main() {
            xnew.sync.register({ Mover });               // server/client 共通: Mover を直接の同期子として宣言
            xnew.server(() => { xnew(Mover); });        // server: ロジックツリー
            xnew.client(() => { xnew.nest(view); });    // client: 既存要素を描画先にする
        }

        const server = xnew.sync.boot(transport.server, Main);
        const client = xnew.sync.boot(transport.connect(), Main);

        // 非同期の Main を挟んでもトポロジは不変: Mover の parentId は null のまま。
        const tree = xnew.sync.capture(server);
        expect(tree.length).toBe(1);
        expect(tree[0].name).toBe('Mover');
        expect(tree[0].parentId).toBeNull();
        expect(server._.children[0]._.mode).toBe('server');   // Main の server ブロックが生成した Mover

        function cycle() {
            Unit.start(Unit.engineRoot);
            Unit.update(Unit.engineRoot);
            xnew.sync.apply(client, xnew.sync.capture(server));
            Unit.start(Unit.engineRoot);
            Unit.render(Unit.engineRoot);
        }
        cycle();

        // client Main の下に replica Mover が生成され、nest した既存 view 要素の配下に mount される。
        const replicaMover = client._.children[0];
        expect(replicaMover).toBeDefined();
        expect(replicaMover._.mode).toBe('client');
        expect(syncOf(replicaMover).state!.position).toBe(1);
        expect(view.contains(replicaMover.element as Node)).toBe(true);
        expect((replicaMover.element as HTMLElement).style.left).toBe('1px');
    });

    it('mirrors spawn and despawn driven from server update', () => {
        function Server(unit: Unit) {
            xnew.sync.register({ Mover });
            let spawned = false; let child: Unit | null = null;
            xnew.server(() => {
                unit.on('update', () => {
                    if (!spawned) { child = xnew(Mover) as unknown as Unit; spawned = true; }
                    else if (child) { child.finalize(); child = null; }
                });
            });
        }
        const server = xnew.sync.boot(transport.server, Server);
        const client = xnew.sync.boot(transport.connect(), function ClientRoot() { xnew.sync.register({ Mover }); });

        const sync = () => xnew.sync.apply(client, xnew.sync.capture(server));
        Unit.start(Unit.engineRoot);
        Unit.update(Unit.engineRoot); sync();
        expect(client._.children.length).toBe(1);    // spawn mirrored
        Unit.update(Unit.engineRoot); sync();
        expect(client._.children.length).toBe(0);     // despawn mirrored
    });
});
