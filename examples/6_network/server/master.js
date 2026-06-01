//----------------------------------------------------------------------------------------------------
// 6_network — master (プライマリ): 単一ポート + 接続のルーム振り分け + ルームの動的管理
//
// :3000 を listen するのはこのプロセスだけ。起動時は lobby ワーカーのみ fork し、ルームは 0。
// ロビーからの 'room:create' で room ワーカーを動的に fork し、空室 (人数 0) になったらその
// プロセスを破棄する。ルーム台帳 (id/name/人数/担当ワーカー) の正本は master が持ち、変化の
// たびに lobby ワーカーへ一覧を push する。
//
// 接続は確立時に 1 回だけ「最初の HTTP チャンクの ?room=」を見て担当ワーカーへソケットハンドル
// ごと委譲する。以降のフレームは master を通らない (フレーム中継なし)。受け取り側は
// @socket.io/sticky の setupWorker。room 単位の振り分けだけ master 側で自前実装している。
//
// - startMaster() : lobby fork + ルーティング + ルームの作成/破棄/再 fork を起動
//----------------------------------------------------------------------------------------------------

import cluster from 'node:cluster';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const randomId = () => randomBytes(8).toString('hex');

const ROOM_NAME_MAX = 16;
const MAX_ROOMS = 16;          // fork 暴走の安全弁
const ROOM_GRACE_MS = 30000;   // 作成後この時間 join が無ければ空き部屋を破棄

export function startMaster() {
    // roomId -> { id, name, workerId, count, ready, reqId, graceTimer }
    const rooms = new Map();
    let nextRoomNum = 0;

    // workerId -> { role, roomId }  (異常終了時の判定用)
    const meta = new Map();
    let lobbyWorkerId = null;

    const forkLobby = () => {
        const worker = cluster.fork({ ROLE: 'lobby' });
        meta.set(worker.id, { role: 'lobby' });
        lobbyWorkerId = worker.id;
    };
    forkLobby();

    const sendToLobby = (msg) => cluster.workers[lobbyWorkerId]?.send(msg);
    // 一覧に載せるのは ready (起動完了) なルームだけ。
    const roomList = () => [...rooms.values()]
        .filter((r) => r.ready)
        .map((r) => ({ id: r.id, name: r.name, memberCount: r.count }));
    const pushRooms = () => sendToLobby({ type: 'rooms', rooms: roomList() });

    const createRoom = (rawName, reqId) => {
        if (rooms.size >= MAX_ROOMS) {
            sendToLobby({ type: 'room:error', reqId, message: 'ルーム数が上限に達しています' });
            return;
        }
        const id = `r${++nextRoomNum}`;
        const name = String(rawName || '').trim().slice(0, ROOM_NAME_MAX) || `ルーム ${nextRoomNum}`;
        const worker = cluster.fork({ ROLE: 'room', ROOM_ID: id, ROOM_NAME: name });
        meta.set(worker.id, { role: 'room', roomId: id });
        // 作成者が来ない空き部屋を掃除するためのタイマー (join が来たら解除)。
        const graceTimer = setTimeout(() => {
            if (rooms.get(id)?.count === 0) { removeRoom(id); }
        }, ROOM_GRACE_MS);
        rooms.set(id, { id, name, workerId: worker.id, count: 0, ready: false, reqId, graceTimer });
    };

    const removeRoom = (roomId) => {
        const room = rooms.get(roomId);
        if (!room) { return; }
        clearTimeout(room.graceTimer);
        rooms.delete(roomId);
        cluster.workers[room.workerId]?.kill();
        pushRooms();
    };

    // ワーカー終了時。lobby は再 fork、room は (クラッシュなら) 台帳から除去。
    cluster.on('exit', (worker) => {
        const m = meta.get(worker.id);
        meta.delete(worker.id);
        if (!m) { return; }
        if (m.role === 'lobby') {
            console.warn('[master] lobby worker exited. respawning...');
            forkLobby();
        } else {
            const room = rooms.get(m.roomId);
            if (room && room.workerId === worker.id) {
                clearTimeout(room.graceTimer);
                rooms.delete(m.roomId);
                pushRooms();
            }
        }
    });

    // ---- 接続ルーティング (room 単位) ----
    const sidToWorker = new Map();
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
            const workerId = rooms.get(room[1])?.workerId;
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
            target.send(
                { type: 'sticky:connection', data, connectionId },
                socket,
                { keepOpen: mayHaveMultipleChunks },
                (err) => { if (err) { socket.destroy(); } },
            );
        });
    });

    httpServer.on('request', (req) => { req.on('data', () => {}); });

    cluster.on('message', (worker, msg) => {
        if (!msg || typeof msg !== 'object') { return; }
        switch (msg.type) {
            case 'sticky:connection':
                sidToWorker.set(msg.data, worker.id);
                break;
            case 'sticky:disconnection':
                sidToWorker.delete(msg.data);
                break;
            case 'room:create':
                createRoom(msg.name, msg.reqId);
                break;
            case 'room:ready': {
                // room ワーカーの起動完了。ここで初めて一覧に載せ、作成者へ通知する
                // (= クライアントが接続するときには必ずワーカーが受け入れ可能)。
                const room = rooms.get(msg.roomId);
                if (!room) { break; }
                room.ready = true;
                sendToLobby({ type: 'room:created', reqId: room.reqId, room: { id: room.id, name: room.name } });
                pushRooms();
                break;
            }
            case 'room:count': {
                const room = rooms.get(msg.roomId);
                if (!room) { break; }
                room.count = msg.count;
                if (msg.count > 0) {
                    clearTimeout(room.graceTimer);
                    pushRooms();
                } else {
                    // 空室になったらプロセスごと破棄。
                    removeRoom(msg.roomId);
                }
                break;
            }
        }
    });

    httpServer.listen(PORT, () => {
        console.log(`[xnew/6_network] master listening on http://localhost:${PORT} (pid=${process.pid})`);
        console.log('[xnew/6_network] no rooms yet — create one from the lobby (each room runs in its own process)');
    });
}
