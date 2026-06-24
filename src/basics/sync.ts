//----------------------------------------------------------------------------------------------------
// Sync — socket.io basics components (Lobby / Room)
//
// Base components that wire socket.io handles to the host unit and own their teardown.
// server/client is auto-detected from the runtime (→ core/env); handle is server=io / client=socket.
//
// - Lobby : lobby + dynamic rooms. client forwards lobby events to unit.on('-<event>') + create().
//           server owns io.on('connection'), validates joins, and holds the room ledger (id → Room unit).
//           A create request spawns the injected Room, stores its unit, and replies 'roomcreated'; the room
//           list is built from each stored unit's info().
// - Room  : boots Component and forwards basic events (connect/disconnect/notfound) to the host. On the
//           server it counts members and exposes info() (id/name/memberCount) for the parent Lobby's list,
//           re-broadcasts on changes, and drops itself from the ledger once empty for graceMs.
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit, UnitTimer } from '../core/unit';
import { sync, BootOptions } from '../core/sync';

/** Lobby props. The component is mounted on both server and client, but each side reads a different
 *  shape: the server needs the io handle and the Room to spawn, the client only needs its socket.
 *  Splitting the two makes the unused-on-this-side fields explicit at the call site. */
export interface LobbyServerProps { io: any; Room: Function; maxRooms?: number; roomNameMax?: number; }
export interface LobbyClientProps { socket: any; }
export type LobbyProps = LobbyServerProps | LobbyClientProps;

/** One row of the lobby's room list, produced by Room.info() and read off the stored Room unit. */
export interface RoomInfo { id: string; name: string; memberCount: number; }

/** Lobby — wires the lobby connection to the host unit; events arrive via unit.on('-<event>').
 *  socket callbacks run outside the tick, so emits are wrapped in xnew.scope to bind the unit scope. */
export function Lobby(unit: Unit, props: LobbyProps) {
    // server: owns io.on('connection') with join validation, the room ledger, and list re-broadcast.
    // Room creation and ledger updates are delegated to Room (host does xnew(Room,...), Room registers via context).
    sync.server(() => {
        const { io, Room, maxRooms = 20, roomNameMax = 16 } = props as LobbyServerProps;
        const rooms = new Map<string, Unit>();   // id → Room unit; the row is read via room.info()
        let nextRoomNum = 0;

        const connection = xnew.scope((conn: any) => {
            const roomId = conn.handshake?.query?.room;
            if (roomId !== undefined && roomId !== '') {
                // room connection: reject gone/invalid rooms (valid ones are handled by Room's boot wiring).
                if (!rooms.has(roomId)) { conn.emit('notfound', { roomId }); conn.disconnect(true); }
                return;
            }
            // lobby connection: send the current list (later updates auto-broadcast), then handle create.
            conn.join('lobby');
            conn.emit('statusupdate', { rooms: unit.rooms });
            conn.on('roomcreate', xnew.scope((payload: any) => {
                if (rooms.size >= maxRooms) { conn.emit('roomrejected', { message: 'room limit reached' }); return; }
                const id = `r${++nextRoomNum}`;
                const name = String(payload?.name ?? '').trim().slice(0, roomNameMax) || `Room ${nextRoomNum}`;
                // spawn the injected Room, store the unit, then reply 'roomcreated' and refresh the list.
                rooms.set(id, xnew(unit, Room!, { io, room: { id, name } }));
                conn.emit('roomcreated', { room: { id, name } });
                unit.update();
            }));
        });
        io.on('connection', connection);
        unit.on('finalize', () => io.off('connection', connection));

        // exposed so Room (via context(Lobby)) can drop itself from the ledger and re-broadcast the list.
        return {
            get rooms() { return [...rooms.values()].map((room) => room.info()); },
            update() {
                return io.to('lobby').emit('statusupdate', { rooms: unit.rooms });
            },
            remove(id: string) { rooms.delete(id); },
        };
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

/** Room props. Like Lobby, the component runs on both sides but each reads a different shape: the server
 *  boots with the io handle, the client with its socket. room/Component/graceMs are shared by both. */
export interface RoomServerProps { io: any; room?: BootOptions['room']; Component: Function; graceMs?: number; }
export interface RoomClientProps { socket: any; Component: Function; graceMs?: number; }
export type RoomProps = RoomServerProps | RoomClientProps;

/** Room — boots one synced room and owns the socket, forwarding basic events (connect/disconnect/notfound)
 *  to the host unit's '-<event>'. On the server it keeps a member ledger and emits '-empty' once empty for
 *  graceMs; if a parent Lobby exists it syncs that ledger, re-broadcasts on changes, and removes itself when
 *  the room stays empty. server/client is auto-detected via env. */
export function Room(unit: Unit, props: RoomProps) {

    // member ledger: updated on the server by connect/disconnect, read via the exposed memberCount.
    // On the client it is never updated and stays empty (memberCount is 0).
    const members = new Set<string>();

    // server: sync.connect/disconnect arrive under the boot (client) route. Forward to the host while keeping
    // the member ledger and empty-room cleanup. If a parent Lobby exists, sync its ledger and re-broadcast on change.
    sync.server(() => {
        const { io, room, Component, graceMs = 3000 } = props as RoomServerProps;
        const client = sync.boot({ io, room }, Component);
        unit.on('finalize', () => client.finalize());

        const lobby = xnew.context(Lobby);

        // remove the room once empty for graceMs: connect cancels it, disconnect reschedules it.
        // xnew.timeout lives under the unit, so finalize stops it and its callback runs in the unit scope.
        let graceTimer: UnitTimer | null = null;
        const cancelCleanup = () => { graceTimer?.clear(); graceTimer = null; };
        const scheduleCleanup = () => {
            cancelCleanup();
            graceTimer = xnew.timeout(() => {
                if (members.size > 0) { return; }
                xnew.emit('-empty', {});
                if (lobby !== undefined) { lobby.remove(room?.id); lobby.update(); unit.finalize(); }
            }, graceMs);
        };

        client.on('sync.connect', xnew.scope(({ id }: any) => {
            cancelCleanup();
            members.add(id);
            xnew.emit('-connect', { id });
            lobby?.update();
        }));
        client.on('sync.disconnect', xnew.scope(({ id }: any) => {
            members.delete(id);
            xnew.emit('-disconnect', { id });
            lobby?.update();
            if (members.size === 0) { scheduleCleanup(); }
        }));

        scheduleCleanup();                   // remove if left empty (canceled on the first connect)

        // exposed to the parent Lobby (which stores this unit): one room-list row, with the live member count.
        return {
            info(): RoomInfo {
                return { id: room?.id ?? '', name: room?.name ?? '', memberCount: members.size };
            },
        };
    });

    // client: forward the raw socket's basic events to the host, and disconnect the socket on finalize.
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
