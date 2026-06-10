//----------------------------------------------------------------------------------------------------
// multi-client（socket.io 版・server 側）— express で静的配信し、socket.io で実ネットワーク同期する。
//   ★ browser-only 版との違いは「boot へ渡す transport（xnew.sync.socketio(io)）」と「server を別プロセス
//      (node)で boot する」点だけ。ゲーム本体 game.js は無改変。World は presence 管理・移動のみ（下りの配線は起動側）。
//   xnew のティッカーは node でも回る（socket.io-simple と同じ）。World.update が毎フレーム動く。
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
app.use('/xnew', express.static(join(__dirname, '..', '..', '..', 'dist')));        // ブラウザ用 @mulsense/xnew
app.use('/thirdparty', express.static(join(__dirname, '..', '..', 'thirdparty')));  // tailwindcss playcdn

const httpServer = createServer(app);
const io = new IOServer(httpServer);

// ★ 切り替えはここだけ: loopback の代わりに socket.io アダプタを boot へ渡す。
const transport = xnew.sync.socketio(io);
xnew.sync.boot(transport.server, World);   // World が接続管理・移動を行う。下り(capture→'sync' broadcast)は boot が自動配線

httpServer.listen(PORT, () => {
    console.log(`[multi-client] socket.io server on http://localhost:${PORT}/`);
    console.log('[multi-client] 複数のタブ/ブラウザで開くと互いの自機が見えます');
});
