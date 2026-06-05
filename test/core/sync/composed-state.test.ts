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
});
