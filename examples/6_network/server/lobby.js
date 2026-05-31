//----------------------------------------------------------------------------------------------------
// 6_network — lobby ワーカー: 静的配信 + ロビー (ルーム一覧/人数) の socket.io
//
// master からハンドオフされた「room 指定なし」の接続を担当する。静的ファイル (public / xnew /
// thirdparty) と、ロビー用 socket.io を提供する。各ルームの人数は room ワーカーから master 経由で
// 届く 'room:count' を集計し、'lobby:rooms' でロビーのクライアントへ配信する。
//
// listen はしない (接続は master から io.httpServer へ注入される)。
//
// - startLobby() : express + socket.io を構築し、setupWorker で接続を受け取る
//----------------------------------------------------------------------------------------------------

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express from 'express';
import { Server as IOServer } from 'socket.io';
import sticky from '@socket.io/sticky';
import { ROOMS } from './shared.js';

const { setupWorker } = sticky;
const __dirname = dirname(fileURLToPath(import.meta.url));

export function startLobby() {
    const app = express();
    app.use(express.static(join(__dirname, '..', 'public')));
    app.use('/xnew', express.static(join(__dirname, '..', '..', 'dist')));
    app.use('/thirdparty', express.static(join(__dirname, '..', '..', 'thirdparty')));

    const httpServer = createServer(app);
    const io = new IOServer(httpServer);
    setupWorker(io); // master からのソケットハンドルを受け取る (listen はしない)

    // roomId -> 人数。room ワーカーからの通知で更新する。
    const counts = new Map(ROOMS.map((r) => [r.id, 0]));
    const roomList = () => ROOMS.map((r) => ({ id: r.id, name: r.name, memberCount: counts.get(r.id) || 0 }));

    // master 経由で各ルームの人数更新を受け取り、ロビー全員へ反映。
    process.on('message', (msg) => {
        if (msg && msg.type === 'room:count') {
            counts.set(msg.roomId, msg.count);
            io.emit('lobby:rooms', { rooms: roomList() });
        }
    });

    io.on('connection', (socket) => {
        socket.emit('lobby:rooms', { rooms: roomList() });
        socket.on('lobby:enter', () => socket.emit('lobby:rooms', { rooms: roomList() }));
    });

    console.log(`[xnew/6_network] lobby worker ready (pid=${process.pid})`);
}
