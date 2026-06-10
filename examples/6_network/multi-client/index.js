import xnew from '@mulsense/xnew';
import { World } from './game.js';

//----------------------------------------------------------------------------------------------------
// multi-client（socket.io 版・client 側）— Node サーバーに接続する 1 client（1 ペイン）。
//   別タブ/別ブラウザで開くたびに client が増え、互いの自機が見える。
//   ★ browser-only 版との違いは「boot へ渡す transport」と「boot するのは client だけ」という点だけ。
//      ゲーム本体 game.js は無改変（World が mirror/emit('move')/clientId を処理する）。
//----------------------------------------------------------------------------------------------------

const socket = window.io();   // /socket.io/socket.io.js が global io を定義
const stage = document.getElementById('stage');
const status = document.getElementById('status');

socket.once('connect', () => {
    if (status) { status.textContent = `接続: ${socket.id}`; status.className = 'text-green-600'; }
    const transport = xnew.sync.socketio(socket);   // ← transport を socket.io に（切り替えはここだけ）
    const client = xnew.sync.boot('client', transport, stage, World); // boot 後に socket.id が確定 → clientId が使える
    // 状態のやり取り（下り: server の 'sync' を apply）は boot が自動配線する。
    client.select();                                  // このタブの 1 ペインを初期選択（すぐ操作できる）
});
socket.on('disconnect', () => { if (status) { status.textContent = '切断'; status.className = 'text-red-500'; } });
