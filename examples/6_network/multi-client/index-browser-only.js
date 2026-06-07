import xnew from '@mulsense/xnew';
import { World } from './game.js';

//----------------------------------------------------------------------------------------------------
// multi-client（browser-only / loopback）— 1 ブラウザ内に 2 client + 1 server を同居させた擬似版。
//   transport に loopback を使うだけ。server も client も同一プロセスで boot し、入力の上り（move）と
//   状態の下り（sync）は loopback がインメモリで配線する。
//   ★ これを socket.io 版に切り替えるには：loopback の代わりに xnew.sync.socketio(socket) を use() し、
//      server を別プロセス(node)に出すだけ。ゲーム本体 game.js は無改変（→ index.js / server.js 参照）。
//----------------------------------------------------------------------------------------------------

xnew.sync.use(xnew.sync.loopback());           // ← transport を差し替えれば実ネットワークになる
const stage = document.getElementById('stage');

const server = xnew.boot('server', World);     // 擬似サーバー（1 つ）
xnew.boot('client', stage, World);             // 擬似クライアント（左ペイン）
xnew.boot('client', stage, World);             // 擬似クライアント（右ペイン）

// （デバッグ）server の state tree を表示
const stateView = document.getElementById('state');
xnew(function StateView(unit) {
    unit.on('update', () => { stateView.textContent = JSON.stringify(xnew.sync.capture(server), null, 2); });
});
