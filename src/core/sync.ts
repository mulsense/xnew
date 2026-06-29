//----------------------------------------------------------------------------------------------------
// sync — server→client state sync engine
//
// Server tree (source of truth) is captured and diff-applied onto each client tree over socket.io.
//
// Public facade (xnew.sync.*):
// - server / client : extend the current unit only on its runtime (Node=server / browser=client)
// - state           : declare synced state on the current unit (server authoritative)
// - register        : declare the components allowed as direct sync children {Name: Component}
// - emit            : send a custom event to the room (server→all clients / client→server)
// - room / clients  : current room info / connected clients
// - myself          : this client's entry (client side only)
// - boot            : create a sync root bound to a socket (server/client auto-detected)
//----------------------------------------------------------------------------------------------------

import { Unit, ComponentFn, DefinesOf, PropsOf } from './unit';
import { getEnvironment } from './env';

export interface SyncNode { id: number; name: string; parent: number | null; state: Record<string, any>; }
interface SyncData { id: number | null; state: Record<string, any>; registry: Record<string, Function>; }

const syncData: WeakMap<Unit, SyncData> = new WeakMap();

export function syncOf(unit: Unit): SyncData {
    if (syncData.has(unit) === false) {
        syncData.set(unit, { id: null, state: {}, registry: {} });
    }
    return syncData.get(unit)!;
}

export interface ClientStatus { id: string; name: string; }
export interface RoomStatus { id: string; name: string; count: number; }

interface ServerInfo { io: any; room: RoomStatus; clients: ClientStatus[]; }
interface ClientInfo { socket: any; room: RoomStatus; clients: ClientStatus[]; }

// A boot root publishes its SyncInfo as an ancestor context; descendants resolve the nearest root via
// Unit.getContext. Private Symbol (avoids xnew.context() collision); auto-cleared on root finalize.
const SYNC_KEY = Symbol('sync');

/** Internal info of the caller's sync root (throws if not booted). */
function rootInfoOf(unit: Unit): ServerInfo | ClientInfo {
    const info = Unit.getContext(unit, SYNC_KEY) as ServerInfo | ClientInfo | undefined;
    if (info === undefined) {
        throw new Error('no socket bound to this root; create it with xnew.sync.boot({ io, room } | { io, client, room }, ...).');
    }
    return info;
}

//----------------------------------------------------------------------------------------------------
// boot — per-runtime root creation + wiring (bootServer / bootClient); dispatch routes events per root.
//----------------------------------------------------------------------------------------------------

export interface BootServerOptions { io: any; room: RoomStatus; }
export interface BootClientOptions { io: any; room: RoomStatus; client: any; }

/** Route a received event to listening units belonging to `info`'s root. */
function dispatch(info: ServerInfo | ClientInfo, event: string, id: string | undefined, payload: any): void {
    const data = payload && payload.data !== null && typeof payload.data === 'object' ? payload.data : {};
    const syncId = payload ? payload.syncId : undefined;
    (Unit.type2units.get(event) ?? []).forEach((unit) => {
        if (Unit.getContext(unit, SYNC_KEY) !== info) return; // skip units of another root
        if (event[0] === '-' && syncOf(unit).id !== syncId) return; // skip units of another sync node
        unit._.listeners.get(event)?.forEach((item) => item.execute({ id, ...data }));
    });
}

function bootServer(opts: BootServerOptions, parent: Unit, args: any[]): Unit {
    const { io, room } = opts;
    const info: ServerInfo = { io, room, clients: [] };

    // Bind info as ancestor context before init so the body can resolve it.
    const root = new Unit(parent);
    Unit.addContext(root, root, SYNC_KEY, info);
    Unit.initialize(root, ...args);

    // capture this root's sync targets as a flat pre-order node list (closed over `root`).
    // A sync target is a unit whose type is registered in its direct parent's registry.
    // nextId is monotonic across captures so a unit keeps its id for its whole lifetime.
    let nextId = 1;
    const captureStateTree = (): SyncNode[] => {
        const nodes: SyncNode[] = [];
        // _.Components is [base..., most-derived]; match the registered name from the tail.
        const syncName = (unit: Unit): string | undefined => {
            const registry = unit._.parent ? syncData.get(unit._.parent)?.registry : null;
            if (registry === null || registry === undefined) { return undefined; }
            const entries = Object.entries(registry);
            for (let i = unit._.Components.length - 1; i >= 0; i--) {
                const hit = entries.find(([, Component]) => Component === unit._.Components[i]);
                if (hit !== undefined) { return hit[0]; }
            }
            return undefined;
        };
        const walk = (unit: Unit, parent: number | null): void => {
            const name = syncName(unit);
            if (name !== undefined) {
                const data = syncOf(unit);
                data.id ??= nextId++;
                nodes.push({ id: data.id, name, parent, state: { ...data.state } });
                parent = data.id;
            }
            unit._.children.forEach((child) => walk(child, parent));
        };
        walk(root, null);
        return nodes;
    };

    root.on('update', () => io.to(room.id).emit('sync', captureStateTree()));
    io.on('connection', (socket: any) => {
        const query = socket.handshake?.query;
        if (query?.roomId !== room.id) return; // ignore other rooms
        socket.join(room.id);
        info.clients.push({ id: socket.id, name: query?.clientName ?? '' });
        dispatch(info, 'sync.connect', socket.id, undefined);
        statusUpdate();
        socket.onAny((event: string, payload: any) => dispatch(info, event, socket.id, payload));
        socket.on('disconnect', () => {
            info.clients = info.clients.filter((c) => c.id !== socket.id);
            dispatch(info, 'sync.disconnect', socket.id, undefined);
            statusUpdate();
        });
    });
    function statusUpdate() {
        io.to(room.id).emit('status', { clients: info.clients });
        dispatch(info, 'sync.statusupdate', undefined, undefined);
    }
    return root;
}

function bootClient(opts: BootClientOptions, parent: Unit, args: any[]): Unit {
    const { io, room, client } = opts;
    // client owns its socket: io() with flat string query (roomId / clientName) on the handshake.
    // create it before init so the component body can already read it (sync.myself / sync.emit).
    const socket = io({ query: { roomId: room.id, clientName: client?.name ?? '' }, forceNew: true });
    const info: ClientInfo = { socket, room, clients: [] };

    // Bind info as ancestor context before init so the body can resolve it.
    const root = new Unit(parent);
    Unit.addContext(root, root, SYNC_KEY, info);
    Unit.initialize(root, ...args);

    // diff-apply a captured tree onto this client root (create/update/remove; tree is pre-order).
    // reconcileMap tracks node id → replica unit for this root only (closed over `root`).
    const reconcileMap = new Map<number, Unit>();
    const applyStateTree = (tree: SyncNode[]): void => {
        const incoming = new Set<number>(tree.map((node) => node.id));
        // create / update (pre-order, so the parent already exists)
        for (const node of tree) {
            const existing = reconcileMap.get(node.id);
            if (existing !== undefined) {
                Object.assign(syncOf(existing).state, node.state);   // never delete a once-set key (v1 simplification)
                continue;
            }
            const nodeParent = node.parent === null ? root : reconcileMap.get(node.parent);
            const Component = nodeParent && syncOf(nodeParent).registry[node.name];
            if (!Component) { continue; }
            // seed SyncData before initialize so the body's sync.state sees the server state and fixed id
            const unit = new Unit(nodeParent);
            syncData.set(unit, { id: node.id, state: { ...node.state }, registry: {} });
            Unit.initialize(unit, Component);
            reconcileMap.set(node.id, unit);
        }
        // remove replicas whose id vanished from the tree
        for (const [id, unit] of [...reconcileMap.entries()]) {
            if (!incoming.has(id)) { unit.finalize(); reconcileMap.delete(id); }
        }
    };

    socket.on('sync', applyStateTree);
    const onStatus = (status: { clients?: ClientStatus[] }) => {
        info.clients = status?.clients ?? [];
        dispatch(info, 'sync.statusupdate', undefined, undefined);
    };
    socket.on('status', onStatus);
    socket.onAny((event: string, payload: any) => dispatch(info, event, undefined, payload));

    // forward the socket's own lifecycle to the host unit (boot parent) as local '-events',
    // so callers listen with unit.on('-connect' | '-disconnect' | '-notfound').
    socket.on('connect', () => Unit.emit(parent, '-connect', { id: socket.id }));
    socket.on('disconnect', () => Unit.emit(parent, '-disconnect', {}));
    socket.on('notfound', (payload: any) => Unit.emit(parent, '-notfound', payload ?? {}));
    root.on('finalize', () => {
        socket.off('sync', applyStateTree); socket.off('status', onStatus); socket.disconnect();
    });
    return root;
}

export const sync = {
    server<C extends ComponentFn<any, any>>(callback: C, props?: PropsOf<C>): DefinesOf<C> | {} {
        return getEnvironment() === 'server' ? Unit.extend(Unit.currentUnit, callback, props) as DefinesOf<C> : {};
    },
    client<C extends ComponentFn<any, any>>(callback: C, props?: PropsOf<C>): DefinesOf<C> | {} {
        return getEnvironment() === 'client' ? Unit.extend(Unit.currentUnit, callback, props) as DefinesOf<C> : {};
    },
    state(initial: Record<string, any> = {}): Record<string, any> {
        const data = syncOf(Unit.currentUnit);
        for (const key of Object.keys(initial)) {
            if (!(key in data.state)) { data.state[key] = initial[key]; }
        }
        return data.state;
    },
    register(Components: Record<string, Function>): void {
        const unit = Unit.currentUnit;
        if (unit._.status !== 'invoked') {
            throw new Error('xnew.sync.register must be called during component initialization.');
        }
        Object.assign(syncOf(unit).registry, Components);
    },
    get room(): RoomStatus {
        return rootInfoOf(Unit.currentUnit).room;
    },
    get clients(): ClientStatus[] {
        return rootInfoOf(Unit.currentUnit).clients;
    },
    get myself(): ClientStatus {
        if (getEnvironment() === 'server') {
            throw new Error('sync.myself is only available on the client side.');
        }
        const info = rootInfoOf(Unit.currentUnit) as ClientInfo;
        return info.clients.find((c) => c.id === info.socket.id) ?? { id: info.socket.id, name: '' };
    },
    emit(event: string, payload: Record<string, any> = {}): void {
        const info = rootInfoOf(Unit.currentUnit);
        const envelope = { syncId: syncOf(Unit.currentUnit).id, data: payload };
        if (getEnvironment() === 'server') {
            (info as ServerInfo).io.to(info.room.id).emit(event, envelope);
        } else {
            (info as ClientInfo).socket.emit(event, envelope);
        }
    },
    boot(opts: BootServerOptions | BootClientOptions, ...args: any[]): Unit {
        if (Unit.engineRoot === undefined) { Unit.reset(); }
        return getEnvironment() === 'server'
            ? bootServer(opts as BootServerOptions, Unit.currentUnit, args)
            : bootClient(opts as BootClientOptions, Unit.currentUnit, args);
    },
};
