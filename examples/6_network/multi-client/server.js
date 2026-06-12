//----------------------------------------------------------------------------------------------------
// multi-client（socket.io 版・server 側）— express で静的配信し、socket.io で実ネットワーク同期する。
//   ロビー + 動的ルームをこのファイルで配線する（素の socket.io）。部屋ごとに room スコープの transport を
//   作り、共有 component World を Room（= xnew.basics.Room）で boot する。Room は server/client 対称な
//   「1部屋」プリミティブで、ここでは server socket（transport.server）を渡して server ツリーを起こす。
//   人数カウントと空室掃除はこのファイルの台帳で行う。ゲーム本体 game.js は無改変。
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

// ---- HTTP + 静的配信 ----
const app = express();
app.use(express.static(__dirname));                                          // index.html / index.js / game.js
app.use('/xnew', express.static(join(__dirname, '..', '..', '..', 'dist')));        // ブラウザ用 @mulsense/xnew（addons 含む）
app.use('/thirdparty', express.static(join(__dirname, '..', '..', 'thirdparty')));  // tailwindcss playcdn

const httpServer = createServer(app);
const io = new IOServer(httpServer);

// ---- ロビー + 動的ルーム（素の socket.io 配線） ----
const MAX_ROOMS = 20;
const ROOM_NAME_MAX = 16;
const GRACE_MS = 3000;   // 作成直後の無人 / 全員退出から掃除までの猶予

const rooms = new Map();   // id → { id, name, transport, unit, members:Set<clientId>, graceTimer }
let nextRoomNum = 0;

const roomList = () => [...rooms.values()].map((r) => ({ id: r.id, name: r.name, memberCount: r.members.size }));
const notifyLobby = () => io.to('lobby').emit('lobby:rooms', { rooms: roomList() });

function createRoom(rawName) {
    if (rooms.size >= MAX_ROOMS) {
        return { error: 'ルーム数が上限に達しています' };
    }
    const id = `r${++nextRoomNum}`;
    const name = String(rawName || '').trim().slice(0, ROOM_NAME_MAX) || `Room ${nextRoomNum}`;

    // room スコープ transport を作り、その server socket で World を Room として boot する。
    // Room（server 分岐）が transport.server を xnew.sync.boot へ渡し、auto-mirror がこのルームへ broadcast する。
    const transport = xnew.sync.socketio(io, { room: id });
    const unit = xnew(xnew.basics.Room, { socket: transport.server, component: World });
    const room = { id, name, transport, unit, members: new Set(), graceTimer: null };

    const scheduleCleanup = () => {
        if (room.graceTimer !== null) { clearTimeout(room.graceTimer); }
        room.graceTimer = setTimeout(() => { if (room.members.size === 0) { removeRoom(id); } }, GRACE_MS);
    };
    // 接続 / 切断で人数を数える（spawn/despawn は boot のディスパッチャが配るので、ここは台帳だけ）。
    transport.server.on('connect', (clientId) => {
        if (!rooms.has(id)) { return; }   // 掃除済みルームへの stale 接続は無視
        if (room.graceTimer !== null) { clearTimeout(room.graceTimer); }
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
    if (room === undefined) { return; }
    if (room.graceTimer !== null) { clearTimeout(room.graceTimer); }
    rooms.delete(id);
    room.unit.finalize();   // Room の finalize が booted root（World server ツリー）を畳む
    notifyLobby();
    // 注: room スコープの io.on('connection') リスナは残るが、消滅ルームへの接続は guard で弾くので無害。
}

io.on('connection', (socket) => {
    const roomId = socket.handshake?.query?.room;

    if (roomId) {
        // 消滅 / 不正ルームは弾く（正常ルームは room スコープの transport が処理）。
        if (!rooms.has(roomId)) {
            socket.emit('room:notfound', { roomId });
            socket.disconnect(true);
        }
        return;
    }

    // ---- ロビー接続（room 無し） ----
    socket.join('lobby');
    socket.emit('lobby:rooms', { rooms: roomList() });
    socket.on('lobby:enter', () => socket.emit('lobby:rooms', { rooms: roomList() }));
    socket.on('room:create', ({ name } = {}) => {
        const { room, error } = createRoom(name ?? '');
        if (error !== undefined) {
            socket.emit('room:error', { message: error });
            return;
        }
        socket.emit('room:created', { roomId: room.id });
    });
});

httpServer.listen(PORT, () => {
    console.log(`[multi-client] socket.io server on http://localhost:${PORT}/`);
    console.log('[multi-client] ロビーでルームを作成 → 複数のタブ/ブラウザで同じルームに入ると互いの自機が見えます');
});
