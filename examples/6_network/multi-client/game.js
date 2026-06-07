import xnew from '@mulsense/xnew';

//----------------------------------------------------------------------------------------------------
// game — multi-client のゲームロジック（コンポーネント定義）。**loopback でも socket.io でも無改変**で動く。
//   ネットワークは xnew.sync の transport（emit/on/clientId）だけに依存し、実体（loopback / socket.io）は
//   起動側で xnew.sync.use(...) に渡す。だから「approach の切り替え = use() に渡す transport を変えるだけ」。
//
//   - World  : server/client 共通ルート。socket は boot が自動バインド。
//       server: on('join'/'disconnect') で参加集合 → update で Player を spawn/despawn。
//               （presence は生の接続でなく明示的 'join' 基準。transport の upgrade/probe な idle 接続で
//                 幽霊プレイヤーが出るのを防ぐ）。
//       client: 自分のペイン(画面)を生成し、init で emit('join')。xnew.basics.Selectable を extend して
//               「クリックで選択／他ペインのクリックで自動解除（相互排他）」を得る（状態は unit.selected）。
//               選択中のペインだけ emit('move')（入力の上り）。
//       状態の下り（server→client）の配線はゲームロジックに含めない。transport 使用時は xnew.sync.boot が自動配線する。
//   - Player : 自機。synced state {x, y, clientId}。server は 'move' の方向ベクトルを vel に保持し、
//              update で積分して移動。client で描画。
//   - DOM は xnew 記法 + Tailwind。動的な位置(left/top)だけ inline style。
//   - 注意: on ハンドラは tick の外で走るので、その中で unit 生成/finalize はしない（spawn は update で）。
//----------------------------------------------------------------------------------------------------

const FIELD = { w: 224, h: 144 };   // 自機(16px)が 240x160 のペインに収まる移動範囲
const SPEED = 3;
const BG = { c1: 'bg-blue-500', c2: 'bg-red-500' };       // 自機の色（clientId 別。色は任意の id にフォールバック）
const LABEL = { c1: 'text-blue-500', c2: 'text-red-500' };

const clamp = (v, max) => Math.max(0, Math.min(max, v));
const colorOf = (id, map, fallback) => map[id] ?? fallback;

// ---- Player: 自機。位置を synced state で持ち、server は受信時に移動、client で描画 ----
export function Player(unit, props = {}) {
    const state = xnew.sync.state({ x: 0, y: 0, clientId: props.clientId ?? '' });

    xnew.server(() => {
        // 'move' で受け取る方向ベクトル(速度)を保持し、update(tick)で積分する（押しっぱなしで動き続ける）。
        const vel = { x: 0, y: 0 };
        xnew.sync.on('move', (clientId, vector) => {
            if (clientId !== state.clientId) { return; }
            vel.x = Math.sign(vector?.x || 0);
            vel.y = Math.sign(vector?.y || 0);
        });
        unit.on('update', () => {
            state.x = clamp(state.x + vel.x * SPEED, FIELD.w);
            state.y = clamp(state.y + vel.y * SPEED, FIELD.h);
        });
    });

    xnew.client(() => {
        const el = xnew.nest(`<div class="absolute w-4 h-4 rounded ${colorOf(state.clientId, BG, 'bg-gray-500')}">`);
        unit.on('render', () => {
            el.style.left = `${state.x}px`;   // 位置は動的値なので inline で反映
            el.style.top = `${state.y}px`;
            const isSelf = unit.parent?.viewerId === state.clientId;   // 自機は黒枠で強調
            el.classList.toggle('outline', isSelf);
            el.classList.toggle('outline-2', isSelf);
            el.classList.toggle('outline-black', isSelf);
            el.classList.toggle('z-10', isSelf);
        });
    });
}

// ---- World: server/client 共通ルート ----
export function World(unit) {
    xnew.sync.register({ Player });   // 同期対象の型を宣言（どの子を replica にするか）
    // 状態の下り（server=broadcast / client=apply）の配線と socket バインドは xnew.sync.boot が自動で行う
    // （transport は起動側の xnew.sync.use(...) で設定）。ゲームロジックは同期の配線を持たない。

    xnew.server(() => {
        const joined = new Set();      // 参加中の clientId（presence）
        const players = new Map();     // clientId → Player unit
        // presence は「生の接続」ではなく client が明示的に送る 'join' を基準にする。
        // （transport の upgrade/probe で生じる idle な接続が幽霊プレイヤーになるのを防ぐ）。
        xnew.sync.on('join', (clientId) => joined.add(clientId));
        xnew.sync.on('disconnect', (clientId) => joined.delete(clientId));
        unit.on('update', () => {
            // presence → spawn / despawn
            for (const clientId of joined) {
                if (!players.has(clientId)) { players.set(clientId, xnew(Player, { clientId })); }
            }
            for (const [clientId, player] of [...players.entries()]) {
                if (!joined.has(clientId)) { player.finalize(); players.delete(clientId); }
            }
        });
    });

    xnew.client(() => {
        const clientId = xnew.sync.clientId;   // 自動発番された自分の id（= socket.id）
        unit.viewerId = clientId;              // Player.render が「自機かどうか」を判定するために刻む
        xnew.sync.emit('join');                // server に参加を通知（presence。これで初めて Player が spawn される）

        // 画面（ペイン）を World 自身が生成する。以後 unit.element = このペイン（Player replica はこの配下に mount）。
        const pane = xnew.nest('<div class="relative w-60 h-40 overflow-hidden border border-gray-300 bg-gray-50 cursor-pointer">');
        xnew(`<div class="absolute left-1 top-0.5 text-[11px] font-bold pointer-events-none ${colorOf(clientId, LABEL, 'text-gray-500')}">`, clientId);   // ラベル

        // 選択ふるまいを付与: クリックで選択（他ペインは click.outside で自動解除 = 相互排他）。状態は unit.selected。
        xnew.extend(xnew.basics.Selectable);
        unit.on('-select', () => {
            pane.classList.add('border-black', 'ring-2', 'ring-black/20');
            pane.classList.remove('border-gray-300');
        });
        unit.on('-deselect', () => {
            pane.classList.remove('border-black', 'ring-2', 'ring-black/20');
            pane.classList.add('border-gray-300');
            xnew.sync.emit('move', { x: 0, y: 0 });   // 選択を外れたら停止
        });

        // 入力の上り: キー入力(WASD/矢印)を方向ベクトルで受け取り、選択中のペインだけが emit('move')。
        unit.on('window.keydown.wasd window.keyup.wasd window.keydown.arrow window.keyup.arrow', ({ event, vector }) => {
            if (!unit.selected) { return; }
            event.preventDefault();
            xnew.sync.emit('move', vector);
        });
        // フォーカスを失ったら停止（押しっぱなしのまま離れた時の暴走防止）。
        unit.on('window.blur', () => { if (unit.selected) { xnew.sync.emit('move', { x: 0, y: 0 }); } });
    });
}
