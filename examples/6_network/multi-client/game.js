import xnew from '@mulsense/xnew';

//----------------------------------------------------------------------------------------------------
// game — multi-client のゲームロジック（socket.io 前提・無改変で動く）。
//   ネットワークは xnew.sync（emit/on/client）だけに依存。transport は起動側が xnew.sync.boot({ mode, socket }, ...) で渡す socket.io の socket。
//   1 ブラウザ = 1 client = 1 ペイン。入力は常に自機へ送る（ペイン選択は無い）。
//
//   - World  : server/client 共通ルート。socket バインドと状態の下り(capture/apply)は xnew.sync.boot が自動で行う。
//       server: '-join' で xnew(Player, { key: clientId }) を生成、'disconnect' で find(Player,{key}) して finalize。
//       client: 自分のペインを 1 つ生成し emit('-join')。
//   - Player : synced state {x, y, clientId}。移動は Player の動作として完結する。
//       server: '-move'（同一コンポーネント宛て）で方向を vel に保持→update で積分。
//       client: 描画＋（自機なら）入力(WASD/矢印)→emit('-move')。自機判定は state.clientId === xnew.sync.client.id。
//   - sync イベント: 送信は xnew.sync.emit（payload はオブジェクト・syncId 自動付与）、受信は unit.on（受信 unit を明示）。
//       handler は { id, ...payload }。プレフィックス '-'=同一コンポーネント(同じ syncId・replica↔server で一致) / '+'・無印=全体。
//   - key: xnew(C, { key }) で同一性の目印を付け、xnew.find(C, { key }) で引ける（key はグローバル一意の想定）。
//----------------------------------------------------------------------------------------------------

const FIELD = { w: 224, h: 144 };   // 自機(16px)が 240x160 のペインに収まる移動範囲
const SPEED = 3;
const clamp = (v, max) => Math.max(0, Math.min(max, v));

// ---- Player: 位置を synced state で持ち、server が移動、client が描画 ----
export function Player(unit, { clientId = '' } = {}) {
    const state = xnew.sync.state({ x: 0, y: 0, clientId });

    xnew.server(() => {
        const vel = { x: 0, y: 0 };   // 受けた方向(速度)。update で積分し、押しっぱなしで動き続ける
        // '-move' = 同一コンポーネント宛て。自機(同じ syncId の client replica)からの move だけが届く（id 判定不要）。
        // 受け手は unit.on（受信 unit = この Player を明示）。socket→unit.on の橋渡しは boot が配線する。
        unit.on('-move', ({ vector }) => {
            vel.x = Math.sign(vector?.x || 0);
            vel.y = Math.sign(vector?.y || 0);
        });
        unit.on('update', () => {
            state.x = clamp(state.x + vel.x * SPEED, FIELD.w);
            state.y = clamp(state.y + vel.y * SPEED, FIELD.h);
        });
    });

    xnew.client(() => {
        const el = xnew.nest('<div class="absolute w-4 h-4 rounded bg-blue-500">');
        unit.on('render', () => { el.style.left = `${state.x}px`; el.style.top = `${state.y}px`; });

        // 入力 → 移動はこの自機の動作。自機（このクライアント自身の Player）だけが入力を受ける。
        if (state.clientId === xnew.sync.client.id) {
            const stop = () => xnew.sync.emit('-move', { vector: { x: 0, y: 0 } });
            // 方向ベクトルを emit('-move')（自機の入力の上り）。
            unit.on('window.keydown.wasd window.keyup.wasd window.keydown.arrow window.keyup.arrow', ({ event, vector }) => {
                event.preventDefault();
                xnew.sync.emit('-move', { vector });
            });
            unit.on('window.blur', stop);   // フォーカス喪失で停止
        }
    });
}

// ---- World: server/client 共通ルート ----
export function World(unit) {
    xnew.sync.register({ Player });   // 同期対象の型を宣言

    xnew.server(() => {
        // clientId を key にして Player を生成（同一性の目印）。disconnect では key で引いて finalize。
        // sync.on は登録元ユニットのスコープで走るので、xnew(Player) は World の子として生成される。
        unit.on('-join', ({ id }) => xnew(Player, { key: id, clientId: id }));
        unit.on('disconnect', ({ id }) => xnew.find(Player, { key: id })[0]?.finalize());
    });

    xnew.client(() => {
        xnew.sync.emit('-join');   // 参加通知（これで server が Player を spawn する）。'-' = 自身宛て: client ルート ⇄ 対応する server ルート（共に syncId=null で一致）。
        xnew.nest('<div class="relative w-60 h-40 overflow-hidden border border-gray-300 bg-gray-50">');   // 自分のペイン（入力→移動は自機 Player 側が担う）
    });
}
