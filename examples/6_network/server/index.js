//----------------------------------------------------------------------------------------------------
// 6_network — サーバーエントリ (cluster の分岐点)
//
// 単一ポート (:3000) を保ちつつ「ルーム毎に別プロセス」を実現する構成 (docs/v0.1/socket.md の C 案)。
// このファイルは node cluster の各プロセスで共通に実行され、役割ごとに分岐する:
//
//   - primary        : master.js  — :3000 を listen し、接続をルーム毎ワーカーへ振り分ける
//   - worker(lobby)   : lobby.js   — 静的配信 + ロビー (ルーム一覧/人数) の socket.io
//   - worker(room=rX) : room.js    — そのルーム専用の socket.io + xnew ゲームループ
//
// クライアントの接続は master が「接続確立時に 1 回だけ」担当ワーカーへソケットハンドルごと渡す。
// 以降のフレームは各ワーカーが直接やり取りするため、master は毎フレームの中継をしない。
//----------------------------------------------------------------------------------------------------

import cluster from 'node:cluster';

if (cluster.isPrimary) {
    const { startMaster } = await import('./master.js');
    startMaster();
} else if (process.env.ROLE === 'lobby') {
    const { startLobby } = await import('./lobby.js');
    startLobby();
} else {
    const { startRoom } = await import('./room.js');
    startRoom(process.env.ROOM_ID);
}
