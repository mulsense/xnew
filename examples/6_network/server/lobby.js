//----------------------------------------------------------------------------------------------------
// 6_network — lobby ワーカー: 静的配信 + ロビー (ルーム一覧/作成) の socket.io
//
// master からハンドオフされた「room 指定なし」の接続を担当する。静的ファイル (public / xnew /
// thirdparty) と、ロビー用 socket.io を提供する。ルーム台帳は master が持つので、ここはその最新
// 一覧 (master から届く 'rooms') をミラーして配信し、作成要求 (room:create) を master へ中継する。
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

    let rooms = []; // master から届く最新のルーム一覧 [{id,name,memberCount}]

    process.on('message', (msg) => {
        if (!msg || typeof msg !== 'object') { return; }
        if (msg.type === 'rooms') {
            rooms = msg.rooms;
            io.emit('lobby:rooms', { rooms });
        } else if (msg.type === 'room:created') {
            // 作成を要求した socket にだけ、入るべきルーム id を返す。
            io.to(msg.reqId).emit('room:created', { roomId: msg.room.id });
        } else if (msg.type === 'room:error') {
            io.to(msg.reqId).emit('room:error', { message: msg.message });
        }
    });

    io.on('connection', (socket) => {
        socket.emit('lobby:rooms', { rooms });
        socket.on('lobby:enter', () => socket.emit('lobby:rooms', { rooms }));
        // ルーム作成は master だけが fork できるので中継する (reqId = 返信先 socket)。
        socket.on('room:create', ({ name } = {}) => {
            process.send?.({ type: 'room:create', name, reqId: socket.id });
        });
    });

    console.log(`[xnew/6_network] lobby worker ready (pid=${process.pid})`);
}
