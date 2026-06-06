//----------------------------------------------------------------------------------------------------
// games/metaverse — 共有 2D フィールドでアバターを動かすゲーム (最初のプラグイン)
//
// サーバー権威モデル: クライアントは方向ベクトルを送るだけ、位置はここで計算する。
// ネット層 (room.js) から呼ばれる GameInstance 契約を実装する (フレームワーク非依存)。
//----------------------------------------------------------------------------------------------------

const FIELD = { w: 800, h: 600 };
const PLAYER_RADIUS = 16;
const PLAYER_SPEED = 200; // px / sec
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#eab308'];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const id = 'metaverse';
export const name = 'メタバース（移動）';

export function create() {
    // playerId -> { id, name, color, x, y, input }
    const players = new Map();
    let nextColor = 0;

    return {
        welcome() {
            return { field: FIELD };
        },

        onJoin(playerId, { name } = {}) {
            const cleanName = String(name || '').trim().slice(0, 12) || `guest-${playerId.slice(0, 4)}`;
            players.set(playerId, {
                id: playerId,
                name: cleanName,
                color: COLORS[nextColor++ % COLORS.length],
                x: PLAYER_RADIUS + Math.random() * (FIELD.w - PLAYER_RADIUS * 2),
                y: PLAYER_RADIUS + Math.random() * (FIELD.h - PLAYER_RADIUS * 2),
                input: { x: 0, y: 0 },
            });
        },

        onLeave(playerId) {
            players.delete(playerId);
        },

        onInput(playerId, vector) {
            const player = players.get(playerId);
            if (!player) { return; }
            player.input = {
                x: Math.sign(Number(vector?.x) || 0),
                y: Math.sign(Number(vector?.y) || 0),
            };
        },

        update(dt) {
            for (const player of players.values()) {
                let vx = player.input.x;
                let vy = player.input.y;
                if (vx !== 0 && vy !== 0) {
                    const inv = 1 / Math.SQRT2;
                    vx *= inv;
                    vy *= inv;
                }
                player.x = clamp(player.x + vx * PLAYER_SPEED * dt, PLAYER_RADIUS, FIELD.w - PLAYER_RADIUS);
                player.y = clamp(player.y + vy * PLAYER_SPEED * dt, PLAYER_RADIUS, FIELD.h - PLAYER_RADIUS);
            }
        },

        snapshot() {
            return {
                players: [...players.values()].map((player) => ({
                    id: player.id,
                    name: player.name,
                    color: player.color,
                    x: Math.round(player.x),
                    y: Math.round(player.y),
                })),
            };
        },
    };
}
