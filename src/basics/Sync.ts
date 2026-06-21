//----------------------------------------------------------------------------------------------------
// Sync — socket.io basics components (Lobby / Room)
//
// socket.io ハンドルを 1 つ受け取り、その受信を host unit へ配線して後始末を引き受ける基底コンポーネント。
// server / client は実行環境で自動判定する（→ core/env）。ハンドルは server なら io、client なら socket を渡す
// （socket.io の慣習に合わせ、各環境ブロックが正しい名前の変数を参照する）。
//
// - Lobby : component({ io?, socket?, Room?, maxRooms?, roomNameMax? }) — ロビー + 動的ルーム。
//           client（socket）= ロビー受信を unit.on('-<event>') へ転送 + create()（UI は利用側）。
//           server（io）= io.on('connection') を所有し、入室検証 + 台帳(rooms)・一覧再配信(broadcast) を公開する。
//                    create 要求を受けると注入された Room コンポーネントで xnew(Room, { room:id, name }) を生成し、
//                    直後に creator へ created を返す（台帳への登録・人数再配信は Room が context(Lobby) で行う）。
// - Room  : component({ io?, socket?, room?, name?, Component }) — Component を boot し基本イベントを host へ転送。
//           親に Lobby があれば（context(Lobby)）その台帳へ自分を出し入れし、人数変化で一覧を再配信する。
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { sync, BootOptions } from '../utils/sync';

/** Lobby — ロビー接続を host unit に配線する。受信は unit.on('-<event>') で受け取る。
 *  socket のコールバックは tick の外で走るので、emit を unit スコープで走らせるため xnew.scope で包む。 */
export function Lobby(unit: Unit, { io, socket, Room, maxRooms = 20, roomNameMax = 16 }:
    { io?: any; socket?: any; Room?: Function; maxRooms?: number; roomNameMax?: number }) {
    // server: io.on('connection') を所有し、入室検証と「台帳(rooms)＋一覧再配信(broadcast)」を持つ。
    // 部屋の生成・台帳への出し入れは Room 側に委ねる（host が xnew(Room,...) し、Room が context(Lobby) 経由で登録）。
    xnew.server(() => {
        const rooms = new Map<string, { id: string; name: string; memberCount: number }>();   // id → 行情報（Room が出し入れ）
        let nextRoomNum = 0;
        const roomList = () => [...rooms.values()].map((r) => ({ id: r.id, name: r.name, memberCount: r.memberCount }));
        const broadcast = () => io.to('lobby').emit('update', { rooms: roomList() });
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
            conn.on('create', xnew.scope((payload: any) => {
                if (rooms.size >= maxRooms) { conn.emit('rejected', { message: 'room limit reached' }); return; }
                const id = `r${++nextRoomNum}`;
                const name = String(payload?.name ?? '').trim().slice(0, roomNameMax) || `Room ${nextRoomNum}`;
                // 部屋は host が注入した Room コンポーネントで生成する（Room が台帳へ自分を載せる）。生成直後に
                // creator へ created を返す（同期生成なので成功は確定）。
                xnew(unit, Room!, { io, room: id, name });
                conn.emit('created', { roomId: id });
            }));
        });
        io.on('connection', connection);
        unit.on('finalize', () => io.off('connection', connection));

        // Room が context(Lobby) で台帳へ自分を出し入れし、人数変化で一覧を再配信できるよう公開する。
        return { get rooms() { return rooms; }, broadcast };
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
 *  graceMs 続けば '-empty' を出す。親に Lobby があれば（context(Lobby)）その台帳へ自分を登録し、人数変化で
 *  一覧を再配信、空室確定で自分を台帳から外して撤去する。server/client は実行環境で自動判定。 */
export function Room(unit: Unit, { io, socket, room, name, Component, graceMs = 3000 }: Pick<BootOptions, 'io' | 'socket' | 'room' | 'name'> & { Component: Function; graceMs?: number }) {
    const client = sync.boot({ io, socket, room, name }, Component);   // server は io / client は socket（boot が env で選ぶ）
    unit.on('finalize', () => client.finalize());
    const members = new Set<string>();

    // server: connect/disconnect は boot ルート(client)配下へ配られる。host へ転送しつつ人数台帳と空室掃除を持つ。
    // 親に Lobby があれば、その台帳(rooms)へ自分を出し入れし人数変化で一覧を再配信する（旧 Lobby.register を内包）。
    xnew.server(() => {
        const lobby = xnew.context(Lobby);   // 無ければ undefined（Lobby 配下でない単独利用）
        // 台帳に載せる行情報。自分の interface はまだ未確定なので memberCount だけ closure から live に返す。
        const entry = { id: room ?? '', name: name ?? '', get memberCount() { return members.size; } };
        let graceTimer: ReturnType<typeof setTimeout> | null = null;
        const clearGrace = () => { if (graceTimer !== null) { clearTimeout(graceTimer); graceTimer = null; } };
        const remove = () => { lobby.rooms.delete(room); lobby.broadcast(); unit.finalize(); };   // 無人確定 → 台帳から外して撤去
        const scheduleCleanup = () => { clearGrace(); graceTimer = setTimeout(xnew.scope(() => { if (members.size === 0) { xnew.emit('-empty', {}); if (lobby !== undefined) { remove(); } } }), graceMs); };
        client.on('connect', xnew.scope(({ id }: any) => { clearGrace(); members.add(id); xnew.emit('-connect', { id }); lobby?.broadcast(); }));
        client.on('disconnect', xnew.scope(({ id }: any) => { members.delete(id); xnew.emit('-disconnect', { id }); lobby?.broadcast(); if (members.size === 0) { scheduleCleanup(); } }));
        unit.on('finalize', clearGrace);
        lobby?.rooms.set(room, entry);   // 台帳へ自分を登録し、直ちに一覧へ反映
        lobby?.broadcast();
        scheduleCleanup();   // 作成直後に無人なら graceMs 後に撤去（最初の connect で解除）
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
