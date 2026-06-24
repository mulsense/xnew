//----------------------------------------------------------------------------------------------------
// Sync — socket.io basics components (Lobby / Room)
//
// Base components that wire socket.io handles to the host unit and own their teardown.
// server/client is auto-detected from the runtime (→ core/env); handle is server=io / client=socket.
// The server-side room ledger (id → Room unit) lives at module scope so Room can drop itself and
// re-broadcast without a Lobby context; Lobby owns its lifecycle and clears it on finalize.
//
// Both components extend Scene (basics/view) as their base, so a Lobby / Room is a swappable scene
// (change / add) regardless of side; the server/client wiring is layered on top of that base.
//
// - Lobby : lobby + dynamic rooms. client forwards lobby events to unit.on('-<event>') + create().
//           server owns io.on('connection'), validates joins, and writes the module-global room ledger.
//           A create request spawns the injected Room, stores its unit, and replies 'roomcreated'; the room
//           list is built from each stored unit's info().
// - Room  : boots Component and forwards basic events (connect/disconnect/notfound) to the host. On the
//           server it counts members and exposes info() (id/name/count) for the lobby list,
//           re-broadcasts on changes, and drops itself from the ledger once empty for graceMs. A Room that
//           is not in the ledger (mounted without a Lobby) skips broadcasting and self-removal.
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit, UnitTimer } from '../core/unit';
import { sync, BootOptions } from '../core/sync';
import { Scene } from './view';

const rooms = new Map<string, Unit>();
export interface RoomInfo { id: string; name: string; count: number; }

function roomList(): RoomInfo[] {
    return [...rooms.values()].map((room) => room.info());
}

function broadcastRooms(io: any): void {
    io.to('lobby').emit('statusupdate', { rooms: roomList() });
}

export interface LobbyServerProps { io: any; Room: Function; maxRooms?: number; roomNameMax?: number; }
export interface LobbyClientProps { socket: any; }
export type LobbyProps = LobbyServerProps | LobbyClientProps;

export function Lobby(unit: Unit, props: LobbyProps) {
    xnew.extend(Scene);

    sync.server(() => {
        const { io, Room, maxRooms = 20, roomNameMax = 16 } = props as LobbyServerProps;
        let nextRoomNum = 0;

        const connection = xnew.scope((conn: any) => {
            const roomId = conn.handshake?.query?.room;
            if (roomId !== undefined && roomId !== '') {
                // room connection: reject gone/invalid rooms (valid ones are handled by Room's boot wiring).
                if (!rooms.has(roomId)) { conn.emit('notfound', { roomId }); conn.disconnect(true); }
                return;
            }

            conn.join('lobby');
            conn.emit('statusupdate', { rooms: roomList() });
            conn.on('roomcreate', xnew.scope((payload: any) => {
                if (rooms.size >= maxRooms) { conn.emit('roomrejected', { message: 'room limit reached' }); return; }
                const id = `r${++nextRoomNum}`;
                const name = String(payload?.name ?? '').trim().slice(0, roomNameMax) || `Room ${nextRoomNum}`;
                // spawn the injected Room, store the unit, then reply 'roomcreated' and refresh the list.
                rooms.set(id, xnew(unit, Room!, { io, room: { id, name } }));
                conn.emit('roomcreated', { room: { id, name } });
                broadcastRooms(io);
            }));
        });
        io.on('connection', connection);
        // Lobby owns the ledger lifecycle: drop the connection listener and clear the ledger on finalize.
        unit.on('finalize', () => { io.off('connection', connection); rooms.clear(); });
    });

    // client: forward lobby events to the host unit's '-<event>', and disconnect the socket on finalize.
    sync.client(() => {
        const { socket } = props as LobbyClientProps;
        socket.on('connect', xnew.scope(() => xnew.emit('-connect', {})));
        socket.on('disconnect', xnew.scope(() => xnew.emit('-disconnect', {})));
        socket.on('statusupdate', xnew.scope((payload: any) => xnew.emit('-statusupdate', payload)));
        socket.on('roomcreated', xnew.scope((payload: any) => xnew.emit('-roomcreated', payload)));
        socket.on('roomrejected', xnew.scope((payload: any) => xnew.emit('-roomrejected', payload)));
        unit.on('finalize', () => socket.disconnect());
        return { create(name: string) { socket.emit('roomcreate', { name }); } };
    });
}

export interface RoomServerProps { io: any; room?: BootOptions['room']; Component: Function; graceMs?: number; }
export interface RoomClientProps { socket: any; Component: Function; graceMs?: number; }
export type RoomProps = RoomServerProps | RoomClientProps;

export function Room(unit: Unit, props: RoomProps) {
    xnew.extend(Scene);
    const members = new Set<string>();

    sync.server(() => {
        const { io, room, Component, graceMs = 3000 } = props as RoomServerProps;
        const client = sync.boot({ io, room }, Component);
        unit.on('finalize', () => client.finalize());

        // listed = this room is in the module-global ledger (i.e. a Lobby created it). A standalone Room
        // (mounted without a Lobby) is never listed, so it skips broadcasting and self-removal.
        const isListed = () => room?.id !== undefined && rooms.has(room.id);

        // remove the room once empty for graceMs: connect cancels it, disconnect reschedules it.
        // xnew.timeout lives under the unit, so finalize stops it and its callback runs in the unit scope.
        let graceTimer: UnitTimer | null = null;
        const cancelCleanup = () => { graceTimer?.clear(); graceTimer = null; };
        const scheduleCleanup = () => {
            cancelCleanup();
            graceTimer = xnew.timeout(() => {
                if (members.size > 0) { return; }
                xnew.emit('-empty', {});
                if (isListed()) { rooms.delete(room!.id!); broadcastRooms(io); unit.finalize(); }
            }, graceMs);
        };

        client.on('sync.connect', xnew.scope(({ id }: any) => {
            cancelCleanup();
            members.add(id);
            xnew.emit('-connect', { id });
            if (isListed()) { broadcastRooms(io); }
        }));
        client.on('sync.disconnect', xnew.scope(({ id }: any) => {
            members.delete(id);
            xnew.emit('-disconnect', { id });
            if (isListed()) { broadcastRooms(io); }
            if (members.size === 0) { scheduleCleanup(); }
        }));

        scheduleCleanup();                   // remove if left empty (canceled on the first connect)

        // exposed to the parent Lobby (which stores this unit): one room-list row, with the live member count.
        return {
            info(): RoomInfo {
                return { id: room?.id ?? '', name: room?.name ?? '', count: members.size };
            },
        };
    });

    sync.client(() => {
        const { socket, Component } = props as RoomClientProps;
        const client = sync.boot({ socket }, Component);
        unit.on('finalize', () => client.finalize());

        socket.on('connect', xnew.scope(() => xnew.emit('-connect', {})));
        socket.on('disconnect', xnew.scope(() => xnew.emit('-disconnect', {})));
        socket.on('notfound', xnew.scope((payload: any) => xnew.emit('-notfound', payload)));
        unit.on('finalize', () => socket.disconnect());
    });
}
