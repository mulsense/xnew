import xnew from '@mulsense/xnew';

//----------------------------------------------------------------------------------------------------
// game — multi-client のゲームロジック（loopback / socket.io 共通・無改変で動く）。
//   ネットワークは xnew.sync（emit/on/clientId）だけに依存。transport は起動側が xnew.sync.use(...) で差す。
//
//   - World  : server/client 共通ルート。socket バインドと状態の下り(mirror)は xnew.sync.boot が自動で行う。
//       server: 'join' で xnew(Player, { key: clientId }) を生成、'disconnect' で find(Player,{key}) して finalize。
//       client: ペインを生成し emit('join')。Selectable で「クリック選択 / 他ペインで自動解除（相互排他）」だけを担う。
//   - Player : synced state {x, y, clientId}。移動は Player の動作として完結する。
//       server: 'move' の方向を vel に保持→update で積分。 client: 描画＋（自機なら）入力(WASD/矢印)→emit('move')。
//               自機判定は state.clientId === xnew.sync.clientId、入力可否は上位 World の Selectable.selected。
//   - key: xnew(C, { key }) で同一性の目印を付け、xnew.find(C, { key }) で引ける（key はグローバル一意の想定）。
//----------------------------------------------------------------------------------------------------

const FIELD = { w: 224, h: 144 };   // 自機(16px)が 240x160 のペインに収まる移動範囲
const SPEED = 3;
const clamp = (v, max) => Math.max(0, Math.min(max, v));

// ---- Player: 位置を synced state で持ち、server が移動、client が描画 ----
export function Player(unit, { clientId = '' } = {}) {
    const state = xnew.sync.state({ x: 0, y: 0, clientId });

    xnew.server(() => {
        const vel = { x: 0, y: 0 };   // 'move' で受けた方向(速度)。update で積分し、押しっぱなしで動き続ける
        xnew.sync.on('move', (id, vector) => {
            if (id !== state.clientId) { return; }
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
        if (state.clientId === xnew.sync.clientId) {
            const pane = xnew.context(xnew.basics.Selectable);   // 所属する World の選択状態/イベント
            const stop = () => xnew.sync.emit('move', { x: 0, y: 0 });
            // 所属ペインが選択中のときだけ、方向ベクトルを emit('move')（入力の上り）。
            unit.on('window.keydown.wasd window.keyup.wasd window.keydown.arrow window.keyup.arrow', ({ event, vector }) => {
                if (!pane?.selected) { return; }
                event.preventDefault();
                xnew.sync.emit('move', vector);
            });
            unit.on('window.blur', () => { if (pane?.selected) { stop(); } });   // フォーカス喪失で停止
            pane?.on('-deselect', stop);                                          // 選択を外れたら停止
            unit.on('finalize', () => pane?.off('-deselect', stop));
        }
    });
}

// ---- World: server/client 共通ルート ----
export function World(unit) {
    xnew.sync.register({ Player });   // 同期対象の型を宣言

    xnew.server(() => {
        // clientId を key にして Player を生成（同一性の目印）。disconnect では key で引いて finalize。
        // sync.on は登録元ユニットのスコープで走るので、xnew(Player) は World の子として生成される。
        xnew.sync.on('join', (clientId) => xnew(Player, { key: clientId, clientId }));
        xnew.sync.on('disconnect', (clientId) => xnew.find(Player, { key: clientId })[0]?.finalize());
    });

    xnew.client(() => {
        xnew.sync.emit('join');   // 参加通知（これで server が Player を spawn する）
        const pane = xnew.nest('<div class="relative w-60 h-40 overflow-hidden border border-gray-300 bg-gray-50 cursor-pointer">');

        // クリックで選択（他ペインのクリックで自動解除 = 相互排他）。入力→移動は自機 Player 側が担う。
        xnew.extend(xnew.basics.Selectable);
        unit.on('-select', () => pane.classList.add('ring-2', 'ring-black'));
        unit.on('-deselect', () => pane.classList.remove('ring-2', 'ring-black'));
    });
}
