//----------------------------------------------------------------------------------------------------
// Sync — socket.io basics components (Lobby / Room)
//
// Wire socket.io handles to the host unit; server/client auto-detected (→ core/env: io vs socket).
// The room ledger (id → Room unit) is module-global so Room self-removes/re-broadcasts without a
// Lobby context; Lobby is its sole writer and clears it on finalize. Scene navigation (change/add)
// is the caller's concern — extend Scene on the host unit if you want it (see examples/network).
//
// - Lobby    : lobby + dynamic rooms; client forwards events to '-<event>' and exposes create().
// - Room     : boots Component, forwards connect/disconnect/notfound; server counts members + cleanup.
//
// A room-list row is core's RoomData { id, name, count } (count = live member count).
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit, UnitTimer } from '../core/unit';
import { sync, BootServerOptions, RoomData } from '../core/sync';

const rooms = new Map<string, Unit>();

function roomList(): RoomData[] {
    return [...rooms.values()].map((room) => room.info());
}

function broadcastRooms(io: any): void {
    io.to('lobby').emit('statusupdate', { rooms: roomList() });
}

export function Lobby(unit: Unit, props: any) {

    sync.server(() => {
        const { io, Room, maxRooms = 20, roomNameMax = 16 } = props as { io: any; Room: Function; maxRooms?: number; roomNameMax?: number; };
        let nextRoomNum = 0;

        const connection = xnew.scope((conn: any) => {
            const roomId = conn.handshake?.query?.room;
            if (roomId !== undefined && roomId !== '') {
                // reject gone/invalid rooms (valid ones are handled by Room's boot wiring).
                if (!rooms.has(roomId)) { conn.emit('notfound', { roomId }); conn.disconnect(true); }
                return;
            }

            conn.join('lobby');
            conn.emit('statusupdate', { rooms: roomList() });
            conn.on('roomcreate', xnew.scope((payload: any) => {
                if (rooms.size >= maxRooms) { conn.emit('roomrejected', { message: 'room limit reached' }); return; }
                const id = `r${++nextRoomNum}`;
                const name = String(payload?.name ?? '').trim().slice(0, roomNameMax) || `Room ${nextRoomNum}`;
                rooms.set(id, xnew(unit, Room, { io, room: { id, name, count: 0 } }));
                conn.emit('roomcreated', { room: { id, name, count: 0 } });
                broadcastRooms(io);
            }));
        });
        io.on('connection', connection);
        unit.on('finalize', () => { io.off('connection', connection); rooms.clear(); });
    });

    sync.client(() => {
        const { socket } = props as { socket: any; };
        socket.on('connect', xnew.scope(() => xnew.emit('-connect', {})));
        socket.on('disconnect', xnew.scope(() => xnew.emit('-disconnect', {})));
        socket.on('statusupdate', xnew.scope((payload: any) => xnew.emit('-statusupdate', payload)));
        socket.on('roomcreated', xnew.scope((payload: any) => xnew.emit('-roomcreated', payload)));
        socket.on('roomrejected', xnew.scope((payload: any) => xnew.emit('-roomrejected', payload)));
        unit.on('finalize', () => socket.disconnect());
        return { create(name: string) { socket.emit('roomcreate', { name }); } };
    });
}

export function Room(unit: Unit, props: any) {
    const members = new Set<string>();

    sync.server(() => {
        const { io, room, Component, graceMs = 3000 } = props as { io: any; room: BootServerOptions['room']; Component: Function; graceMs?: number; };
        const client = sync.boot({ io, room }, Component);
        unit.on('finalize', () => client.finalize());

        // listed = tracked by a Lobby ledger; a standalone Room (id not in the ledger) skips broadcast/self-removal.
        const isListed = () => rooms.has(room.id);

        // drop the room once empty for graceMs (connect cancels, disconnect reschedules).
        let graceTimer: UnitTimer | null = null;
        const cancelCleanup = () => { graceTimer?.clear(); graceTimer = null; };
        const scheduleCleanup = () => {
            cancelCleanup();
            graceTimer = xnew.timeout(() => {
                if (members.size > 0) { return; }
                xnew.emit('-empty', {});
                if (isListed()) { rooms.delete(room.id); broadcastRooms(io); unit.finalize(); }
            }, graceMs);
        };

        // socket.io の connection / disconnect を直接受けてこの room のメンバを計数する（room フィルタ付き）。
        const connection = xnew.scope((socket: any) => {
            if (socket.handshake?.query?.room !== room.id) { return; }   // 別ルームは無視
            cancelCleanup();
            members.add(socket.id);
            xnew.emit('-connect', { id: socket.id });
            if (isListed()) { broadcastRooms(io); }
            socket.on('disconnect', xnew.scope(() => {
                members.delete(socket.id);
                xnew.emit('-disconnect', { id: socket.id });
                if (isListed()) { broadcastRooms(io); }
                if (members.size === 0) { scheduleCleanup(); }
            }));
        });
        io.on('connection', connection);
        unit.on('finalize', () => io.off('connection', connection));

        scheduleCleanup();

        // exposed to the parent Lobby: one room-list row with the live member count.
        return {
            info(): RoomData {
                return { id: room.id, name: room.name, count: members.size };
            },
        };
    });

    sync.client(() => {
        const { socket, room, Component } = props as { socket: any; room: BootServerOptions['room']; Component: Function; graceMs?: number; };
        // room は呼び出し側から必ず渡す（server status で上書きされるまでの初期値）。
        const client = sync.boot({ socket, room }, Component);
        unit.on('finalize', () => client.finalize());

        socket.on('connect', xnew.scope(() => xnew.emit('-connect', {})));
        socket.on('disconnect', xnew.scope(() => xnew.emit('-disconnect', {})));
        socket.on('notfound', xnew.scope((payload: any) => xnew.emit('-notfound', payload)));
        unit.on('finalize', () => socket.disconnect());
    });
}
