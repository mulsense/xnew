//----------------------------------------------------------------------------------------------------
// multi-client（socket.io 版・server 側）— express で静的配信し、socket.io で実ネットワーク同期する。
//   ロビー + 動的ルームの配線は xnew.basics.Lobby に一任する（io.on('connection') の所有、ルーム台帳・
//   作成・一覧配信・人数計数・空室掃除・入室検証まで内蔵）。利用側は io と部屋の中身 Component(World) を
//   渡すだけ。Node 実行なので mode は server に自動判定される。ゲーム本体 game.js は無改変。
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

// ---- ロビー + 動的ルーム（xnew.basics.Lobby が全部やる） ----
xnew(xnew.basics.Lobby, { socket: io, Component: World });

httpServer.listen(PORT, () => {
    console.log(`[multi-client] socket.io server on http://localhost:${PORT}/`);
    console.log('[multi-client] ロビーでルームを作成 → 複数のタブ/ブラウザで同じルームに入ると互いの自機が見えます');
});
