import xnew from '@mulsense/xnew';
import { World } from './game.js';

//----------------------------------------------------------------------------------------------------
// multi-client（browser-only / loopback）— 1 ブラウザ内に 2 client + 1 server を同居させた擬似版。
//   socket を渡さず boot するだけ（in-memory loopback）。server も client も同一プロセスで boot し、入力の
//   上り（move）と状態の下り（sync）はインメモリで配線される。
//   ★ socket.io 版に切り替えるには：boot に { mode, socket } で socket.io の socket を渡し、server を別
//      プロセス(node)に出すだけ。ゲーム本体 game.js は無改変（→ index.js / server.js 参照）。
//----------------------------------------------------------------------------------------------------

const stage = document.getElementById('stage');

// 状態のやり取りは boot が配線する: server=capture→broadcast / client=apply。socket 省略で in-memory loopback。
const server = xnew.sync.boot({ mode: 'server' }, World);     // 擬似サーバー（1 つ）
const left = xnew.sync.boot({ mode: 'client' }, stage, World); // 擬似クライアント（左ペイン）
xnew.sync.boot({ mode: 'client' }, stage, World);             // 擬似クライアント（右ペイン）
left.select();                                  // 左ペインを初期選択（クリックで切替）

// （デバッグ）server の state tree を表示
const stateView = document.getElementById('state');
xnew(function StateView(unit) {
    unit.on('update', () => { stateView.textContent = JSON.stringify(xnew.sync.capture(server), null, 2); });
});
