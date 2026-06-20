//----------------------------------------------------------------------------------------------------
// Sync — socket.io basics components (Lobby / Room)
//
// socket.io ハンドルを 1 つ受け取り、その受信を host unit へ配線して後始末を引き受ける基底コンポーネント。
// server / client は実行環境で自動判定する（→ core/env）。ハンドルは server なら io、client なら socket を渡す
// （socket.io の慣習に合わせ、各環境ブロックが正しい名前の変数を参照する）。
//
// - Lobby : component({ io?, socket?, Component?, maxRooms?, graceMs?, roomNameMax? }) — ロビー + 動的ルーム。
//           client（socket）= ロビー受信を unit.on('-<event>') へ転送 + create()（UI は利用側）。
//           server（io）= io.on('connection') を所有し、ルーム台帳・作成・一覧配信・人数計数・空室掃除・入室検証
//                    まで自前で管理する（部屋ごとに Component を boot）。利用側は io と Component を渡すだけ。
// - Room  : component({ io?, socket?, room?, name?, Component }) — ハンドルで Component を boot し基本イベントを host へ転送。
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { sync, BootOptions } from '../utils/sync';

/** Lobby — ロビー接続を host unit に配線する。受信は unit.on('-<event>') で受け取る。
 *  socket のコールバックは tick の外で走るので、emit を unit スコープで走らせるため xnew.scope で包む。 */
export function Lobby(unit: Unit, { io, socket, Component, maxRooms = 20, graceMs = 3000, roomNameMax = 16 }:
    { io?: any; socket?: any; Component?: Function; maxRooms?: number; graceMs?: number; roomNameMax?: number }) {
    // server: io.on('connection') を所有し、ルーム台帳・作成・一覧配信・人数・空室掃除・入室検証を自前で管理する。
    xnew.server(() => {
        const rooms = new Map<string, any>();   // id → Room unit（id/name/memberCount を公開、-empty で撤去）
        let nextRoomNum = 0;
        const roomList = () => [...rooms.values()].map((r) => ({ id: r.id, name: r.name, memberCount: r.memberCount }));
        const broadcastRooms = () => io.to('lobby').emit('update', { rooms: roomList() });
        const removeRoom = (id: string) => {
            const room = rooms.get(id);
            if (room === undefined) { return; }
            rooms.delete(id);
            room.finalize();   // Room の finalize が booted root を畳む
            broadcastRooms();
        };
        const createRoom = (rawName: string): string | null => {
            if (rooms.size >= maxRooms) { return null; }
            const id = `r${++nextRoomNum}`;
            const name = String(rawName ?? '').trim().slice(0, roomNameMax) || `Room ${nextRoomNum}`;
            const room = xnew(unit, Room, { io, room: id, name, Component: Component!, graceMs });
            room.on('-connect', broadcastRooms);     // 人数変化のたびに一覧を再配信
            room.on('-disconnect', broadcastRooms);
            room.on('-empty', () => removeRoom(id));  // 無人が graceMs 続いたら撤去
            rooms.set(id, room);
            broadcastRooms();
            return id;
        };
        const connection = xnew.scope((conn: any) => {
            const roomId = conn.handshake?.query?.room;
            if (roomId !== undefined && roomId !== '') {
                // ルーム接続: 消滅 / 不正ルームは弾く（有効ルームは Room の boot 配線が処理する）。
                if (!rooms.has(roomId)) { conn.emit('notfound', { roomId }); conn.disconnect(true); }
                return;
            }
            // ロビー接続: 現在の一覧を返し（以降は作成 / 人数変化で自動配信）、create を処理する。
            conn.join('lobby');
            conn.emit('update', { rooms: roomList() });
            conn.on('create', (payload: any) => {
                const id = createRoom(payload?.name);
                if (id === null) { conn.emit('rejected', { message: 'room limit reached' }); return; }
                conn.emit('created', { roomId: id });
            });
        });
        io.on('connection', connection);
        unit.on('finalize', () => io.off('connection', connection));
    });

    // client: ロビーの受信イベントを host unit の '-<event>' へ転送し、finalize で socket を切断する。
    xnew.client(() => {
        socket.on('connect', xnew.scope(() => xnew.emit('-connect', {})));
        socket.on('disconnect', xnew.scope(() => xnew.emit('-disconnect', {})));
        socket.on('update', xnew.scope((payload: any) => xnew.emit('-update', payload)));
        socket.on('created', xnew.scope((payload: any) => xnew.emit('-created', payload)));
        socket.on('rejected', xnew.scope((payload: any) => xnew.emit('-rejected', payload)));
        unit.on('finalize', () => socket.disconnect());
        return { create(name: string) { socket.emit('create', { name }); } };
    });
}

/** Room — 同期された 1 部屋を boot し socket を所有する。基本イベント(connect/disconnect/notfound)を
 *  host unit の '-<event>' へ転送する。server では加えて人数台帳を持ち、id/name/memberCount を公開、無人が
 *  graceMs 続けば '-empty' を出す（ロビーの空室掃除に使う）。server/client は実行環境で自動判定。 */
export function Room(unit: Unit, { io, socket, room, name, Component, graceMs = 3000 }: Pick<BootOptions, 'io' | 'socket' | 'room' | 'name'> & { Component: Function; graceMs?: number }) {
    const client = sync.boot({ io, socket, room, name }, Component);   // server は io / client は socket（boot が env で選ぶ）
    unit.on('finalize', () => client.finalize());
    const members = new Set<string>();

    // server: connect/disconnect は boot ルート(client)配下へ配られる。host へ転送しつつ人数台帳と空室掃除を持つ。
    xnew.server(() => {
        let graceTimer: ReturnType<typeof setTimeout> | null = null;
        const clearGrace = () => { if (graceTimer !== null) { clearTimeout(graceTimer); graceTimer = null; } };
        const scheduleCleanup = () => { clearGrace(); graceTimer = setTimeout(xnew.scope(() => { if (members.size === 0) { xnew.emit('-empty', {}); } }), graceMs); };
        client.on('connect', xnew.scope(({ id }: any) => { clearGrace(); members.add(id); xnew.emit('-connect', { id }); }));
        client.on('disconnect', xnew.scope(({ id }: any) => { members.delete(id); xnew.emit('-disconnect', { id }); if (members.size === 0) { scheduleCleanup(); } }));
        unit.on('finalize', clearGrace);
        scheduleCleanup();   // 作成直後に無人なら graceMs 後に '-empty'（最初の connect で解除）
    });

    // client: 生 socket の基本イベントを host へ転送し、finalize で socket を切断する。
    xnew.client(() => {
        socket.on('connect', xnew.scope(() => xnew.emit('-connect', {})));
        socket.on('disconnect', xnew.scope(() => xnew.emit('-disconnect', {})));
        socket.on('notfound', xnew.scope((payload: any) => xnew.emit('-notfound', payload)));
        unit.on('finalize', () => socket.disconnect());
    });

    return { get id(): string | undefined { return room; }, get name(): string | undefined { return name; }, get memberCount(): number { return members.size; } };
}
