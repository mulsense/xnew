import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';
import { resetRegistry } from '../../../src/core/sync';

// Base: synced state を宣言する基底コンポーネント（最初の sync.state 宣言）
function Base(unit: Unit) {
    const state = xnew.sync.state({ hp: 100 });
    xnew.server(() => { unit.on('update', () => { state.hp += 1; }); });
}

// Enemy: Base を extend した上で自分の synced state も宣言する（2番目の sync.state 宣言）
let clientReadAtConstruction: Record<string, any> = {};
function Enemy(unit: Unit) {
    xnew.extend(Base);
    const state = xnew.sync.state({ x: 0 });
    xnew.server(() => { unit.on('update', () => { state.x += 3; }); });
    xnew.client(() => {
        // 構築時点での state を記録（注入が全宣言に効いていれば全てサーバー値になる）
        clientReadAtConstruction = { ...state };
    });
}

describe('composed synced state (base + extend)', () => {
    beforeEach(() => {
        jest.useFakeTimers({ now: 0 });
        resetRegistry(); Unit.reset(); Unit.config.mode = null;
        xnew.sync.register({ Enemy });
        clientReadAtConstruction = {};
    });
    afterEach(() => { Unit.rootUnit?.finalize(); Unit.config.mode = null; jest.useRealTimers(); });

    it('hydrates every sync.state declaration from injected server state at construction time', () => {
        Unit.config.mode = 'server';
        const server = xnew(function Server() { xnew(Enemy); });
        Unit.config.mode = 'client';
        const client = xnew((u: Unit) => {});
        Unit.config.mode = null;

        Unit.start(Unit.rootUnit);
        Unit.update(Unit.rootUnit);                              // server Enemy: hp=101, x=3
        xnew.sync.apply(client, xnew.sync.capture(server));     // create replica

        const replica = client._.children[0];
        // Base(hp) と Enemy(x) の両宣言が、構築時点でサーバー値として読めている
        expect(clientReadAtConstruction).toEqual({ hp: 101, x: 3 });
        expect(replica._.state).toEqual({ hp: 101, x: 3 });
    });

    it('warns on duplicate keys across declarations (last-write-wins)', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const unit = xnew((u: Unit) => {
            xnew.sync.state({ pos: 1 });
            xnew.sync.state({ pos: 2 });   // 同名キー
        });
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('duplicate key "pos"'));
        expect(unit._.state).toEqual({ pos: 2 });   // last-write-wins
        warn.mockRestore();
    });

    it('does not leak injected state into a non-synced child built during the body', () => {
        let childState: Record<string, any> = {};
        function Host(unit: Unit) {
            xnew.sync.state({ value: 0 });
            xnew.server(() => { unit.on('update', () => { (unit._.state as any).value += 5; }); });
            // 本体内でインライン生成する非 synced 子（apply ではなく親本体が生成する）
            xnew.client(() => {
                xnew(function Child() { childState = xnew.sync.state({ value: -1 }); });
            });
        }
        resetRegistry(); xnew.sync.register({ Host });

        Unit.config.mode = 'server';
        const server = xnew(function Server() { xnew(Host); });
        Unit.config.mode = 'client';
        const client = xnew((u: Unit) => {});
        Unit.config.mode = null;

        Unit.start(Unit.rootUnit);
        Unit.update(Unit.rootUnit);                              // server Host: value=5
        xnew.sync.apply(client, xnew.sync.capture(server));     // create replica Host + inline Child

        const replicaHost = client._.children[0];
        expect(replicaHost._.state!.value).toBe(5);             // Host は注入値
        expect(childState.value).toBe(-1);                      // 子は自分の initial（親の注入が漏れない）
    });

    // 6_state-sync サンプルの構成を再現: 基底 Actor(位置+描画) を Enemy が extend し hp を足す。
    it('mirrors the example: extended base nests the element, both declarations sync and render', () => {
        // 基底: 位置 {x,y} を宣言し、client で要素を nest して位置を反映する
        function Actor(unit: Unit, props: any = {}) {
            const pos = xnew.sync.state({ x: 0, y: props.y ?? 0 });
            xnew.client(() => {
                const el = xnew.nest('<div>') as HTMLElement;
                unit.on('render', () => { el.style.left = `${pos.x}px`; el.style.top = `${pos.y}px`; });
            });
        }
        // 拡張: Actor を取り込み hp を足し、基底が nest した要素を unit.element 経由で着色する
        function Sprite(unit: Unit, props: any = {}) {
            xnew.extend(Actor, props);
            const state = xnew.sync.state({ hp: 3 });
            xnew.server(() => { unit.on('update', () => { state.x += 3; state.hp -= 1; }); });
            xnew.client(() => {
                const el = unit.element as HTMLElement;
                unit.on('render', () => { el.style.background = state.hp >= 2 ? 'red' : 'gray'; });
            });
        }
        resetRegistry(); xnew.sync.register({ Sprite });

        Unit.config.mode = 'server';
        const server = xnew(function Server() { xnew(Sprite, { y: 8 }); });
        Unit.config.mode = 'client';
        const client = xnew((u: Unit) => {});
        Unit.config.mode = null;

        Unit.start(Unit.rootUnit);
        Unit.update(Unit.rootUnit);                              // server Sprite: x=3, hp=2

        const tree = xnew.sync.capture(server);
        expect(tree).toHaveLength(1);
        expect(tree[0].state).toEqual({ x: 3, y: 8, hp: 2 });    // Actor 由来(x,y) + Sprite 由来(hp) がマージ

        xnew.sync.apply(client, tree);                           // create replica
        Unit.start(Unit.rootUnit);
        Unit.render(Unit.rootUnit);                             // replica render（両 render ハンドラが走る）

        const el = client._.children[0].element as HTMLElement;
        expect(el.style.left).toBe('3px');                      // 基底 Actor の render（位置）
        expect(el.style.top).toBe('8px');
        expect(el.style.background).toBe('red');                // 拡張 Sprite の render（hp 由来の色）
    });
});
