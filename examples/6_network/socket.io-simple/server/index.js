//----------------------------------------------------------------------------------------------------
// 6_network — サーバーエントリ (α: 単一プロセス・論理ルーム + ゲームプラグイン方式)
//
// express で静的配信し、socket.io の room 機能で「論理ルーム」を表現する。ゲーム固有ロジックは
// games/*.js のプラグインに委譲し、ネット層 (Room / 配信 / ロビー) は汎用。各ルームは同一プロセス
// 内で並走し、状態はそのルームの socket.io ルームにだけ配信する。ルームは動的に作成/破棄する。
//
// 接続は 2 系統 (クライアントの query.room で判別):
//   - ロビー : query.room 無し → ルーム一覧/作成
//   - ゲーム : query.room あり → そのルームに参加してプレイ
//
// 同期の考え方 (サーバー権威) は ../../../../WebGame/socketio を参考。
//----------------------------------------------------------------------------------------------------

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express from 'express';
import { Server as IOServer } from 'socket.io';

import { PORT, ROOM_NAME_MAX, MAX_ROOMS } from './config.js';
import { RoomRegistry } from './registry.js';
import { Room } from './room.js';
import { loadGames } from './games/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const games = await loadGames();
const registry = new RoomRegistry();

// ---- HTTP + 静的配信 ----
const app = express();
app.use(express.static(join(__dirname, '..', 'public')));
app.use('/xnew', express.static(join(__dirname, '..', '..', '..', '..', 'dist')));
app.use('/thirdparty', express.static(join(__dirname, '..', '..', '..', 'thirdparty')));

const httpServer = createServer(app);
const io = new IOServer(httpServer);

let nextRoomNum = 0;

function createRoom(gameType, rawName) {
    if (registry.size() >= MAX_ROOMS) {
        return { error: 'ルーム数が上限に達しています' };
    }
    const game = games.get(gameType);
    if (!game) {
        return { error: '不明なゲーム種別です' };
    }
    const id = `r${++nextRoomNum}`;
    const name = String(rawName || '').trim().slice(0, ROOM_NAME_MAX) || `ルーム ${nextRoomNum}`;
    const room = new Room({
        id,
        name,
        gameType,
        game: game.create(),
        io,
        onMembersChanged: () => registry.notifyChange(),
        onEmpty: (roomId) => registry.remove(roomId),
    });
    registry.add(room);
    return { room };
}

// 台帳が変化したらロビーへ最新一覧を配信。
registry.onChange((rooms) => io.to('lobby').emit('lobby:rooms', { rooms }));

io.on('connection', (socket) => {
    const roomId = socket.handshake.query.room;

    if (roomId) {
        // ---- ゲーム接続 ----
        const room = registry.get(roomId);
        if (!room) {
            socket.emit('room:notfound', { roomId });
            socket.disconnect(true);
            return;
        }
        socket.join(room.id);
        socket.emit('welcome', {
            id: socket.id,
            roomId: room.id,
            roomName: room.name,
            gameType: room.gameType,
            ...room.welcomeData(),
        });
        socket.on('join', (info) => room.join(socket.id, info ?? {}));
        socket.on('input', (message) => room.input(socket.id, message));
        socket.on('disconnect', () => registry.get(roomId)?.leave(socket.id));
        return;
    }

    // ---- ロビー接続 ----
    socket.join('lobby');
    socket.emit('games', { games: [...games.values()].map((g) => ({ id: g.id, name: g.name })) });
    socket.emit('lobby:rooms', { rooms: registry.list() });
    socket.on('lobby:enter', () => socket.emit('lobby:rooms', { rooms: registry.list() }));
    socket.on('room:create', ({ name, gameType } = {}) => {
        const { room, error } = createRoom(gameType || 'metaverse', name);
        if (error) {
            socket.emit('room:error', { message: error });
            return;
        }
        socket.emit('room:created', { roomId: room.id });
    });
});

httpServer.listen(PORT, () => {
    console.log(`[xnew/6_network] listening on http://localhost:${PORT}`);
    console.log(`[xnew/6_network] single process, logical rooms | games: [${[...games.keys()].join(', ')}]`);
});
