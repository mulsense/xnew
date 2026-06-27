//----------------------------------------------------------------------------------------------------
// sync — server→client state sync engine
//
// Captures the server tree's sync targets as a SyncNode list and diff-applies them to the client
// tree. A sync target is only a type registered in its direct parent's registry. Transport is
// socket.io: the server boot receives io directly; the client boot receives io too and calls it to
// create its own socket (query carries room.id + client). There is no transport abstraction.
// Note: socket on-handlers run outside the tick/scope, so never create/finalize units there (spawn on update).
//
// - sync : xnew.sync facade (state / register / emit / status / boot / server / client)
// - syncOf : per-unit sync data accessor (state fill / registry append live in sync.state / sync.register)
// - StateTree : node list carried by capture / apply
// - SyncStatus / ClientStatus / RoomStatus : room status types
// - BootServerOptions / BootClientOptions : boot input for server / client
//----------------------------------------------------------------------------------------------------

import { Unit, ComponentFn, DefinesOf, PropsOf } from './unit';
import { getEnvironment } from './env';

interface SyncNode { id: number; name: string; parentId: number | null; state: Record<string, any>; }
export type StateTree = SyncNode[];

// registry is {name: Component} allowed as direct sync children; state is the per-node key→value map.
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
export interface SyncStatus { room: RoomStatus; clients: ClientStatus[]; client: ClientStatus; }

interface ServerInfo { io: any; room: RoomStatus; clients: ClientStatus[]; }
interface ClientInfo { socket: any; room: RoomStatus; clients: ClientStatus[]; }

const roots: Map<Unit, ServerInfo | ClientInfo> = new Map();

/** Nearest boot root walking up from unit (null if none). */
function findSyncRoot(unit: Unit): Unit | null {
    for (let u: Unit | null = unit; u !== null; u = u._.parent) {
        if (roots.has(u)) return u;
    }
    return null;
}

/** Internal info of the caller's sync root (throws if not booted). */
function rootInfoOf(unit: Unit): ServerInfo | ClientInfo {
    const root = findSyncRoot(unit);
    const info = root !== null ? roots.get(root) : undefined;
    if (info === undefined) {
        throw new Error('no socket bound to this root; create it with xnew.sync.boot({ io, room } | { io, client, room }, ...).');
    }
    return info;
}

//----------------------------------------------------------------------------------------------------
// boot — root creation + wiring; the server/client split lives only inside this function.
// (1) downstream state mirror (server: capture→broadcast on update / client: apply on 'sync')
// (2) dispatcher (received events → unit.on under root: '-event'=same syncId / '+'·plain=whole tree)
// (3) client only: create the socket from io (query: room.id + client), forward its
//     connect/disconnect/notfound lifecycle to the host unit (boot parent) as local '-events',
//     and disconnect it on finalize. The host wiring lives here so callers just boot.
//----------------------------------------------------------------------------------------------------

export interface BootServerOptions { io: any; room: RoomStatus; }
export interface BootClientOptions { io: any; client: any; room: RoomStatus; }

function boot(opts: BootServerOptions | BootClientOptions, parent: Unit | null, args: any[]): Unit {
    const { room } = opts;
    let info: ServerInfo | ClientInfo;
    if (getEnvironment() === 'server') {
        info = { io: (opts as BootServerOptions).io, room, clients: [] };
    } else {
        // client owns its socket: io() with flat string query (roomId / clientName) on the handshake.
        const { io, client } = opts as BootClientOptions;
        const socket = io({ query: { roomId: room.id, clientName: client?.name ?? '' }, forceNew: true });
        info = { socket, room, clients: [] };
    }

    // Bind root before init so sync functions in the body can resolve it via findSyncRoot.
    const root = new Unit(parent);
    roots.set(root, info);
    Unit.initialize(root, ...args);

    if (getEnvironment() === 'server') {
        const { io } = info as ServerInfo;

        // capture this root's sync targets as a flat pre-order node list (closed over `root`).
        // A sync target is a unit whose type is registered in its direct parent's registry.
        // nextId is monotonic across captures so a unit keeps its id for its whole lifetime.
        let nextId = 1;
        const captureStateTree = (): StateTree => {
            const nodes: StateTree = [];
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
            const walk = (unit: Unit, parentId: number | null): void => {
                const name = syncName(unit);
                if (name !== undefined) {
                    const data = syncOf(unit);
                    data.id ??= nextId++;
                    nodes.push({ id: data.id, name, parentId, state: { ...data.state } });
                    parentId = data.id;
                }
                unit._.children.forEach((child) => walk(child, parentId));
            };
            walk(root, null);
            return nodes;
        };

        root.on('finalize', () => roots.delete(root));
        root.on('update', () => io.to(room.id).emit('sync', captureStateTree()));
        io.on('connection', (socket: any) => {
            const query = socket.handshake?.query;
            if (query?.roomId !== room.id) return; // ignore other rooms
            socket.join(room.id);
            info.clients.push({ id: socket.id, name: query?.clientName ?? '' });
            dispatch('sync.connect', socket.id, undefined);
            statusUpdate();
            socket.onAny((event: string, payload: any) => dispatch(event, socket.id, payload));
            socket.on('disconnect', () => {
                info.clients = info.clients.filter((c) => c.id !== socket.id);
                dispatch('sync.disconnect', socket.id, undefined);
                statusUpdate();
            });
        });
        function statusUpdate() {
            io.to(room.id).emit('status', { clients: info.clients });
            dispatch('sync.statusupdate', undefined, undefined);
        }
    } else {
        const { socket } = info as ClientInfo;

        // diff-apply a captured tree onto this client root (create/update/remove; tree is pre-order).
        // reconcileMap tracks node id → replica unit for this root only (closed over `root`).
        const reconcileMap = new Map<number, Unit>();
        const applyStateTree = (tree: StateTree): void => {
            const incoming = new Set<number>(tree.map((node) => node.id));
            // create / update (pre-order, so the parent already exists)
            for (const node of tree) {
                const existing = reconcileMap.get(node.id);
                if (existing !== undefined) {
                    Object.assign(syncOf(existing).state, node.state);   // never delete a once-set key (v1 simplification)
                    continue;
                }
                const parent = node.parentId === null ? root : reconcileMap.get(node.parentId);
                const Component = parent && syncOf(parent).registry[node.name];
                if (!Component) { continue; }
                // seed SyncData before initialize so the body's sync.state sees the server state and fixed id
                const unit = new Unit(parent);
                syncData.set(unit, { id: node.id, state: { ...node.state }, registry: {} });
                Unit.initialize(unit, Component);
                reconcileMap.set(node.id, unit);
            }
            // remove replicas whose id vanished from the tree
            for (const [id, unit] of [...reconcileMap.entries()]) {
                if (!incoming.has(id)) { unit.finalize(); reconcileMap.delete(id); }
            }
        };

        const onSync = (tree: StateTree) => applyStateTree(tree);
        socket.on('sync', onSync);
        const onStatus = (status: { clients?: ClientStatus[] }) => {
            info.clients = status?.clients ?? [];
            dispatch('sync.statusupdate', undefined, undefined);
        };
        socket.on('status', onStatus);
        socket.onAny((event: string, payload: any) => dispatch(event, undefined, payload));

        // forward the socket's own lifecycle to the host unit (boot parent) as local '-events',
        // so callers listen with unit.on('-connect' | '-disconnect' | '-notfound').
        const forwardToHost = (type: string, props: object): void => {
            parent?._.listeners.get(type)?.forEach((item) => item.execute(props));
        };
        socket.on('connect', () => forwardToHost('-connect', { id: socket.id }));
        socket.on('disconnect', () => forwardToHost('-disconnect', {}));
        socket.on('notfound', (payload: any) => forwardToHost('-notfound', payload ?? {}));
        root.on('finalize', () => {
            socket.off('sync', onSync); socket.off('status', onStatus);
            socket.disconnect(); roots.delete(root);
        });
    }

    function dispatch(event: string, id: string | undefined, payload: any): void {
        const data = payload && payload.data !== null && typeof payload.data === 'object' ? payload.data : {};
        const syncId = payload ? payload.syncId : undefined;
        (Unit.type2units.get(event) ?? []).forEach((unit) => {
            if (findSyncRoot(unit) !== root) return; // skip units of another root
            if (event[0] === '-' && syncOf(unit).id !== syncId) return; // skip units of another sync node
            unit._.listeners.get(event)?.forEach((item) => item.execute({ id, ...data }));
        });
    }
    return root;
}

//----------------------------------------------------------------------------------------------------
// xnew.sync facade — attached onto xnew by index.ts (post-hoc pattern).
// Each method acts on the implicit Unit.currentUnit, so call them from a Component function / handler.
//
// - state / register : declare synced state / register direct sync children {Name: Component}
// - emit / status    : send an event / room status (room·clients on both sides, client only on client)
// - boot             : create a root bound to a socket (server/client auto-detected by environment)
// - server / client  : extend block limited to the runtime (Node=server / browser=client)
//----------------------------------------------------------------------------------------------------

export const sync = {
    server<C extends ComponentFn<any, any>>(callback: C, props?: PropsOf<C>): DefinesOf<C> | {} {
        if (Unit.currentUnit._.status !== 'invoked') {
            throw new Error('xnew.sync.server can not be called after initialized.');
        }
        if (getEnvironment() === 'server') {
            return Unit.extend(Unit.currentUnit, callback, props) as DefinesOf<C>;
        } else {
            return {};
        }
    },
    client<C extends ComponentFn<any, any>>(callback: C, props?: PropsOf<C>): DefinesOf<C> | {} {
        if (Unit.currentUnit._.status !== 'invoked') {
            throw new Error('xnew.sync.client can not be called after initialized.');
        }
        if (getEnvironment() === 'server') {
            return {};
        } else {
            return Unit.extend(Unit.currentUnit, callback, props) as DefinesOf<C>;
        }
    },
    state(initial: Record<string, any> = {}): Record<string, any> {
        const data = syncOf(Unit.currentUnit);
        // fill only missing keys (apply's preseed / prior declaration wins)
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
    get status(): SyncStatus {
        const info = rootInfoOf(Unit.currentUnit);
        return {
            room: info.room, clients: info.clients,
            get client(): ClientStatus {
                if (getEnvironment() === 'server') {
                    throw new Error('sync.status.client is only available on the client side.');
                }
                const ci = info as ClientInfo;
                return ci.clients.find((c) => c.id === ci.socket.id) ?? { id: ci.socket.id, name: '' };
            },
        };
    },
    emit(event: string, payload: Record<string, any> = {}): void {
        if (getEnvironment() === 'server') {
            const info = rootInfoOf(Unit.currentUnit) as ServerInfo;
            info.io.to(info.room.id).emit(event, { syncId: syncOf(Unit.currentUnit).id, data: payload });
        } else {
            const info = rootInfoOf(Unit.currentUnit) as ClientInfo;
            info.socket.emit(event, { syncId: syncOf(Unit.currentUnit).id, data: payload });
        }
    },
    boot(opts: BootServerOptions | BootClientOptions, ...args: any[]): Unit {
        if (Unit.engineRoot === undefined) { Unit.reset(); }
        return boot(opts, Unit.currentUnit, args);
    },
};
