import xnew from '../../dist/xnew.mjs';

//----------------------------------------------------------------------------------------------------
// base + extend の合成 synced state を実験するサンプル。
//   - Main   : server/client 共通のルート。中で xnew.server/xnew.client に分岐（同期対象ではない）
//   - Mover  : server ブロック内で定期的に Enemy を spawn する親（synced）
//   - Actor  : 位置 {x,y} を synced state で宣言し、client で矩形を描く「基底」コンポーネント
//   - Enemy  : xnew.extend(Actor) で基底を取り込み、自分の synced state {hp} と挙動を足す子（synced）
//   - xnew.sync.capture(server) で取得した state tree を画面右に表示
//   - 各 Enemy の state が {x, y, hp}（Actor 由来 + Enemy 由来）にマージされて同期される点がポイント
//----------------------------------------------------------------------------------------------------

// ---- Actor: 位置を持ち、client では矩形を描く「基底」コンポーネント ----
// 位置 {x,y} を synced state で宣言し、client 側の DOM 生成と位置反映を担う共有部分。
function Actor(unit, props = {}) {
    const pos = xnew.sync.state({ x: 0, y: props.y ?? 0 });   // 基底が宣言する synced state

    xnew.client(() => {
        const el = xnew.nest('<div>');
        el.style.cssText = 'position:absolute;width:16px;height:16px;border-radius:50%;';
        unit.on('render', () => {
            el.style.left = `${pos.x}px`;   // 位置の反映は基底の責務
            el.style.top = `${pos.y}px`;
        });
    });
}

// ---- Enemy: Actor を extend し、自分の synced state(hp) と挙動を足す ----
function Enemy(unit, props = {}) {
    xnew.extend(Actor, props);                    // 基底: 位置 {x,y} の宣言 + 描画を取り込む
    const state = xnew.sync.state({ hp: 3 });     // 拡張: hp を追加宣言。返り値は merged な _.state（{x,y,hp}）

    xnew.server(() => {
        unit.on('update', () => { state.x += 3; });   // 位置（基底が宣言）を右へ更新
        xnew.interval(() => {                          // hp（拡張が宣言）を毎秒減らし、0 で消滅
            state.hp -= 1;
            if (state.hp <= 0) { unit.finalize(); }
        }, 1000);
    });

    xnew.client(() => {
        const el = unit.element;   // 基底 Actor が nest した要素
        unit.on('render', () => {
            el.style.background = ['#888', '#e33', '#f90', '#3c3'][state.hp] ?? '#888';   // hp で色を変える（緑=3→橙=2→赤=1）
        });
    });
}

// ---- Mover: 定期的に Enemy を spawn する親 ----
function Mover(unit) {
    xnew.sync.register({ Enemy });   // Mover が直接生成する同期子
    const state = xnew.sync.state({ spawned: 0 });

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

// ---- Main: server / client で役割を分岐する共通ルート（同期対象ではない） ----
function Main() {
    xnew.sync.register({ Mover });   // server/client 共通: Main の直接の同期子は Mover
    xnew.server(() => {
        xnew(Mover);   // server: ロジックツリー（Mover → Enemy）を生成
    });

    xnew.client(() => {
        xnew.nest(document.getElementById('view'));   // client: 既存の #view を描画先にする（apply が replica をここに mount）
    });
}

// ---- 起動: 同じ Main を mode を切り替えて 2 回生成（中で server/client に分岐） ----
// xnew.sync.boot(mode, ...args) … その mode で xnew(...args) を生成し、終わったら mode を前の値へ復元。
// ※ 本番では server / client は別プロセスで各自 mode を 1 回設定するだけ。この同居はデモ専用。
const server = xnew.sync.boot('server', Main);   // 擬似サーバー（ロジック）
const client = xnew.sync.boot('client', Main);   // ブラウザ表示

// ---- 毎フレーム capture → apply（実ネットワークの代わりにインメモリで反映） ----
const stateView = document.getElementById('state');
xnew(function Driver(unit) {
    unit.on('update', () => {
        const tree = xnew.sync.capture(server);   // authoritative の state tree を取得
        xnew.sync.apply(client, tree);            // replica ツリーへ差分反映
        stateView.textContent = JSON.stringify(tree, null, 2);  // 取得した state を画面に表示
    });
});
