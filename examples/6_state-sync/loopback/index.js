import xnew from '../../dist/xnew.mjs';

//----------------------------------------------------------------------------------------------------
// 2 階層のコンポーネント（Mover → Enemy）で state 同期を実験するサンプル。
//   - Mover  : server ブロック内で定期的に Enemy を spawn する親
//   - Enemy  : 所定方向へ移動し、一定時間で消える子（synced）
//   - server サブツリーで update/spawn、client サブツリーで描画
//   - xnew.state.capture(server) で取得した state tree を画面右に表示
//----------------------------------------------------------------------------------------------------

// ---- Enemy: 右へ移動し、一定時間で消える ----
function Enemy(unit, props = {}) {
    const state = xnew.state.initialize({ x: 0, y: props.y ?? 0 });

    xnew.server(() => {
        unit.on('update', () => { state.x += 3; });   // 所定方向（右）へ移動
        xnew.timeout(() => unit.finalize(), 3000);     // 3 秒で消滅
    });

    xnew.client(() => {
        const el = xnew.nest('<div>');
        el.style.cssText = 'position:absolute;width:16px;height:16px;background:#e44;border-radius:50%;';
        unit.on('render', () => {
            el.style.left = `${state.x}px`;
            el.style.top = `${state.y}px`;
        });
    });
}
xnew.state.register('Enemy', Enemy);

// ---- Mover: 定期的に Enemy を spawn する親 ----
function Mover(unit) {
    const state = xnew.state.initialize({ spawned: 0 });

    xnew.server(() => {
        let lane = 0;
        xnew.interval(() => {
            const y = 8 + (lane % 6) * 18;
            lane += 1;
            state.spawned += 1;
            xnew(Enemy, { y });   // Enemy は Mover の synced 子として生成
        }, 600);
    });

    xnew.client(() => {
        xnew.nest('<div>');       // Enemy 要素を内包するコンテナ
    });
}
xnew.state.register('Mover', Mover);

// ---- 起動: config でモードを切り替えながらサブツリーを生成 ----
xnew.config.mode = 'server';
const server = xnew(Mover);                                              // 擬似サーバー（ロジック）
xnew.config.mode = 'client';
const client = xnew(document.getElementById('view'), function View() {}); // ブラウザ表示
xnew.config.mode = null;

// ---- 毎フレーム capture → apply（実ネットワークの代わりにインメモリで反映） ----
const stateView = document.getElementById('state');
xnew(function Driver(unit) {
    unit.on('update', () => {
        const tree = xnew.state.capture(server);   // authoritative の state tree を取得
        xnew.state.apply(client, tree);            // replica ツリーへ差分反映
        stateView.textContent = JSON.stringify(tree, null, 2);  // 取得した state を画面に表示
    });
});
