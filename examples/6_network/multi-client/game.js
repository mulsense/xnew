import xnew from '@mulsense/xnew';

//----------------------------------------------------------------------------------------------------
// game — multi-client のゲームロジック（loopback / socket.io 共通・無改変で動く）。
//   ネットワークは xnew.sync（emit/on/clientId）だけに依存。transport は起動側が xnew.sync.use(...) で差す。
//
//   - World  : server/client 共通ルート。socket バインドと状態の下り(mirror)は xnew.sync.boot が自動で行う。
//       server: 'join'/'disconnect'(presence)で参加集合を持ち、update で Player を spawn/despawn。
//       client: ペインを生成し emit('join')。Selectable で「クリック選択 / 他ペインで自動解除（相互排他）」。
//               選択中のペインだけ入力(WASD/矢印)を emit('move') で送る。
//   - Player : synced state {x, y, clientId}。server が 'move' の方向を vel に保持→update で積分、client が描画。
//   - 注意: on ハンドラは tick の外で走るので、その中で unit 生成/finalize はしない（spawn は update で）。
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
    });
}

// ---- World: server/client 共通ルート ----
export function World(unit) {
    xnew.sync.register({ Player });   // 同期対象の型を宣言

    xnew.server(() => {
        const joined = new Set();      // 参加中の clientId（presence）
        const players = new Map();     // clientId → Player unit
        xnew.sync.on('join', (clientId) => joined.add(clientId));
        xnew.sync.on('disconnect', (clientId) => joined.delete(clientId));
        unit.on('update', () => {
            for (const clientId of joined) {
                if (!players.has(clientId)) { players.set(clientId, xnew(Player, { clientId })); }
            }
            for (const [clientId, player] of [...players.entries()]) {
                if (!joined.has(clientId)) { player.finalize(); players.delete(clientId); }
            }
        });
    });

    xnew.client(() => {
        xnew.sync.emit('join');   // 参加通知（これで server が Player を spawn する）
        const pane = xnew.nest('<div class="relative w-60 h-40 overflow-hidden border border-gray-300 bg-gray-50 cursor-pointer">');
        const stop = () => xnew.sync.emit('move', { x: 0, y: 0 });

        // クリックで選択（他ペインのクリックで自動解除 = 相互排他）。選択中のペインだけ入力を送る。
        xnew.extend(xnew.basics.Selectable);
        unit.on('-select', () => pane.classList.add('ring-2', 'ring-black'));
        unit.on('-deselect', () => { pane.classList.remove('ring-2', 'ring-black'); stop(); });
        unit.on('window.keydown.wasd window.keyup.wasd window.keydown.arrow window.keyup.arrow', ({ event, vector }) => {
            if (!unit.selected) { return; }
            event.preventDefault();
            xnew.sync.emit('move', vector);
        });
        unit.on('window.blur', () => { if (unit.selected) { stop(); } });
    });
}
