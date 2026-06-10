//----------------------------------------------------------------------------------------------------
// games/metaverse — 共有 2D フィールドのアバター移動（server / browser 共有コンポーネント）
//
// state-sync 思想を実ネットワークに適用: 1 つの Player を xnew.server(移動計算)/xnew.client(DOM描画)
// で書き分け、xnew.sync が state を橋渡しする。このファイルは server(Node) と browser の双方が import
// するため node 固有 API を一切使わない（@mulsense/xnew のみ）。
//
// - id / name / FIELD            : ゲーム識別子と定数
// - step(pos, input, dt, field)  : 純粋な移動計算（正規化 + clamp）。テスト対象
// - Player(unit, props)          : 共有コンポーネント（server=移動 / client=描画）
// - World(unit, props)           : ルートコンポーネント（Player を register、client は field を nest）
// - create()                     : server World をブートして GameInstance（room.js 契約）を返す
//----------------------------------------------------------------------------------------------------

import xnew from '@mulsense/xnew';

export const id = 'metaverse';
export const name = 'メタバース（移動）';
export const FIELD = { w: 800, h: 600 };
export const PLAYER_RADIUS = 16;
export const PLAYER_SPEED = 200; // px / sec
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#eab308'];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** 純粋な 1 ステップ移動。方向を正規化し、速度×dt 進めてフィールド内に clamp する。 */
export function step(pos, input, dt, field = FIELD) {
    let vx = Math.sign(Number(input?.x) || 0);
    let vy = Math.sign(Number(input?.y) || 0);
    if (vx !== 0 && vy !== 0) {
        const inv = 1 / Math.SQRT2;
        vx *= inv;
        vy *= inv;
    }
    return {
        x: clamp(pos.x + vx * PLAYER_SPEED * dt, PLAYER_RADIUS, field.w - PLAYER_RADIUS),
        y: clamp(pos.y + vy * PLAYER_SPEED * dt, PLAYER_RADIUS, field.h - PLAYER_RADIUS),
    };
}

const cleanName = (name, playerId) => String(name || '').trim().slice(0, 12) || `guest-${playerId.slice(0, 4)}`;

// ---- Player: 1 つの synced unit。server が動かし、client が描く ----
export function Player(unit, props = {}) {
    const state = xnew.sync.state({
        id: props.id ?? '',
        name: props.name ?? '',
        color: props.color ?? '#fff',
        x: props.x ?? 0,
        y: props.y ?? 0,
    });

    xnew.server(() => {
        const input = props.input;          // plugin が握る {x,y}（synced state ではない）
        let last = Date.now();
        unit.on('update', () => {
            const now = Date.now();
            const dt = (now - last) / 1000;
            last = now;
            const next = step({ x: state.x, y: state.y }, input, dt);
            state.x = next.x;
            state.y = next.y;
        });
    });

    xnew.client(() => {
        const world = xnew.context(World);
        const isSelf = state.id === world?.getSelfId?.();
        const el = xnew.nest('<div>');
        el.style.cssText = 'position:absolute;width:32px;height:32px;margin-left:-16px;margin-top:-16px;'
            + `border-radius:50%;background:${state.color};`
            + (isSelf ? 'box-shadow:0 0 0 2px #fff;' : '');

        const label = document.createElement('div');
        label.textContent = state.name;     // textContent = ユーザー入力名を安全に表示
        label.style.cssText = 'position:absolute;left:50%;top:-22px;transform:translateX(-50%);'
            + 'font:12px sans-serif;color:#e2e8f0;white-space:nowrap;';
        el.appendChild(label);

        // 生成 frame は render が 1 回遅延するため、初期位置を直接セットして (0,0) ちらつきを防ぐ。
        el.style.left = `${state.x}px`;
        el.style.top = `${state.y}px`;
        unit.on('render', () => {
            el.style.left = `${state.x}px`;
            el.style.top = `${state.y}px`;
        });
    });
}

// ---- World: ルート。Player を register し、server では spawn 管理、client では field を用意 ----
export function World(unit, props = {}) {
    xnew.sync.register({ Player });

    // server: プレイヤーの spawn / 入力 / 退出を World 内で管理し、defines として公開する。
    // defines 関数は World のスコープで実行されるため、join 内の xnew(Player) は World の子になる。
    xnew.server(() => {
        const players = new Map();   // playerId -> { unit, input }
        let nextColor = 0;
        return {
            join(playerId, { name } = {}) {
                const input = { x: 0, y: 0 };
                const player = xnew(Player, {
                    id: playerId,
                    name: cleanName(name, playerId),
                    color: COLORS[nextColor++ % COLORS.length],
                    x: PLAYER_RADIUS + Math.random() * (FIELD.w - PLAYER_RADIUS * 2),
                    y: PLAYER_RADIUS + Math.random() * (FIELD.h - PLAYER_RADIUS * 2),
                    input,
                });
                players.set(playerId, { unit: player, input });
            },
            leave(playerId) {
                players.get(playerId)?.unit.finalize();
                players.delete(playerId);
            },
            input(playerId, vector) {
                const p = players.get(playerId);
                if (!p) { return; }
                p.input.x = Math.sign(Number(vector?.x) || 0);
                p.input.y = Math.sign(Number(vector?.y) || 0);
            },
        };
    });

    xnew.client(() => {
        const fieldW = props.field?.w ?? FIELD.w;
        const fieldH = props.field?.h ?? FIELD.h;
        const field = xnew.nest('<div>');
        field.style.cssText = 'position:absolute;left:50%;top:50%;transform-origin:center;'
            + `width:${fieldW}px;height:${fieldH}px;background:#1e293b;`
            + 'background-image:linear-gradient(#334155 1px,transparent 1px),'
            + 'linear-gradient(90deg,#334155 1px,transparent 1px);background-size:40px 40px;';
        unit.on('render', () => {                  // 親に収まるよう fit:contain 相当でスケール
            const parent = field.parentElement;
            if (!parent) { return; }
            const s = Math.min(parent.clientWidth / fieldW, parent.clientHeight / fieldH);
            field.style.transform = `translate(-50%,-50%) scale(${s})`;
        });
    });

    // defines は関数のみ可。client の Player が xnew.context(World).getSelfId() で自分を判定する。
    return { getSelfId: () => props.selfId };
}

// ---- create: server World をブートし、room.js から呼ばれる GameInstance を返す ----
// spawn / 入力 / 退出は World の defines（join / leave / input）に委譲する。
export function create() {
    const world = xnew.sync.boot('server', null, World);

    return {
        welcome() {
            return { field: FIELD };
        },
        onJoin(playerId, info) {
            world.join(playerId, info ?? {});
        },
        onLeave(playerId) {
            world.leave(playerId);
        },
        onInput(playerId, vector) {
            world.input(playerId, vector);
        },
        capture() {
            return xnew.sync.capture(world);
        },
        dispose() {
            world.finalize();
        },
    };
}
