//----------------------------------------------------------------------------------------------------
// 6_network — master (プライマリ): 単一ポート + 接続のルーム振り分け
//
// :3000 を listen するのはこのプロセスだけ。起動時に lobby ワーカー 1 つと room ワーカー
// (ROOMS 分) を fork し、受け付けた TCP 接続を「最初の HTTP チャンクの ?room=」を見て担当
// ワーカーへ OS ソケットハンドルごと渡す (worker.send(msg, socket))。渡した後はワーカーが
// クライアントと直接やり取りするので、master はフレーム毎の中継をしない。
//
// 受け取り側 (ワーカー) は @socket.io/sticky の setupWorker が処理する。master 側の振り分けは
// sid 単位ではなく room 単位にしたいため、setupMaster は使わず最小限を自前実装している。
//
// - startMaster() : ワーカー fork + ルーティング + 異常終了時の再 fork を起動
//----------------------------------------------------------------------------------------------------

import cluster from 'node:cluster';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { ROOMS } from './shared.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const randomId = () => randomBytes(8).toString('hex');

export function startMaster() {
    // workerId -> { role, roomId }  (異常終了時に同じ役割で再 fork するため)
    const meta = new Map();
    const roomToWorkerId = new Map();
    let lobbyWorkerId = null;

    const forkLobby = () => {
        const worker = cluster.fork({ ROLE: 'lobby' });
        meta.set(worker.id, { role: 'lobby' });
        lobbyWorkerId = worker.id;
    };
    const forkRoom = (roomId) => {
        const worker = cluster.fork({ ROLE: 'room', ROOM_ID: roomId });
        meta.set(worker.id, { role: 'room', roomId });
        roomToWorkerId.set(roomId, worker.id);
    };

    forkLobby();
    for (const room of ROOMS) {
        forkRoom(room.id);
    }

    // ワーカーが落ちたら同じ役割で再 fork (簡易リスポーン)。
    cluster.on('exit', (worker) => {
        const m = meta.get(worker.id);
        meta.delete(worker.id);
        if (!m) { return; }
        console.warn(`[master] worker exited (role=${m.role} room=${m.roomId ?? '-'}). respawning...`);
        if (m.role === 'lobby') { forkLobby(); }
        else { forkRoom(m.roomId); }
    });

    // ---- 接続ルーティング (room 単位) ----
    const sidToWorker = new Map();           // socket.io の再接続を同じワーカーへ寄せる保険
    const sidRegex = /sid=([\w-]{20})/;
    const roomRegex = /[?&]room=([\w-]+)/;

    const pickWorkerId = (data) => {
        const sid = sidRegex.exec(data);
        if (sid) {
            const workerId = sidToWorker.get(sid[1]);
            if (workerId && cluster.workers[workerId]) { return workerId; }
        }
        const room = roomRegex.exec(data);
        if (room) {
            const workerId = roomToWorkerId.get(room[1]);
            if (workerId && cluster.workers[workerId]) { return workerId; }
        }
        // room 指定なし (静的配信 / ロビー socket) は lobby ワーカーへ。
        return lobbyWorkerId;
    };

    const httpServer = createServer();

    httpServer.on('connection', (socket) => {
        let workerId;
        let connectionId;

        socket.on('data', (buffer) => {
            const data = buffer.toString();

            // 既に振り分け済みで、複数チャンクを引き継ぐ接続なら後続チャンクを転送。
            if (workerId && connectionId) {
                cluster.workers[workerId]?.send({ type: 'sticky:http-chunk', data, connectionId });
                return;
            }

            workerId = pickWorkerId(data);
            const head = data.substring(0, data.indexOf('\r\n\r\n')).toLowerCase();
            const mayHaveMultipleChunks = head.includes('content-length:') || head.includes('transfer-encoding:');
            if (mayHaveMultipleChunks) { connectionId = randomId(); }

            const target = cluster.workers[workerId];
            if (!target) { socket.destroy(); return; }
            // ソケットハンドルごとワーカーへ委譲。keepOpen=false なら master からは切り離される。
            target.send(
                { type: 'sticky:connection', data, connectionId },
                socket,
                { keepOpen: mayHaveMultipleChunks },
                (err) => { if (err) { socket.destroy(); } },
            );
        });
    });

    // HTTP ボディの終端を正しく検出させるため (sticky と同じおまじない)。
    httpServer.on('request', (req) => { req.on('data', () => {}); });

    // ワーカー -> master のメッセージ。sid マップ更新と、人数のロビーへの中継。
    cluster.on('message', (worker, msg) => {
        if (!msg || typeof msg !== 'object') { return; }
        if (msg.type === 'sticky:connection') {
            sidToWorker.set(msg.data, worker.id);
        } else if (msg.type === 'sticky:disconnection') {
            sidToWorker.delete(msg.data);
        } else if (msg.type === 'room:count') {
            cluster.workers[lobbyWorkerId]?.send({ type: 'room:count', roomId: msg.roomId, count: msg.count });
        }
    });

    httpServer.listen(PORT, () => {
        console.log(`[xnew/6_network] master listening on http://localhost:${PORT} (pid=${process.pid})`);
        console.log(`[xnew/6_network] rooms=[${ROOMS.map((r) => r.id).join(', ')}] — each room runs in its own process`);
    });
}
