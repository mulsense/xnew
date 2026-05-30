//----------------------------------------------------------------------------------------------------
// 6_network — サーバーエントリ (express + socket.io + xnew)
//
// シンプルなリアルタイム対戦サンプルの「サーバー権威」側。プレイヤーは 1 つの共有フィールドに
// 登場し、矢印 / WASD で動く。位置はクライアントが計算せず、サーバーが毎フレーム計算して
// 一定レートで全員に配信する。同期の考え方 (サーバー権威 + 入力送信 + 状態スナップショット
// 配信) は ../../../../WebGame/socketio を参考にしている。
//
// xnew の使い方が肝: ゲームループ (物理計算と配信) を setInterval ではなく xnew の Unit と
// その 'update' イベントで回している = ブラウザ側とまったく同じ仕組みでサーバーが動く。
//----------------------------------------------------------------------------------------------------

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express from 'express';
import { Server as IOServer } from 'socket.io';

// サーバーでも xnew を使う。examples/dist のローカルビルドをそのまま読み込む
// (5_node-console と同じ流儀。npm 依存にせず monorepo のビルドを直接使う)。
import xnew from '../../dist/xnew.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// ---- フィールド / 物理定数 (サーバーが唯一の真実) ----
const FIELD = { w: 800, h: 600 };
const PLAYER_RADIUS = 16;
const PLAYER_SPEED = 200; // px / sec
const BROADCAST_HZ = 30;  // 状態スナップショットを配信するレート
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#eab308'];

// ---- HTTP + 静的配信 ----
const app = express();
app.use(express.static(join(__dirname, '..', 'public')));
// ブラウザがオフラインでも import できるよう、ローカルの xnew ビルドを /xnew で配信する。
app.use('/xnew', express.static(join(__dirname, '..', '..', 'dist')));
// Tailwind (ブラウザ版) もローカル同梱のビルドを /thirdparty で配信する。
app.use('/thirdparty', express.static(join(__dirname, '..', '..', 'thirdparty')));

const httpServer = createServer(app);
const io = new IOServer(httpServer);

// xnew がサーバーのゲームループを駆動する。返り値の unit にゲーム操作メソッドが生える。
const arena = xnew(Arena, { io });

// ---- socket ハンドラ: socket とゲーム状態をつなぐだけの薄い層 ----
io.on('connection', (socket) => {
    // 接続直後に自分の id とフィールドサイズを通知。
    socket.emit('welcome', { id: socket.id, field: FIELD });

    // 名前を決めてフィールドに登場。
    socket.on('join', ({ name } = {}) => {
        arena.join(socket.id, name);
    });

    // 方向ベクトルを受け取り保存するだけ。実際の移動は次の update で行う (= サーバー権威)。
    socket.on('input', (vector = {}) => {
        arena.input(socket.id, vector);
    });

    socket.on('disconnect', () => {
        arena.leave(socket.id);
    });
});

httpServer.listen(PORT, () => {
    console.log(`[xnew/6_network] listening on http://localhost:${PORT}`);
    console.log(`[xnew/6_network] field=${FIELD.w}x${FIELD.h} broadcast=${BROADCAST_HZ}Hz`);
});

//----------------------------------------------------------------------------------------------------
// Arena — サーバー側ゲーム状態とゲームループを持つ xnew コンポーネント
//
// players (socketId -> プレイヤー) を保持し、'update' で全員の位置を積分、BROADCAST_HZ に
// 間引いて 'state' を全員にブロードキャストする。join / leave / input を unit メソッドとして
// 公開し、socket ハンドラから呼ばれる。
//----------------------------------------------------------------------------------------------------

function Arena(unit, { io }) {
    // socketId -> { id, name, color, x, y, input }
    const players = new Map();
    let nextColor = 0;

    let lastAt = Date.now();
    let accMs = 0;
    const broadcastIntervalMs = 1000 / BROADCAST_HZ;

    // 物理計算: 'update' は xnew のルートティッカー (node では setTimeout、約 60fps) で発火する。
    // ブラウザが描画に使うのと同じイベント。dt は実時計の差分から求めるので、tick が詰まっても
    // 移動速度は変わらない。
    unit.on('update', () => {
        const now = Date.now();
        const dt = (now - lastAt) / 1000;
        lastAt = now;

        for (const player of players.values()) {
            // input は方向ベクトル { x, y } (各軸 -1 / 0 / +1)。
            let vx = player.input.x;
            let vy = player.input.y;
            // 斜め移動が √2 倍速くならないよう正規化する。
            if (vx !== 0 && vy !== 0) {
                const inv = 1 / Math.SQRT2;
                vx *= inv;
                vy *= inv;
            }
            player.x = clamp(player.x + vx * PLAYER_SPEED * dt, PLAYER_RADIUS, FIELD.w - PLAYER_RADIUS);
            player.y = clamp(player.y + vy * PLAYER_SPEED * dt, PLAYER_RADIUS, FIELD.h - PLAYER_RADIUS);
        }

        // 配信は BROADCAST_HZ に間引く (60fps のまま送ると帯域の無駄)。
        accMs += dt * 1000;
        if (accMs >= broadcastIntervalMs) {
            accMs -= broadcastIntervalMs;
            io.emit('state', snapshot());
        }
    });

    function snapshot() {
        return {
            players: [...players.values()].map((player) => ({
                id: player.id,
                name: player.name,
                color: player.color,
                // 帯域節約のため整数に丸める (1px 単位で表示には十分)。
                x: Math.round(player.x),
                y: Math.round(player.y),
            })),
        };
    }

    return {
        join(id, name) {
            const cleanName = String(name || '').trim().slice(0, 12) || `guest-${id.slice(0, 4)}`;
            players.set(id, {
                id,
                name: cleanName,
                color: COLORS[nextColor++ % COLORS.length],
                x: PLAYER_RADIUS + Math.random() * (FIELD.w - PLAYER_RADIUS * 2),
                y: PLAYER_RADIUS + Math.random() * (FIELD.h - PLAYER_RADIUS * 2),
                input: { x: 0, y: 0 },
            });
        },
        leave(id) {
            players.delete(id);
        },
        input(id, vector) {
            const player = players.get(id);
            if (!player) { return; }
            // 各軸を -1 / 0 / +1 に丸める (不正値対策)。
            player.input = {
                x: Math.sign(Number(vector?.x) || 0),
                y: Math.sign(Number(vector?.y) || 0),
            };
        },
    };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
