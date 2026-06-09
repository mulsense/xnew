import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

// 2 階層: Mover が server ブロック内で定期的に Enemy(synced 子) を spawn し、
// 各 Enemy は所定方向へ移動して一定時間で消える。ブラウザ例 (index.js) と同じ構造の検証。

function Enemy(unit: Unit, props: any = {}) {
    const state = xnew.sync.state({ x: props.x ?? 0 });
    xnew.server(() => {
        unit.on('update', () => { state.x += 1; });          // 所定方向へ移動
        xnew.timeout(() => unit.finalize(), 1000);           // 一定時間で消滅
    });
    xnew.client(() => {
        const el = xnew.nest('<div>');
        unit.on('render', () => { (el as HTMLElement).style.left = `${state.x}px`; });
    });
}

function Mover(unit: Unit) {
    xnew.sync.register({ Enemy });
    const state = xnew.sync.state({ spawned: 0 });
    xnew.server(() => {
        xnew.interval(() => { state.spawned += 1; xnew(Enemy, { x: 0 }); }, 500); // 定期 spawn
    });
    xnew.client(() => {
        xnew.nest('<div>');                                   // Enemy を内包するコンテナ
    });
}

describe('2-level spawn hierarchy (Mover -> Enemy)', () => {
    beforeEach(() => {
        jest.useFakeTimers({ now: 0 });
        Unit.reset();
    });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    function sync(server: Unit, client: Unit) {
        return xnew.sync.apply(client, xnew.sync.capture(server));
    }

    it('captures Enemy as a child of Mover and mirrors the 2-level tree on the replica', async () => {
        const server = xnew.sync.boot('server', function Root() { xnew.sync.register({ Mover }); xnew(Mover); });
        const client = xnew.sync.boot('client', function ClientRoot() { xnew.sync.register({ Mover }); });

        Unit.start(Unit.engineRoot);
        await jest.advanceTimersByTimeAsync(500);            // interval が 1 回発火 → Enemy spawn
        Unit.update(Unit.engineRoot);                          // server Enemy が移動

        const tree = xnew.sync.capture(server);
        const moverNode = tree.find(n => n.name === 'Mover')!;
        const enemyNode = tree.find(n => n.name === 'Enemy')!;
        expect(moverNode.parentId).toBeNull();
        expect(enemyNode).toBeDefined();
        expect(enemyNode.parentId).toBe(moverNode.id);       // 2 階層: Enemy の親は Mover

        sync(server, client);
        Unit.start(Unit.engineRoot);
        Unit.render(Unit.engineRoot);

        const replicaMover = client._.children[0];
        expect(replicaMover._.sync.syncId).toBe(moverNode.id);
        const replicaEnemy = replicaMover._.children.find(c => c._.sync.syncId === enemyNode.id)!;
        expect(replicaEnemy).toBeDefined();                  // replica 側も Mover -> Enemy の 2 階層
        expect(replicaEnemy._.sync.state!.x).toBe(enemyNode.state.x);
    });

    it('despawns Enemy after its lifetime and removes that replica', async () => {
        const server = xnew.sync.boot('server', function Root() { xnew.sync.register({ Mover }); xnew(Mover); });
        const client = xnew.sync.boot('client', function ClientRoot() { xnew.sync.register({ Mover }); });

        Unit.start(Unit.engineRoot);
        await jest.advanceTimersByTimeAsync(500);            // 最初の Enemy が spawn
        sync(server, client);
        const replicaMover = client._.children[0];
        expect(replicaMover._.children.length).toBe(1);
        const firstEnemy = replicaMover._.children[0];
        const firstId = firstEnemy._.sync.syncId;

        await jest.advanceTimersByTimeAsync(1000);           // 最初の Enemy の寿命経過 → server 側 finalize
        sync(server, client);
        // 最初の Enemy は replica からも消える（interval で別の Enemy は spawn され続ける）
        expect(firstEnemy._.status).toBe('finalized');
        expect(replicaMover._.children.some(c => c._.sync.syncId === firstId)).toBe(false);
    });
});
