//----------------------------------------------------------------------------------------------------
// Sync — socket.io basics components (Lobby / Room)
//
// 生の socket.io socket / io を 1 つ受け取り、その受信を host unit へ配線して socket の後始末を引き受ける
// 基底コンポーネント。server / client は実行環境で自動判定する（→ core/env）。
//
// - Lobby : component({ socket }) — 受信を unit.on('-<event>') へ転送（状態同期なし）。
//           client は create() / lobby:enter を担い、server は io.on('connection') + broadcast() を持つ。
// - Room  : component({ socket, room?, name?, Component }) — socket で Component を boot し { client } を返す。
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { sync, BootOptions } from '../utils/sync';

// onAny は connect/disconnect を含まないため、client では基本イベントを明示的に拾う。
const BASIC_EVENTS = ['connect', 'disconnect'] as const;

/** Lobby — ロビー接続を host unit に配線する。受信は unit.on('-<event>') で受け取る。 */
export function Lobby(unit: Unit, { socket }: { socket: any }) {
    // 受信を host unit の '-event' へ転送（emit を unit スコープで走らせるため scope で包む）。
    const forward = xnew.scope((event: string, payload: any) => {
        xnew.emit('-' + event, (payload !== null && typeof payload === 'object') ? payload : {});
    });

    // server: io.on('connection') を所有し、ロビー / ルーム接続を接続 socket 付きで host へ配る。
    xnew.server(() => {
        const onConnection = (conn: any) => {
            const roomId = conn.handshake?.query?.room;
            if (roomId !== undefined && roomId !== '') {
                forward('room:connect', { socket: conn, roomId });   // ルームの有効性は host が判定する
                return;
            }
            conn.join('lobby');
            forward('connect', { socket: conn });
            conn.on('lobby:enter', () => forward('lobby:enter', { socket: conn }));
            conn.on('room:create', (payload: any) => forward('room:create', { socket: conn, name: payload?.name }));
            conn.on('disconnect', () => forward('disconnect', { socket: conn }));
        };
        socket.on('connection', onConnection);
        unit.on('finalize', () => socket.off?.('connection', onConnection));
        return { broadcast(event: string, payload?: any) { socket.to('lobby').emit(event, payload); } };
    });

    // client: 受信を転送し、finalize で socket を切断する。
    xnew.client(() => {
        const anyHandler = (event: string, payload: any) => forward(event, payload);
        const basicHandlers = BASIC_EVENTS.map((event) => [event, (payload: any) => forward(event, payload)] as const);
        socket.onAny(anyHandler);
        basicHandlers.forEach(([event, handler]) => socket.on(event, handler));
        unit.on('finalize', () => {
            socket.offAny?.(anyHandler);
            basicHandlers.forEach(([event, handler]) => socket.off?.(event, handler));
            socket.disconnect?.();
        });
        xnew.timeout(() => socket.emit('lobby:enter'));   // host のリスナ登録後に（時間差で）一覧を要求
        return { create(name: string) { socket.emit('room:create', { name }); } };
    });
}

/** Room — 同期された 1 部屋を boot し socket を所有する。基本イベント(connect/disconnect/room:notfound)は
 *  boot が boot 親ユニットの unit.on へ配る。server/client は boot が実行環境で自動判定する。 */
export function Room(unit: Unit, { socket, room, name, Component }: Pick<BootOptions, 'socket' | 'room' | 'name'> & { Component: Function }) {
    const client = sync.boot({ socket, room, name }, Component);
    unit.on('finalize', () => client.finalize());
    xnew.client(() => unit.on('finalize', () => socket?.disconnect?.()));   // client は生 socket.io 接続を閉じる
    return { get client(): Unit { return client; } };   // define は関数 / getter のみ許可なので getter で公開
}
