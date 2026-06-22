//----------------------------------------------------------------------------------------------------
// Sync — socket.io basics components (Lobby / Room)
//
// socket.io ハンドルの受信を host unit へ配線し後始末を引き受ける基底コンポーネント。
// server/client は実行環境で自動判定（→ core/env）。ハンドルは server=io / client=socket。
//
// - Lobby : ロビー + 動的ルーム。client=ロビー受信を unit.on('-<event>') へ転送 + create()。
//           server=io.on('connection') を所有し入室検証 + 台帳(rooms)・一覧再配信(broadcast) を公開。
//           create 要求で注入 Room を生成し creator へ created を返す（台帳登録は Room が context 経由で行う）。
// - Room  : Component を boot し基本イベントを host へ転送。親に Lobby があればその台帳へ出し入れし
//           人数変化で一覧を再配信する。
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit, UnitTimer } from '../core/unit';
import { sync, BootOptions } from '../utils/sync';

/** Lobby — ロビー接続を host unit に配線する。受信は unit.on('-<event>') で受け取る。
 *  socket のコールバックは tick 外で走るため emit を unit スコープへ載せるよう xnew.scope で包む。 */
export function Lobby(unit: Unit, { io, socket, Room, maxRooms = 20, roomNameMax = 16 }:
    { io?: any; socket?: any; Room?: Function; maxRooms?: number; roomNameMax?: number }) {
    // server: io.on('connection') を所有し、入室検証と台帳(rooms)＋一覧再配信(broadcast) を持つ。
    // 部屋生成・台帳の出し入れは Room へ委ねる（host が xnew(Room,...) し、Room が context(Lobby) で登録）。
    xnew.server(() => {
        const rooms = new Map<string, { id: string; name: string; memberCount: number }>();   // id → 行情報（Room が出し入れ）
        let nextRoomNum = 0;
        const roomList = () => [...rooms.values()].map((r) => ({ id: r.id, name: r.name, memberCount: r.memberCount }));
        const broadcast = () => io.to('lobby').emit('update', { rooms: roomList() });
        const connection = xnew.scope((conn: any) => {
            const roomId = conn.handshake?.query?.room;
            if (roomId !== undefined && roomId !== '') {
                // ルーム接続: 消滅 / 不正ルームは弾く（有効ルームは Room の boot 配線が処理）。
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
                // 注入された Room で部屋を生成し（Room が台帳へ自分を載せる）、直後に creator へ created を返す。
                xnew(unit, Room!, { io, room: { id, name } });
                conn.emit('created', { room: { id, name } });
            }));
        });
        io.on('connection', connection);
        unit.on('finalize', () => io.off('connection', connection));

        // Room が context(Lobby) で台帳の出し入れ・一覧再配信に使えるよう公開する。
        return { get rooms() { return rooms; }, broadcast };
    });

    // client: ロビー受信を host unit の '-<event>' へ転送し、finalize で socket を切断する。
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

/** Room — 同期された 1 部屋を boot し socket を所有。基本イベント(connect/disconnect/notfound)を host unit の
 *  '-<event>' へ転送する。server では人数台帳を持ち id/name/memberCount を公開、無人が graceMs 続けば '-empty'。
 *  親に Lobby があればその台帳へ自分を出し入れし、人数変化で一覧を再配信、空室確定で撤去する。env で自動判定。 */
export function Room(unit: Unit, { io, socket, room, Component, graceMs = 3000 }: Pick<BootOptions, 'io' | 'socket' | 'room'> & { Component: Function; graceMs?: number }) {

    // 人数台帳。server で connect/disconnect により更新し、公開する memberCount から参照する。
    // client 側では更新されず常に空（memberCount は 0）。
    const members = new Set<string>();

    // server: sync.connect/disconnect は boot ルート(client)配下へ配られる。host へ転送しつつ人数台帳と空室掃除を持つ。
    // 親に Lobby があればその台帳(rooms)へ出し入れし人数変化で一覧を再配信する。
    xnew.server(() => {
        const client = sync.boot({ io, room }, Component);
        unit.on('finalize', () => client.finalize());

        const lobby = xnew.context(Lobby);

        // Lobby 台帳の行情報。memberCount だけ live に返す。
        const entry = { id: room?.id ?? '', name: room?.name ?? '', get memberCount() { return members.size; } };

        // 無人が graceMs 続いたら撤去する。connect で解除し、disconnect で再設定する。
        // xnew.timeout は unit 配下なので finalize で自動停止し、コールバックも unit スコープで走る。
        let graceTimer: UnitTimer | null = null;
        const cancelCleanup = () => { graceTimer?.clear(); graceTimer = null; };
        const scheduleCleanup = () => {
            cancelCleanup();
            graceTimer = xnew.timeout(() => {
                if (members.size > 0) { return; }
                xnew.emit('-empty', {});
                if (lobby !== undefined) { lobby.rooms.delete(room?.id); lobby.broadcast(); unit.finalize(); }
            }, graceMs);
        };

        client.on('sync.connect', xnew.scope(({ id }: any) => {
            cancelCleanup();
            members.add(id);
            xnew.emit('-connect', { id });
            lobby?.broadcast();
        }));
        client.on('sync.disconnect', xnew.scope(({ id }: any) => {
            members.delete(id);
            xnew.emit('-disconnect', { id });
            lobby?.broadcast();
            if (members.size === 0) { scheduleCleanup(); }
        }));

        lobby?.rooms.set(room?.id, entry);   // 台帳へ登録し一覧へ反映
        lobby?.broadcast();
        scheduleCleanup();                   // 無人のまま放置されたら撤去（最初の connect で解除）
    });

    // client: 生 socket の基本イベントを host へ転送し、finalize で socket を切断する。
    xnew.client(() => {
        const client = sync.boot({ socket }, Component);
        unit.on('finalize', () => client.finalize());

        socket.on('connect', xnew.scope(() => xnew.emit('-connect', {})));
        socket.on('disconnect', xnew.scope(() => xnew.emit('-disconnect', {})));
        socket.on('notfound', xnew.scope((payload: any) => xnew.emit('-notfound', payload)));
        unit.on('finalize', () => socket.disconnect());
    });

    return { get id(): string | undefined { return room?.id; }, get name(): string | undefined { return room?.name; }, get memberCount(): number { return members.size; } };
}
