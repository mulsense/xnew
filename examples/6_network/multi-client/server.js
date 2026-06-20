//----------------------------------------------------------------------------------------------------
// multi-client（socket.io 版・server 側）— express で静的配信し、socket.io で実ネットワーク同期する。
//   ロビー + 動的ルームを xnew コンポーネントとして配線する:
//     - Lobby : xnew.basics.Lobby を extend（io.on('connection') を所有）し、ルーム台帳 + 作成 / 一覧 / 入室検証を持つ。
//     - Room  : xnew.basics.Room を extend し、部屋ごとに共有 component World の server ツリーを起こす。
//               人数カウントと空室掃除（GRACE_MS）を持つ。
//   Node 実行なので mode は server に自動判定される。ゲーム本体 game.js は無改変。
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

// ---- ロビー + 動的ルームの方針 ----
const MAX_ROOMS = 20;
const ROOM_NAME_MAX = 16;
const GRACE_MS = 3000;   // 作成直後の無人 / 全員退出から掃除までの猶予

//----------------------------------------------------------------------------------------------------
// Room — 1 部屋。xnew.basics.Room を extend して World の server ツリーを起こし、人数台帳と空室掃除を持つ。
//   connect/disconnect は xnew.basics.Room（boot）が unit.on へ { id } 付きで配る。人数が変われば Lobby に
//   一覧の再配信を頼み（lobby.notify）、無人になれば猶予後に Lobby へ自身の撤去を頼む（lobby.remove）。
//----------------------------------------------------------------------------------------------------
function Room(unit, { id, name }) {
    xnew.extend(xnew.basics.Room, { socket: io, room: id, Component: World });
    const lobby = xnew.context(Lobby);
    const members = new Set();
    let graceTimer = null;

    const clearGrace = () => { if (graceTimer !== null) { clearTimeout(graceTimer); graceTimer = null; } };
    const scheduleCleanup = () => {
        clearGrace();
        graceTimer = setTimeout(() => { if (members.size === 0) { lobby.remove(id); } }, GRACE_MS);
    };

    unit.on('connect', ({ id: clientId }) => { clearGrace(); members.add(clientId); lobby.notify(); });
    unit.on('disconnect', ({ id: clientId }) => {
        members.delete(clientId);
        lobby.notify();
        if (members.size === 0) { scheduleCleanup(); }
    });
    unit.on('finalize', clearGrace);
    scheduleCleanup();   // 作成直後に誰も来なければ猶予後に掃除（最初の connect で解除）

    return {
        get id() { return id; },
        get name() { return name; },
        get memberCount() { return members.size; },
    };
}

//----------------------------------------------------------------------------------------------------
// Lobby — ロビー。xnew.basics.Lobby を extend（io.on('connection') を所有）し、ルーム台帳と配線を持つ。
//   xnew.basics.Lobby が接続を '-event'（接続 socket 付き）で配るので、ここでルーム一覧の返信 / 作成 /
//   入室検証を行う。ルームは Lobby の子として mount するので、Room から xnew.context(Lobby) で辿れる。
//----------------------------------------------------------------------------------------------------
function Lobby(unit) {
    const lobby = xnew.extend(xnew.basics.Lobby, { socket: io });
    const rooms = new Map();   // id → Room unit（id/name/memberCount を公開）
    let nextRoomNum = 0;

    const roomList = () => [...rooms.values()].map((r) => ({ id: r.id, name: r.name, memberCount: r.memberCount }));
    const broadcastRooms = () => lobby.broadcast('lobby:rooms', { rooms: roomList() });

    const create = (rawName) => {
        if (rooms.size >= MAX_ROOMS) { return { error: 'ルーム数が上限に達しています' }; }
        const id = `r${++nextRoomNum}`;
        const name = String(rawName || '').trim().slice(0, ROOM_NAME_MAX) || `Room ${nextRoomNum}`;
        rooms.set(id, xnew(unit, Room, { id, name }));   // Lobby の子として mount（context(Lobby) が解決できる）
        broadcastRooms();
        return { roomId: id };
    };

    // ロビー接続: 現在のルーム一覧を返す（接続直後 / lobby:enter 要求）。
    unit.on('-connect', ({ socket }) => socket.emit('lobby:rooms', { rooms: roomList() }));
    unit.on('-lobby:enter', ({ socket }) => socket.emit('lobby:rooms', { rooms: roomList() }));
    unit.on('-room:create', ({ socket, name }) => {
        const { roomId, error } = create(name ?? '');
        if (error !== undefined) { socket.emit('room:error', { message: error }); return; }
        socket.emit('room:created', { roomId });
    });
    // ルーム接続: 消滅 / 不正ルームは弾く（有効ルームは Room の boot 配線が処理する）。
    unit.on('-room:connect', ({ socket, roomId }) => {
        if (rooms.has(roomId)) { return; }
        socket.emit('room:notfound', { roomId });
        socket.disconnect(true);
    });

    return {
        notify() { broadcastRooms(); },   // Room の人数変化で一覧を再配信
        remove(id) {                      // 空室掃除: Room を畳んで台帳から外し、一覧を再配信
            const room = rooms.get(id);
            if (room === undefined) { return; }
            rooms.delete(id);
            room.finalize();   // Room の finalize が booted root（World server ツリー）を畳む
            broadcastRooms();
        },
    };
}

xnew(Lobby);

httpServer.listen(PORT, () => {
    console.log(`[multi-client] socket.io server on http://localhost:${PORT}/`);
    console.log('[multi-client] ロビーでルームを作成 → 複数のタブ/ブラウザで同じルームに入ると互いの自機が見えます');
});
