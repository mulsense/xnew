//----------------------------------------------------------------------------------------------------
// Sync — socket.io を使う basics コンポーネント（Lobby / Room）
//
// どちらも「生の socket.io socket / io を 1 つ受け取り、host unit に配線する」基底コンポーネント。
// extend して使い、socket の所有権（finalize での後始末）を引き受ける。
//   - Lobby : 状態同期なし。socket の受信を host unit へ '-event' で配る（ロビー等）。
//   - Room  : 状態同期あり。xnew.sync.boot で共有 component を起こし、capture/apply まで配線する。
// どちらも server/client は実行環境で決まる（→ core/env。両対応）。
//
// - Lobby(unit, { socket }) : 受信を unit.on('-<event>') へ転送する。
//     - client : lobby:enter を時間差で自動送信 / create(name) を公開 / finalize で socket を切断
//     - server : io.on('connection') を所有し、ロビー / ルーム接続を '-event'（socket 付き）で host へ配る / broadcast() を公開
// - Room(unit, { socket, room?, name?, Component }) : socket で Component を boot し `{ client }`（boot ルート）を返す
//
// Example (Lobby / client・ブラウザ):
//   const socket = io({ forceNew: true });
//   const lobby = xnew.extend(xnew.basics.Lobby, { socket });   // lobby:enter は自動(時間差)送信
//   unit.on('-connect', () => setStatus('ロビー'));
//   unit.on('-lobby:rooms', ({ rooms }) => render(rooms));
//   lobby.create('my room');   // = socket.emit('room:create', { name })
//
// Example (Lobby / server・Node):
//   const lobby = xnew.extend(xnew.basics.Lobby, { socket: io });   // io.on('connection') を所有
//   unit.on('-connect', ({ socket }) => socket.emit('lobby:rooms', { rooms }));          // ロビー接続
//   unit.on('-room:create', ({ socket, name }) => { ...; socket.emit('room:created', { roomId }); });
//   unit.on('-room:connect', ({ socket, roomId }) => { if (unknown) socket.emit('room:notfound', { roomId }); });
//   lobby.broadcast('lobby:rooms', { rooms });   // = io.to('lobby').emit(...)
//
// Example (Room / client・ブラウザ):
//   const socket = io({ query: { room: roomId }, forceNew: true });
//   xnew.extend(xnew.basics.Room, { socket, name: 'Alice', Component: World });
//   unit.on('connect', () => setStatus(`room ${roomId}: ${socket.id}`));
//   unit.on('room:notfound', () => unit.change(LobbyScene));
// Example (Room / server・Node):
//   const roomUnit = xnew(xnew.basics.Room, { socket: io, room: roomId, Component: World });
//   roomUnit.on('connect', ({ id }) => members.add(id));   // 空室掃除で roomUnit.finalize()
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { getEnvironment } from '../core/env';
import { sync, BootOptions } from '../utils/sync';

// socket.io の onAny は connect/disconnect を含まないため、基本イベントは明示的に拾う。
const BASIC_EVENTS = ['connect', 'disconnect'] as const;

/** 受信を host unit の '-event' へ転送するクロージャを作る（emit を unit スコープで走らせるため scope で包む）。 */
function lobbyForwarder() {
    return xnew.scope((event: string, payload: any) => {
        xnew.emit('-' + event, (payload !== null && typeof payload === 'object') ? payload : {});
    });
}

/**
 * Lobby — ロビー接続を xnew コンポーネント化する基底。Room 同様 server/client を実行環境で分ける。
 * どちらも socket の受信を host unit へ '-event' で配る（host は unit.on('-connect' / '-room:create' など で受け取る）。
 *   - client : 生 socket。create(name)（room:create を emit）を公開、入室一覧の要求 lobby:enter を host の
 *              リスナ登録後に（時間差で）自動送信、finalize で socket を切断する。
 *   - server : io。io.on('connection') を所有し、ロビー / ルーム接続を host へ '-event'（接続 socket 付き）で配り、
 *              broadcast(event, payload) を公開（io.to('lobby').emit）。finalize で connection リスナを外す。
 */
export function Lobby(unit: Unit, { socket }: { socket: any }) {
    return getEnvironment() === 'server' ? serverLobby(unit, socket) : clientLobby(unit, socket);
}

/** client（ブラウザ）側 Lobby。受信を '-event' で host へ転送 + create/lobby:enter + finalize 切断。 */
function clientLobby(unit: Unit, socket: any) {
    const forward = lobbyForwarder();
    const anyHandler = (event: string, payload: any) => forward(event, payload);
    const basicHandlers = BASIC_EVENTS.map((event) => [event, (payload: any) => forward(event, payload)] as const);

    socket.onAny(anyHandler);
    basicHandlers.forEach(([event, handler]) => socket.on(event, handler));
    unit.on('finalize', () => {
        // 先にハンドラを外してから切断（切断時の '-disconnect' 転送がシーン遷移に被らないように）。
        socket.offAny?.(anyHandler);
        basicHandlers.forEach(([event, handler]) => socket.off?.(event, handler));
        socket.disconnect?.();
    });

    // 入室一覧の要求は、host が unit.on('-lobby:rooms') を登録し終えてから（時間差で）送る。
    xnew.timeout(() => socket.emit('lobby:enter'));

    return {
        create(name: string) { socket.emit('room:create', { name }); },
    };
}

/**
 * server（Node）側 Lobby。io.on('connection') を所有し、接続を host へ '-event'（接続 socket 付き）で配る。
 *   - ルーム接続（query.room あり）: '-room:connect' { socket, roomId }（有効性判定は host の責務）。
 *   - ロビー接続（query.room なし）: 'lobby' room に join → '-connect' { socket }、以降 lobby:enter /
 *     room:create / disconnect を '-event' で転送。
 * host は受け取った socket へ直接返信し、全体配信は broadcast(event, payload) を使う。
 */
function serverLobby(unit: Unit, io: any) {
    const forward = lobbyForwarder();

    const onConnection = (socket: any) => {
        const roomId = socket.handshake?.query?.room;
        if (roomId !== undefined && roomId !== '') {
            forward('room:connect', { socket, roomId });   // ルーム接続: 有効性は host が判定する
            return;
        }
        // ロビー接続
        socket.join('lobby');
        forward('connect', { socket });
        socket.on('lobby:enter', () => forward('lobby:enter', { socket }));
        socket.on('room:create', (payload: any) => forward('room:create', { socket, name: payload?.name }));
        socket.on('disconnect', () => forward('disconnect', { socket }));
    };
    io.on('connection', onConnection);
    unit.on('finalize', () => io.off?.('connection', onConnection));

    return {
        broadcast(event: string, payload?: any) { io.to('lobby').emit(event, payload); },
    };
}

/**
 * Room — 同期された「1 部屋」を server/client 対称に配線する component（boot ＋ socket 所有）。
 * server / client の別は boot が実行環境から自動判定する（Node=server / browser=client）。Room は
 * その結果（booted root の mode）を見て後始末を分ける。client では finalize で socket を切断する。
 * socket の基本イベント（connect / disconnect / room:notfound）は boot が **boot を呼んだ親ユニット**の
 * unit.on(event) へ配るので、host 側でそのまま受け取れる。socket の生成・roomId 解決・ロビー / 部屋管理は
 * 利用側（client は Scene、server は io 配線）の責務。
 */
export function Room(unit: Unit, { socket, room, name, Component }: Pick<BootOptions, 'socket' | 'room' | 'name'> & { Component: Function }) {
    // boot へ socket/room/name を渡す（server/client は実行環境から自動判定。下りと基本イベントは boot が自動配線）。
    const client = sync.boot({ socket, room, name }, Component);

    if (getEnvironment() === 'server') {
        // server: 部屋掃除で booted root を畳むだけ。
        unit.on('finalize', () => client.finalize());
    } else {
        unit.on('finalize', () => { client.finalize(); socket?.disconnect?.(); });   // 生 socket.io 接続を閉じる
    }

    // extend の define は関数 / getter のみ許可されるため、boot ルートは getter で公開する。
    return {
        get client(): Unit { return client; },
    };
}
