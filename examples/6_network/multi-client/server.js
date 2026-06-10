//----------------------------------------------------------------------------------------------------
// multi-client（socket.io 版・server 側）— express で静的配信し、socket.io で実ネットワーク同期する。
//   ロビー + 動的ルーム対応。接続は query.room で 2 系統に分かれる:
//     - ロビー（room 無し）  : ルーム一覧の配信 / ルーム作成
//     - ゲーム（room 付き）   : そのルームの World に参加してプレイ
//   ★ ルームごとに room スコープの transport（xnew.sync.socketio(io, { room })）を作り、その server
//     socket で World を boot するだけ。auto-mirror が io.to(roomId) にだけ broadcast するので、ルーム間
//     で状態が混ざらない。ゲーム本体 game.js は無改変（World は presence 管理・移動のみ）。
//   xnew のティッカーは node でも回る。各ルームの World.update が毎フレーム動く。
//----------------------------------------------------------------------------------------------------

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express from 'express';
import { Server as IOServer } from 'socket.io';
import xnew from '@mulsense/xnew';
import { World } from './game.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const ROOM_NAME_MAX = 16;     // ルーム名の最大長
const MAX_ROOMS = 20;         // 同時ルーム数の上限
const ROOM_GRACE_MS = 3000;   // 空室を掃除するまでの猶予（作成直後の無人や全員退出の保険）

// ---- HTTP + 静的配信 ----
const app = express();
app.use(express.static(__dirname));                                          // index.html / index.js / game.js
app.use('/xnew', express.static(join(__dirname, '..', '..', '..', 'dist')));        // ブラウザ用 @mulsense/xnew
app.use('/thirdparty', express.static(join(__dirname, '..', '..', 'thirdparty')));  // tailwindcss playcdn

const httpServer = createServer(app);
const io = new IOServer(httpServer);

// ---- ルーム台帳: roomId -> { id, name, transport, root, members:Set<socketId>, graceTimer } ----
const rooms = new Map();
let nextRoomNum = 0;

const roomList = () => [...rooms.values()].map((r) => ({ id: r.id, name: r.name, memberCount: r.members.size }));
const notifyLobby = () => io.to('lobby').emit('lobby:rooms', { rooms: roomList() });

function createRoom(rawName) {
    if (rooms.size >= MAX_ROOMS) {
        return { error: 'ルーム数が上限に達しています' };
    }
    const id = `r${++nextRoomNum}`;
    const name = String(rawName || '').trim().slice(0, ROOM_NAME_MAX) || `ルーム ${nextRoomNum}`;

    // ★ ここがルーム対応の肝: room スコープの transport を作り、その server socket で World を boot。
    //   transport は query.room === id の接続だけを扱い、broadcast も io.to(id) に絞る。
    const transport = xnew.sync.socketio(io, { room: id });
    const root = xnew.sync.boot(transport.server, World);   // World は無改変。下りは boot が自動配線
    const room = { id, name, transport, root, members: new Set(), graceTimer: null };

    const scheduleCleanup = () => {
        clearTimeout(room.graceTimer);
        room.graceTimer = setTimeout(() => { if (room.members.size === 0) { removeRoom(id); } }, ROOM_GRACE_MS);
    };
    // 接続/切断で人数を数える（socket.io の connect/disconnect を transport が橋渡し）。
    // World の Player spawn/despawn は boot のディスパッチャが別途 join/disconnect を配るので、ここは台帳だけ。
    transport.server.on('connect', (clientId) => {
        if (!rooms.has(id)) { return; }   // 掃除済みルームへの stale 接続は無視
        clearTimeout(room.graceTimer);
        room.members.add(clientId);
        notifyLobby();
    });
    transport.server.on('disconnect', (clientId) => {
        if (!rooms.has(id)) { return; }
        room.members.delete(clientId);
        notifyLobby();
        if (room.members.size === 0) { scheduleCleanup(); }
    });
    scheduleCleanup();   // 作成直後に誰も来なければ猶予後に掃除（最初の connect で解除）
    rooms.set(id, room);
    notifyLobby();
    return { room };
}

function removeRoom(id) {
    const room = rooms.get(id);
    if (!room) { return; }
    clearTimeout(room.graceTimer);
    rooms.delete(id);
    room.root.finalize();   // World ツリーを破棄（auto-mirror の購読も外れる）
    notifyLobby();
    // 注（example の割り切り）: room スコープの io.on('connection') リスナはアダプタ内に残る。
    //   消滅ルームへの接続は下の guard で弾き、上の connect/disconnect も rooms.has で無視するので無害。
}

// ---- 接続: query.room でロビー / ゲームを判別 ----
io.on('connection', (socket) => {
    const roomId = socket.handshake.query.room;

    if (roomId) {
        // 消滅/不正ルームは弾く（正常ルームは room スコープの transport が処理する）。
        if (!rooms.has(roomId)) {
            socket.emit('room:notfound', { roomId });
            socket.disconnect(true);
        }
        return;
    }

    // ---- ロビー接続 ----
    socket.join('lobby');
    socket.emit('lobby:rooms', { rooms: roomList() });
    socket.on('lobby:enter', () => socket.emit('lobby:rooms', { rooms: roomList() }));
    socket.on('room:create', ({ name } = {}) => {
        const { room, error } = createRoom(name);
        if (error) {
            socket.emit('room:error', { message: error });
            return;
        }
        socket.emit('room:created', { roomId: room.id });   // 作成者はこの roomId で入室する
    });
});

httpServer.listen(PORT, () => {
    console.log(`[multi-client] socket.io server on http://localhost:${PORT}/`);
    console.log('[multi-client] ロビーでルームを作成 → 複数のタブ/ブラウザで同じルームに入ると互いの自機が見えます');
});
