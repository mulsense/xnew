//----------------------------------------------------------------------------------------------------
// Sync — socket.io basics components (Lobby / Room)
//
// 生の socket.io socket / io を 1 つ受け取り、その受信を host unit へ配線して socket の後始末を引き受ける
// 基底コンポーネント。server / client は実行環境で自動判定する（→ core/env）。
//
// - Lobby : component({ socket, Component?, maxRooms?, graceMs?, roomNameMax? }) — ロビー + 動的ルーム。
//           client = ロビー受信を unit.on('-<event>') へ転送 + create() / enter（UI は利用側）。
//           server = io.on('connection') を所有し、ルーム台帳・作成・一覧配信・人数計数・空室掃除・入室検証まで
//                    自前で管理する（部屋ごとに Component を boot）。利用側は socket と Component を渡すだけ。
// - Room  : component({ socket, room?, name?, Component }) — socket で Component を boot し基本イベントを host へ転送。
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { sync, BootOptions } from '../utils/sync';

/** ServerRoom — ロビーが管理する 1 部屋（server）。Component を boot し、人数台帳と空室掃除(graceMs)を持つ。
 *  人数が変われば onChange、無人が graceMs 続けば onEmpty(id) を呼ぶ。Lobby(server) が内部で使う。 */
function ServerRoom(unit: Unit, { socket, id, name, Component, graceMs, onChange, onEmpty }:
    { socket: any; id: string; name: string; Component: Function; graceMs: number; onChange: () => void; onEmpty: (id: string) => void }) {
    xnew.extend(Room, { socket, room: id, Component });
    const members = new Set<string>();
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    const clearGrace = () => { if (graceTimer !== null) { clearTimeout(graceTimer); graceTimer = null; } };
    const scheduleCleanup = () => { clearGrace(); graceTimer = setTimeout(() => { if (members.size === 0) { onEmpty(id); } }, graceMs); };

    unit.on('-connect', ({ id: clientId }: any) => { clearGrace(); members.add(clientId); onChange(); });
    unit.on('-disconnect', ({ id: clientId }: any) => { members.delete(clientId); onChange(); if (members.size === 0) { scheduleCleanup(); } });
    unit.on('finalize', clearGrace);
    scheduleCleanup();   // 作成直後に無人なら graceMs 後に掃除（最初の connect で解除）

    return { get id() { return id; }, get name() { return name; }, get memberCount() { return members.size; } };
}

/** Lobby — ロビー接続を host unit に配線する。受信は unit.on('-<event>') で受け取る。
 *  socket のコールバックは tick の外で走るので、emit を unit スコープで走らせるため xnew.scope で包む。 */
export function Lobby(unit: Unit, { socket, Component, maxRooms = 20, graceMs = 3000, roomNameMax = 16 }:
    { socket: any; Component?: Function; maxRooms?: number; graceMs?: number; roomNameMax?: number }) {
    // server: io.on('connection') を所有し、ルーム台帳・作成・一覧配信・人数・空室掃除・入室検証を自前で管理する。
    xnew.server(() => {
        const rooms = new Map<string, any>();   // id → ServerRoom unit（id/name/memberCount を公開）
        let nextRoomNum = 0;
        const roomList = () => [...rooms.values()].map((r) => ({ id: r.id, name: r.name, memberCount: r.memberCount }));
        const broadcastRooms = () => socket.to('lobby').emit('lobby:rooms', { rooms: roomList() });
        const removeRoom = (id: string) => {
            const room = rooms.get(id);
            if (room === undefined) { return; }
            rooms.delete(id);
            room.finalize();   // ServerRoom → Room の finalize が booted root を畳む
            broadcastRooms();
        };
        const createRoom = (rawName: string): string | null => {
            if (rooms.size >= maxRooms) { return null; }
            const id = `r${++nextRoomNum}`;
            const name = String(rawName ?? '').trim().slice(0, roomNameMax) || `Room ${nextRoomNum}`;
            rooms.set(id, xnew(unit, ServerRoom, { socket, id, name, Component: Component!, graceMs, onChange: broadcastRooms, onEmpty: removeRoom }));
            broadcastRooms();
            return id;
        };
        const connection = xnew.scope((conn: any) => {
            const roomId = conn.handshake?.query?.room;
            if (roomId !== undefined && roomId !== '') {
                // ルーム接続: 消滅 / 不正ルームは弾く（有効ルームは ServerRoom の boot 配線が処理する）。
                if (!rooms.has(roomId)) { conn.emit('room:notfound', { roomId }); conn.disconnect(true); }
                return;
            }
            // ロビー接続: 一覧を返し、enter / room:create を処理する。
            conn.join('lobby');
            conn.emit('lobby:rooms', { rooms: roomList() });
            conn.on('enter', () => conn.emit('lobby:rooms', { rooms: roomList() }));
            conn.on('room:create', (payload: any) => {
                const id = createRoom(payload?.name);
                if (id === null) { conn.emit('room:error', { message: 'room limit reached' }); return; }
                conn.emit('room:created', { roomId: id });
            });
        });
        socket.on('connection', connection);
        unit.on('finalize', () => socket.off('connection', connection));
    });

    // client: ロビーの受信イベントを host unit の '-<event>' へ転送し、finalize で socket を切断する。
    xnew.client(() => {
        socket.on('connect', xnew.scope(() => xnew.emit('-connect', {})));
        socket.on('disconnect', xnew.scope(() => xnew.emit('-disconnect', {})));
        socket.on('lobby:rooms', xnew.scope((payload: any) => xnew.emit('-lobby:rooms', payload)));
        socket.on('room:created', xnew.scope((payload: any) => xnew.emit('-room:created', payload)));
        socket.on('room:error', xnew.scope((payload: any) => xnew.emit('-room:error', payload)));
        unit.on('finalize', () => socket.disconnect());
        xnew.timeout(() => socket.emit('enter'));   // host のリスナ登録後に（時間差で）一覧を要求
        return { create(name: string) { socket.emit('room:create', { name }); } };
    });
}

/** Room — 同期された 1 部屋を boot し socket を所有する。boot ルートが受け取る基本イベント
 *  (connect/disconnect/room:notfound)を host unit の '-<event>' へ転送する。server/client は実行環境で自動判定。 */
export function Room(unit: Unit, { socket, room, name, Component }: Pick<BootOptions, 'socket' | 'room' | 'name'> & { Component: Function }) {
    const client = sync.boot({ socket, room, name }, Component);
    unit.on('finalize', () => client.finalize());

    // server: connect/disconnect は boot ルート(client)配下へ配られるので、そこから host へ転送（{ id } 付き）。
    xnew.server(() => {
        client.on('connect', xnew.scope((props: any) => xnew.emit('-connect', props)));
        client.on('disconnect', xnew.scope((props: any) => xnew.emit('-disconnect', props)));
    });

    // client: 生 socket の基本イベントを host へ転送し、finalize で socket を切断する。
    xnew.client(() => {
        socket.on('connect', xnew.scope(() => xnew.emit('-connect', {})));
        socket.on('disconnect', xnew.scope(() => xnew.emit('-disconnect', {})));
        socket.on('room:notfound', xnew.scope((payload: any) => xnew.emit('-room:notfound', payload)));
        unit.on('finalize', () => socket.disconnect());
    });
}
