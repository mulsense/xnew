import xnew from '@mulsense/xnew';
import { World } from './game.js';

//----------------------------------------------------------------------------------------------------
// multi-client（socket.io 版・client 側）— Node サーバーに接続する 1 client（1 ペイン）。
//   別タブ/別ブラウザで開くたびに client が増え、互いの自機が見える。
//   ★ browser-only 版との違いは「use() に渡す transport」と「boot するのは client だけ」という点だけ。
//      ゲーム本体 game.js は無改変（World が mirror/emit('move')/clientId を処理する）。
//----------------------------------------------------------------------------------------------------

const socket = window.io();   // /socket.io/socket.io.js が global io を定義
const stage = document.getElementById('stage');
const status = document.getElementById('status');

socket.once('connect', () => {
    if (status) { status.textContent = `接続: ${socket.id}`; status.className = 'text-green-600'; }
    xnew.sync.use(xnew.sync.socketio(socket));   // ← transport を socket.io に（切り替えはここだけ）
    xnew.boot('client', stage, World);                // boot 後に socket.id が確定 → clientId が使える
});
socket.on('disconnect', () => { if (status) { status.textContent = '切断'; status.className = 'text-red-500'; } });
