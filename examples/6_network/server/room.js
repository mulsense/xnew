//----------------------------------------------------------------------------------------------------
// 6_network — room ワーカー: 1 ルーム専用の socket.io + xnew ゲームループ
//
// master が ?room=<このルーム> の接続だけをここへ振り分けるので、このプロセスのクライアントは
// 必ず同じルーム。よって socket.io の room 機能は使わず io.emit でそのまま全員配信できる。
// ゲームロジックは xnew (Arena 配下に Player を動的ユニットとして追加) で、現行と同じ。
//
// listen はしない (接続は master から io.httpServer へ注入される)。人数が変わるたび master 経由で
// lobby へ 'room:count' を通知する (フレーム毎ではない低頻度の制御通信)。
//
// - startRoom(roomId, roomName) : socket.io + Arena を起動し、setupWorker で接続を受け取る
// - Arena / Player              : サーバー権威のゲーム状態 (xnew コンポーネント)
//----------------------------------------------------------------------------------------------------

import { createServer } from 'node:http';
import { Server as IOServer } from 'socket.io';
import sticky from '@socket.io/sticky';
import xnew from '../../dist/xnew.mjs';
import { FIELD, PLAYER_RADIUS, PLAYER_SPEED, BROADCAST_HZ, COLORS, clamp } from './shared.js';

const { setupWorker } = sticky;

export function startRoom(roomId, roomName) {
    const httpServer = createServer();
    const io = new IOServer(httpServer);
    setupWorker(io); // master からのソケットハンドルを受け取る (listen はしない)

    // xnew がこのルームのゲームループを駆動する。配信は io.emit を渡すだけ。
    const arena = xnew(Arena, { broadcast: (players) => io.emit('state', { players }) });

    io.on('connection', (socket) => {
        socket.emit('welcome', { id: socket.id, field: FIELD, roomId, roomName, pid: process.pid });

        socket.on('join', ({ name } = {}) => {
            arena.join(socket.id, name);
            reportCount();
        });
        socket.on('input', (vector) => arena.input(socket.id, vector));
        socket.on('disconnect', () => {
            arena.leave(socket.id);
            reportCount();
        });
    });

    // 人数をロビーへ通知 (master が中継)。
    function reportCount() {
        process.send?.({ type: 'room:count', roomId, count: arena.count() });
    }

    // 起動完了を master へ通知 (master はこれを見てから一覧掲載/作成者へ通知する)。
    process.send?.({ type: 'room:ready', roomId });
    console.log(`[xnew/6_network] room worker '${roomId}' (${roomName}) ready (pid=${process.pid})`);
}

//----------------------------------------------------------------------------------------------------
// Arena — プレイヤーユニットの集合を管理し、状態を配信する xnew コンポーネント
//
// 物理計算は各 Player が自分で行う。Arena は join で子 Player を生成、leave で finalize、input を
// 中継し、'update' で BROADCAST_HZ に間引いて全 Player の snapshot を broadcast する。
// xnew の更新順は子 -> 親なので、1 tick 内で全 Player が動いた後に配信される (= 常に最新位置)。
//----------------------------------------------------------------------------------------------------

function Arena(unit, { broadcast }) {
    // socketId -> Player ユニット
    const playerUnits = new Map();
    let nextColor = 0;

    let lastAt = Date.now();
    let accMs = 0;
    const broadcastIntervalMs = 1000 / BROADCAST_HZ;

    unit.on('update', () => {
        const now = Date.now();
        const dt = (now - lastAt) / 1000;
        lastAt = now;

        accMs += dt * 1000;
        if (accMs >= broadcastIntervalMs) {
            accMs -= broadcastIntervalMs;
            broadcast([...playerUnits.values()].map((player) => player.snapshot()));
        }
    });

    return {
        join(id, name) {
            if (playerUnits.has(id)) { return; }
            const cleanName = String(name || '').trim().slice(0, 12) || `guest-${id.slice(0, 4)}`;
            // この join は Arena のスコープで実行されるため、xnew(Player) は Arena の子になる。
            const player = xnew(Player, {
                id,
                name: cleanName,
                color: COLORS[nextColor++ % COLORS.length],
                x: PLAYER_RADIUS + Math.random() * (FIELD.w - PLAYER_RADIUS * 2),
                y: PLAYER_RADIUS + Math.random() * (FIELD.h - PLAYER_RADIUS * 2),
            });
            playerUnits.set(id, player);
        },
        leave(id) {
            const player = playerUnits.get(id);
            if (!player) { return; }
            player.finalize();
            playerUnits.delete(id);
        },
        input(id, vector) {
            playerUnits.get(id)?.setInput(vector);
        },
        count() {
            return playerUnits.size;
        },
    };
}

//----------------------------------------------------------------------------------------------------
// Player — 1 プレイヤー分の状態と自己移動を持つ xnew コンポーネント (Arena の子)
//
// 自分の input ベクトルに従い 'update' で毎フレーム自分の位置を積分する (サーバー権威の物理)。
// setInput で入力を受け取り、snapshot で配信用の最小データを返す。Arena からの finalize で破棄。
//----------------------------------------------------------------------------------------------------

function Player(unit, { id, name, color, x, y }) {
    let posX = x;
    let posY = y;
    let input = { x: 0, y: 0 };
    let lastAt = Date.now();

    unit.on('update', () => {
        const now = Date.now();
        const dt = (now - lastAt) / 1000;
        lastAt = now;

        let vx = input.x;
        let vy = input.y;
        // 斜め移動が √2 倍速くならないよう正規化する。
        if (vx !== 0 && vy !== 0) {
            const inv = 1 / Math.SQRT2;
            vx *= inv;
            vy *= inv;
        }
        posX = clamp(posX + vx * PLAYER_SPEED * dt, PLAYER_RADIUS, FIELD.w - PLAYER_RADIUS);
        posY = clamp(posY + vy * PLAYER_SPEED * dt, PLAYER_RADIUS, FIELD.h - PLAYER_RADIUS);
    });

    return {
        setInput(vector) {
            // 各軸を -1 / 0 / +1 に丸める (不正値対策)。
            input = {
                x: Math.sign(Number(vector?.x) || 0),
                y: Math.sign(Number(vector?.y) || 0),
            };
        },
        snapshot() {
            // 帯域節約のため x/y は整数に丸める (1px 単位で表示には十分)。
            return { id, name, color, x: Math.round(posX), y: Math.round(posY) };
        },
    };
}
