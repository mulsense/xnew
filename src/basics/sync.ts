//----------------------------------------------------------------------------------------------------
// Sync — socket.io basics components (Lobby / Room)
//
// Base components that wire socket.io handles to the host unit and own their teardown.
// server/client is auto-detected from the runtime (→ core/env); handle is server=io / client=socket.
//
// - Lobby : lobby + dynamic rooms. client forwards lobby events to unit.on('-<event>') + create().
//           server owns io.on('connection'), validates joins, and exposes the room ledger + broadcast.
//           A create request spawns the injected Room and replies 'created' (Room registers itself via context).
// - Room  : boots Component and forwards basic events (connect/disconnect/notfound) to the host. On the
//           server it counts members, syncs the parent Lobby ledger, re-broadcasts on changes, and removes
//           itself once empty for graceMs.
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

/** Lobby — wires the lobby connection to the host unit; events arrive via unit.on('-<event>').
 *  socket callbacks run outside the tick, so emits are wrapped in xnew.scope to bind the unit scope. */
export function Lobby(unit: Unit, props: LobbyProps) {
    // server: owns io.on('connection') with join validation, the room ledger, and list re-broadcast.
    // Room creation and ledger updates are delegated to Room (host does xnew(Room,...), Room registers via context).
    sync.server(() => {
        const { io, Room, maxRooms = 20, roomNameMax = 16 } = props as LobbyServerProps;
        const rooms = new Map<string, { id: string; name: string; memberCount: number }>();   // id → row (Room maintains)
        let nextRoomNum = 0;
        const roomList = () => [...rooms.values()].map((r) => ({ id: r.id, name: r.name, memberCount: r.memberCount }));
        
        const connection = xnew.scope((conn: any) => {
            const roomId = conn.handshake?.query?.room;
            if (roomId !== undefined && roomId !== '') {
                // room connection: reject gone/invalid rooms (valid ones are handled by Room's boot wiring).
                if (!rooms.has(roomId)) { conn.emit('notfound', { roomId }); conn.disconnect(true); }
                return;
            }
            // lobby connection: send the current list (later updates auto-broadcast), then handle create.
            conn.join('lobby');
            conn.emit('update', { rooms: roomList() });
            conn.on('create', xnew.scope((payload: any) => {
                if (rooms.size >= maxRooms) { conn.emit('rejected', { message: 'room limit reached' }); return; }
                const id = `r${++nextRoomNum}`;
                const name = String(payload?.name ?? '').trim().slice(0, roomNameMax) || `Room ${nextRoomNum}`;
                // spawn the injected Room (it adds itself to the ledger), then reply 'created' to the creator.
                xnew(unit, Room!, { io, room: { id, name } });
                conn.emit('created', { room: { id, name } });
            }));
        });
        io.on('connection', connection);
        unit.on('finalize', () => io.off('connection', connection));

        // exposed so Room (via context(Lobby)) can maintain the ledger and re-broadcast the list.
        return {
            get rooms() { return rooms; },
            broadcast() {
                return io.to('lobby').emit('update', { rooms: roomList() });
            }
        };
    });

    // client: forward lobby events to the host unit's '-<event>', and disconnect the socket on finalize.
    sync.client(() => {
        const { socket } = props as LobbyClientProps;
        socket.on('connect', xnew.scope(() => xnew.emit('-connect', {})));
        socket.on('disconnect', xnew.scope(() => xnew.emit('-disconnect', {})));
        socket.on('update', xnew.scope((payload: any) => xnew.emit('-update', payload)));
        socket.on('created', xnew.scope((payload: any) => xnew.emit('-created', payload)));
        socket.on('rejected', xnew.scope((payload: any) => xnew.emit('-rejected', payload)));
        unit.on('finalize', () => socket.disconnect());
        return { create(name: string) { socket.emit('create', { name }); } };
    });
}

/** Room props. Like Lobby, the component runs on both sides but each reads a different shape: the server
 *  boots with the io handle, the client with its socket. room/Component/graceMs are shared by both. */
export interface RoomServerProps { io: any; room: BootOptions['room']; Component: Function; graceMs?: number; }
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

        // ledger row for the Lobby; only memberCount is returned live.
        const entry = { id: room?.id ?? '', name: room?.name ?? '', get memberCount() { return members.size; } };

        // remove the room once empty for graceMs: connect cancels it, disconnect reschedules it.
        // xnew.timeout lives under the unit, so finalize stops it and its callback runs in the unit scope.
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

        lobby?.rooms.set(room?.id, entry);   // register in the ledger and reflect in the list
        lobby?.broadcast();
        scheduleCleanup();                   // remove if left empty (canceled on the first connect)
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
