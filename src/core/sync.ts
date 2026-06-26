//----------------------------------------------------------------------------------------------------
// sync — server→client state sync engine
//
// Captures the server tree's sync targets as a SyncNode list and diff-applies them to the client
// tree. A sync target is only a type registered in its direct parent's registry. Transport is
// socket.io: boot receives io (server) / socket (client) directly; there is no transport abstraction.
// Note: socket on-handlers run outside the tick/scope, so never create/finalize units there (spawn on update).
//
// - sync : xnew.sync facade (state / register / emit / status / boot / server / client)
// - syncOf : per-unit sync data accessor (state fill / registry append live in sync.state / sync.register)
// - StateTree : node list carried by capture / apply
// - SyncStatus / ClientData / RoomData : room status types
// - BootServerOptions / BootClientOptions : boot input for server / client
//----------------------------------------------------------------------------------------------------

import { Unit, ComponentFn, DefinesOf, PropsOf } from './unit';
import { getEnvironment } from './env';

interface SyncNode { id: number; name: string; parentId: number | null; state: Record<string, any>; }
export type StateTree = SyncNode[];

interface SyncData {
    id: number | null;                  // sync node id (assigned on capture)
    state: Record<string, any>;         // synced state (declared by sync.state / preseeded by apply)
    registry: Record<string, Function>; // {name: Component} allowed as direct sync children
}

const syncData: WeakMap<Unit, SyncData> = new WeakMap();

export function syncOf(unit: Unit): SyncData {
    if (syncData.has(unit) === false) {
        syncData.set(unit, { id: null, state: {}, registry: {} });
    }
    return syncData.get(unit)!;
}

// Sync node id counter (identity). Monotonic and independent per root (boot root).
// id only needs to be unique within a root (apply uses a per-root reconcileMap; dispatch filters by root).
const syncIdCounters: WeakMap<Unit, number> = new WeakMap();

export function captureStateTree(root: Unit): StateTree {
    const nodes: StateTree = [];
    let nextId = syncIdCounters.get(root) ?? 1;

    // Registered name in the parent's registry (undefined = not a sync target).
    // _.Components is [base..., most-derived], so match from the tail.
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
    syncIdCounters.set(root, nextId);
    return nodes;
}

/** Per-client-root id→Unit map. */
const reconcileMaps: WeakMap<Unit, Map<number, Unit>> = new WeakMap();

/** Diff-apply a state tree to the client subtree (create/update/remove; tree is pre-order, client only). */
export function applyStateTree(root: Unit, tree: StateTree): void {
    if (reconcileMaps.has(root) === false) {
        reconcileMaps.set(root, new Map<number, Unit>());
    }
    const map = reconcileMaps.get(root)!;

    const incoming = new Set<number>(tree.map((node) => node.id));

    // create / update (pre-order, so the parent already exists)
    for (const node of tree) {
        const existing = map.get(node.id);
        if (existing !== undefined) {
            // update: overwrite changed fields (never delete a once-set key; v1 simplification)
            Object.assign(syncOf(existing).state, node.state);
            continue;
        }
        const parent = node.parentId === null ? root : map.get(node.parentId);
        const Component = parent && syncOf(parent).registry[node.name];
        if (!Component) { continue; }   // ignore: no parent / type not allowed
        // Create the unit before its body runs and seed its SyncData (id + server state) by unit key,
        // then initialize: missing keys are filled before the body's sync.state and the id is fixed.
        const unit = new Unit(parent);
        syncData.set(unit, { id: node.id, state: { ...node.state }, registry: {} });
        Unit.initialize(unit, Component);
        map.set(node.id, unit);
    }

    // remove: collapse replicas whose id vanished from the tree
    for (const [id, unit] of [...map.entries()]) {
        if (!incoming.has(id)) { unit.finalize(); map.delete(id); }
    }
}

export interface ClientData { id: string; name: string; }
export interface RoomData { id: string; name: string; count: number; }

export interface SyncStatus { room: RoomData; clients: ClientData[]; client: ClientData; }

interface ServerInfo { io: any; room: RoomData; clients: ClientData[]; }
interface ClientInfo { socket: any; room: RoomData; clients: ClientData[]; }

const roots: Map<Unit, ServerInfo | ClientInfo> = new Map();

/** Nearest boot root walking up from unit (null if none). */
function findSyncRoot(unit: Unit): Unit | null {
    for (let u: Unit | null = unit; u !== null; u = u._.parent) {
        if (roots.has(u)) { return u; }
    }
    return null;
}

/** Internal info of the caller's sync root (throws if not booted). */
function rootInfoOf(unit: Unit): ServerInfo | ClientInfo {
    const root = findSyncRoot(unit);
    const info = root !== null ? roots.get(root) : undefined;
    if (info === undefined) {
        throw new Error('no socket bound to this root; create it with xnew.sync.boot({ socket, room }, ...).');
    }
    return info;
}

//----------------------------------------------------------------------------------------------------
// boot — root creation + wiring. The server/client split lives only inside the boot function.
// Two wirings: (1) downstream state mirror (server: capture→broadcast on update / client: apply on 'sync')
// (2) dispatcher (received events → unit.on under root: '-event'=same syncId / '+'·plain=whole tree).
// Forwarding basic events to the host (boot parent) is Room's job in basics/sync.ts.
//----------------------------------------------------------------------------------------------------

export interface BootServerOptions { io: any; room: RoomData; }
export interface BootClientOptions { socket: any; room: RoomData; }

function boot(opts: BootServerOptions | BootClientOptions, parent: Unit | null, args: any[]): Unit {
    const { room } = opts;
    const info: ServerInfo | ClientInfo = getEnvironment() === 'server'
        ? { io: (opts as BootServerOptions).io, room, clients: [] }
        : { socket: (opts as BootClientOptions).socket, room, clients: [] };

    // Bind root before init so sync functions in the body can resolve it via findSyncRoot.
    // root may take (target, Component) form, so leave arg parsing to Unit.initialize.
    const root = new Unit(parent);
    roots.set(root, info);
    Unit.initialize(root, ...args);

    if (getEnvironment() === 'server') {
        const { io } = info as ServerInfo;
        root.on('finalize', () => roots.delete(root));
        root.on('update', () => io.to(room.id).emit('sync', captureStateTree(root)));
        io.on('connection', (socket: any) => {
            const query = socket.handshake?.query;
            if (query?.room !== room.id) return; // ignore other rooms
            socket.join(room.id);
            // on connect: add to roster, dispatch connect / all received / disconnect to the subtree (host forwarding is Room's job).
            info.clients.push({ id: socket.id, name: query?.name ?? '' });
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
        const onSync = (tree: StateTree) => applyStateTree(root, tree);
        socket.on('sync', onSync);
        // take the member roster from the server and dispatch sync.statusupdate to the subtree.
        const onStatus = (status: { clients?: ClientData[] }) => {
            info.clients = status?.clients ?? [];
            dispatch('sync.statusupdate', undefined, undefined);
        };
        socket.on('status', onStatus);
        root.on('finalize', () => { socket.off('sync', onSync); socket.off('status', onStatus); roots.delete(root); });
        socket.onAny((event: string, payload: any) => dispatch(event, undefined, payload));
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
        // keep existing keys, fill only missing ones from initial (apply's preseed / prior declaration wins).
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
            get client(): ClientData {
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
