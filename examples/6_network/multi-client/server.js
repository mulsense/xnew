//----------------------------------------------------------------------------------------------------
// multi-client（socket.io 版・server 側）— express で静的配信し、socket.io で実ネットワーク同期する。
//   ロビー + 動的ルームは addon の xnew.sync.serveRooms に委譲する（ルームごとに room スコープの
//   transport + boot(World) し、人数カウントと空室掃除まで担う）。ゲーム本体 game.js は無改変。
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

// ---- HTTP + 静的配信 ----
const app = express();
app.use(express.static(__dirname));                                          // index.html / index.js / game.js
app.use('/xnew', express.static(join(__dirname, '..', '..', '..', 'dist')));        // ブラウザ用 @mulsense/xnew（addons 含む）
app.use('/thirdparty', express.static(join(__dirname, '..', '..', 'thirdparty')));  // tailwindcss playcdn

const httpServer = createServer(app);
const io = new IOServer(httpServer);

// ★ ロビー + 動的ルームをこの 1 行で配線。ルームごとに socketio(io, { room }) + boot(World) を
//   addon が担い、auto-mirror がそのルームにだけ broadcast する（World は無改変で注入）。
xnew.sync.serveRooms(io, { component: World });

httpServer.listen(PORT, () => {
    console.log(`[multi-client] socket.io server on http://localhost:${PORT}/`);
    console.log('[multi-client] ロビーでルームを作成 → 複数のタブ/ブラウザで同じルームに入ると互いの自機が見えます');
});
