//----------------------------------------------------------------------------------------------------
// sync — server→client 状態同期エンジン
//
// server ツリーの同期対象状態を SyncNode 列として捕捉し、client ツリーへ差分適用する。
// 同期対象は「直接の親ユニットのレジストリに登録された型」だけ。socket はルート単位にバインドし、
// 注意: socket の on ハンドラは tick/scope の外で走るので、その中で unit の生成/finalize はしない
// （プレーンなデータ更新に留め、spawn は update で行う）。
//
// - SyncData / syncOf / SyncRegistry / registerOnUnit : unit 単位の同期データ（WeakMap）とレジストリ
// - captureStateTree / applyStateTree : server サブツリー → SyncNode[] → client へ差分適用
// - ClientSocket / ServerSocket / RootSocket : socket 契約（socket.io 互換の duck-type。型のみ）
// - registerSyncRoot / findSyncRoot / getRootSocket : boot ルートの登録と解決
// - BootOptions / bootSyncRoot / loopbackHub : boot 入力・ルート生成 + 配線・共有 loopback hub
// - Transport / loopback / socketio : transport 実装（in-memory ハブ / socket.io アダプタ）
//----------------------------------------------------------------------------------------------------

import { Unit } from './unit';

export interface SyncNode { id: number; name: string; parentId: number | null; state: Record<string, any>; }
export type StateTree = SyncNode[];

/** ユニット単位の同期レジストリ。name → Component の素のマップ（Component → name の逆引きは線形探索で行う）。 */
export type SyncRegistry = Record<string, Function>;

//----------------------------------------------------------------------------------------------------
// per-unit sync data — Unit を汚染しないよう WeakMap で保持（Unit は sync を一切知らない）
//----------------------------------------------------------------------------------------------------

/** 1 unit 分の同期データ。 */
export interface SyncData {
    id: number | null;                 // 同期ノード id（capture 時に採番）
    state: Record<string, any> | null; // synced state（sync.state で宣言 / apply がプリシード）
    registry: SyncRegistry | null;     // 直接の同期子として許可する {name: Component}
}

const syncData: WeakMap<Unit, SyncData> = new WeakMap();

/** unit の同期データを返す（無ければ遅延生成。返り値は可変で直接読み書きしてよい）。 */
export function syncOf(unit: Unit): SyncData {
    let data = syncData.get(unit);
    if (data === undefined) {
        syncData.set(unit, data = { id: null, state: null, registry: null });
    }
    return data;
}

// 同期ノード id の採番カウンタ。identity 用で順序保証は不要なので、reset を跨いで単調増加でよい。
let syncIdCounter = 1;

function nextSyncId(): number {
    return syncIdCounter++;
}

/** 呼び出しユニットのレジストリへ {name: Component} を追記する（無ければ生成）。 */
export function registerOnUnit(unit: Unit, components: Record<string, Function>): void {
    const data = syncOf(unit);
    data.registry = Object.assign(data.registry ?? {}, components);
}

export function captureStateTree(root: Unit): StateTree {
    const nodes: StateTree = [];

    // 直接の親ユニットのレジストリ上の登録名を返す（未登録なら undefined = 同期対象外）。
    // _.Components は [基底..., 最派生] の順なので末尾側の一致を採る（extend は最派生名で 1 SyncNode）。
    const syncName = (unit: Unit): string | undefined => {
        const parent = unit._.parent;
        const registry = parent ? syncOf(parent).registry : null;
        if (registry === null) {
            return undefined;
        }
        const entries = Object.entries(registry);
        for (let i = unit._.Components.length - 1; i >= 0; i--) {
            const name = entries.find(([, Component]) => Component === unit._.Components[i])?.[0];
            if (name !== undefined) {
                return name;
            }
        }
        return undefined;
    };

    const walk = (unit: Unit, nearestSyncedId: number | null): void => {
        let parentForChildren = nearestSyncedId;
        const data = syncOf(unit);
        const name = syncName(unit);
        if (name !== undefined) {
            if (data.id === null) {
                data.id = nextSyncId();
            }
            nodes.push({
                id: data.id,
                name,
                parentId: nearestSyncedId,
                state: { ...(data.state ?? {}) },
            });
            parentForChildren = data.id;
        }
        unit._.children.forEach((child) => walk(child, parentForChildren));
    };

    walk(root, null);
    return nodes;
}

/** client ルートごとの id→Unit マップ。 */
const reconcileMaps: WeakMap<Unit, Map<number, Unit>> = new WeakMap();

/** Applies a state tree to a client subtree（create/update/remove の差分適用。tree は pre-order）。 */
export function applyStateTree(root: Unit, tree: StateTree): void {
    let map = reconcileMaps.get(root);
    if (map === undefined) { reconcileMaps.set(root, map = new Map()); }

    const incoming = new Set<number>(tree.map((node) => node.id));

    // create / update（tree は pre-order なので親が先に存在する）
    for (const node of tree) {
        const existing = map.get(node.id);
        if (existing === undefined) {
            // create
            const parent = node.parentId === null ? root : map.get(node.parentId);
            if (parent === undefined) { continue; }
            const Component = syncOf(parent).registry?.[node.name];
            if (Component === undefined) { continue; }   // 親が許可していない型は無視
            // setup フックでサーバー状態をプリシード（body より前に走るので欠落キーも埋まる）。
            const unit = new Unit({ setup: (u) => { syncOf(u).state = { ...node.state }; } }, parent, Component);
            syncOf(unit).id = node.id;
            map.set(node.id, unit);
        } else {
            // update（変更フィールドのみ書き換え）。不変条件: 一度入ったキーは削除されない
            // （server 側で state からキーを消しても client に残る。v1 の割り切り）。
            const data = syncOf(existing);
            if (data.state === null) { data.state = {}; }
            for (const key of Object.keys(node.state)) {
                if (data.state[key] !== node.state[key]) {
                    data.state[key] = node.state[key];
                }
            }
        }
    }

    // remove
    for (const [id, unit] of [...map.entries()]) {
        if (incoming.has(id) === false) {
            unit.finalize();
            map.delete(id);
        }
    }
}

//----------------------------------------------------------------------------------------------------
// socket 契約 — boot / mirror / dispatch はこの契約だけを使う（実装はファイル末尾の transport）
//----------------------------------------------------------------------------------------------------

/** socket.io の socket 相当（client 側）。 */
export interface ClientSocket {
    id: string;
    emit(event: string, payload?: any): void;
    on(event: string, handler: (payload: any) => void): void;
    off(event: string, handler: (payload: any) => void): void;
    onAny(handler: (event: string, payload: any) => void): void;   // 全イベント受信（connect/disconnect は除く）
    disconnect(): void;
}

/** socket.io の io 相当（server 側）。on は (clientId, payload) を受け、emit は broadcast。 */
export interface ServerSocket {
    on(event: string, handler: (clientId: string, payload: any) => void): void;
    off(event: string, handler: (clientId: string, payload: any) => void): void;
    emit(event: string, payload?: any): void;                 // broadcast
    to(clientId: string): { emit(event: string, payload?: any): void };
    onAny(handler: (event: string, clientId: string, payload: any) => void): void;   // 全イベント受信（connect/disconnect は除く）
}

/** boot ルートにバインドされる socket。 */
export type RootSocket = ClientSocket | ServerSocket;

//----------------------------------------------------------------------------------------------------
// 同期ツリーのルート情報（syncRoots）
//----------------------------------------------------------------------------------------------------

/** boot ルート → 関連情報（socket）。findSyncRoot / getRootSocket がこれを引く。 */
const syncRoots: WeakMap<Unit, { socket: RootSocket | null }> = new WeakMap();

/** boot ルートを登録する（xnew.sync.boot から呼ぶ）。 */
export function registerSyncRoot(root: Unit, info: { socket: RootSocket | null }): void {
    syncRoots.set(root, info);
}

// 接続まわりの「基本イベント」。dispatchSync（root 配下へ）とは別に、boot を呼んだ親ユニットの
// unit.on(event) へ配る対象。
const BASIC_EVENTS = ['connect', 'disconnect', 'room:notfound'] as const;

/** 基本イベントを boot ルートの「外」にいる親ユニット 1 つだけに配る。 */
function dispatchBasicEvent(parent: Unit | null, event: string, payload?: any): void {
    if (parent === null || parent._.status === 'finalized') {
        return;
    }
    const props = (payload !== null && typeof payload === 'object') ? payload : {};
    parent._.listeners.get(event)?.forEach((item) => item.execute(props));
}

/** unit から遡って最も近い boot ルートを返す（無ければ null）。 */
export function findSyncRoot(unit: Unit): Unit | null {
    for (let u: Unit | null = unit; u !== null; u = u._.parent) {
        if (syncRoots.has(u)) { return u; }
    }
    return null;
}

/** Resolves the socket bound to the caller's sync-tree root（無ければ throw）. */
export function getRootSocket(unit: Unit): RootSocket {
    const root = findSyncRoot(unit);
    const socket = root !== null ? syncRoots.get(root)!.socket : null;
    if (socket === null) {
        throw new Error('no socket bound to this root; create it with xnew.sync.boot({ mode }, ...).');
    }
    return socket;
}

/** xnew.sync.boot の入力。mode は必須、socket を渡すと socket.io 経由・省略で in-memory loopback。 */
export interface BootOptions {
    mode: 'server' | 'client';
    socket?: any;        // socket.io の io（server）/ socket（client）。省略時は loopback。
    room?: string;       // server + socket.io のときだけ意味を持つ（接続を query.room で絞る）。
}

// 同一 engineRoot 配下で socket 省略の boot が共有する in-memory hub。reset で engineRoot が変わると
// WeakMap がミスして作り直されるので、明示リセットは不要（unit.ts は sync を一切知らないまま）。
const loopbackHubs: WeakMap<Unit, Transport> = new WeakMap();

/** 現在の engineRoot に紐づく共有 loopback hub を返す（無ければ生成）。テストが生 socket を得るのにも使う。 */
export function loopbackHub(): Transport {
    let hub = loopbackHubs.get(Unit.engineRoot);
    if (hub === undefined) { loopbackHubs.set(Unit.engineRoot, hub = loopback()); }
    return hub;
}

/** BootOptions を RootSocket へ解決する（socket 有り = socket.io / 無し = 共有 loopback）。 */
function resolveRootSocket(opts: BootOptions): RootSocket {
    if (opts.socket !== undefined) {
        const transport = socketio(opts.socket, opts.room !== undefined ? { room: opts.room } : {});
        return opts.mode === 'server' ? transport.server : transport.connect();
    }
    const hub = loopbackHub();
    return opts.mode === 'server' ? hub.server : hub.connect();
}

/**
 * BootOptions から boot ルートを生成し、mode 別に一括配線して返す。
 * transport は opts.socket の有無で決まる（無し = 共有 loopback / 有り = socketio で socket.io をラップ）。
 * 配線は 3 つ:
 * (1) 状態の下り mirror : server は毎 update で capture → broadcast、client は on('sync') → apply
 * (2) dispatcher        : 受信イベントを root 配下の unit.on(event) へ（'-event'=同一 syncId / '+'・無印=全体）
 * (3) 基本イベント       : connect / disconnect / room:notfound を boot を呼んだ親ユニットの unit.on へ
 *     （server では connect/disconnect を root 配下にも配り、親へは { id: clientId } を渡す）
 */
export function bootSyncRoot(opts: BootOptions, parent: Unit | null, ...args: any[]): Unit {
    const mode = opts.mode;
    const socket = resolveRootSocket(opts);
    // socket は unit に保持せず、setup フックで syncRoots へ登録する。
    const root = new Unit({ mode, setup: (unit) => registerSyncRoot(unit, { socket }) }, parent, ...args);

    if (mode === 'server') {
        const server = socket as ServerSocket;
        root.on('update', () => server.emit('sync', captureStateTree(root)));
        server.onAny((event, clientId, message) => dispatchSync(root, event, clientId, message));
        server.on('connect', (clientId) => { dispatchSync(root, 'connect', clientId, undefined); dispatchBasicEvent(parent, 'connect', { id: clientId }); });
        server.on('disconnect', (clientId) => { dispatchSync(root, 'disconnect', clientId, undefined); dispatchBasicEvent(parent, 'disconnect', { id: clientId }); });
    } else {
        const client = socket as ClientSocket;
        const handler = (tree: StateTree) => applyStateTree(root, tree);
        client.on('sync', handler);
        root.on('finalize', () => client.off('sync', handler));
        client.onAny((event, message) => dispatchSync(root, event, undefined, message));
        // socket.io の onAny は connect/disconnect を含まないため、基本イベントは明示的に拾う。
        BASIC_EVENTS.forEach((event) => client.on(event, (payload: any) => dispatchBasicEvent(parent, event, payload)));
    }
    return root;
}

/** 1 つの受信イベントを、root 配下の該当 unit リスナへ配る。 */
function dispatchSync(root: Unit, event: string, id: string | undefined, message: any): void {
    if (root._.status === 'finalized') {
        return;
    }
    const isEnvelope = message !== null && typeof message === 'object' && Array.isArray(message) === false;
    const data = isEnvelope && message.data !== null && typeof message.data === 'object' ? message.data : {};
    const props = { id, ...data };
    const targets = Unit.type2units.get(event);
    if (targets === undefined) {
        return;
    }
    // '-event' は送信元と同一 syncId の unit のみ。'+event'・無印は root 配下の全 unit へ。
    const selfOnly = event[0] === '-';
    const syncId = isEnvelope ? message.syncId : undefined;
    targets.forEach((unit) => {
        if (findSyncRoot(unit) !== root) {
            return;   // 別ルートの unit には配らない
        }
        if (selfOnly && syncOf(unit).id !== syncId) {
            return;
        }
        unit._.listeners.get(event)?.forEach((item) => item.execute(props));
    });
}

//----------------------------------------------------------------------------------------------------
// transport — socket 契約の具体実装（loopback / socketio）。socket.io への import 依存は持たず
// メソッド名（on/onAny/emit/to/disconnect）に duck-type で乗る。
//----------------------------------------------------------------------------------------------------

/** transport の口。server は権威側 socket、connect() は client 側 socket を返す。 */
export interface Transport {
    server: ServerSocket;
    connect(clientId?: string): ClientSocket;
}

/** In-memory transport hub（同一プロセスで server↔client を同期配送。テスト/擬似用）。 */
export function loopback(): Transport {
    const serverHandlers = new Map<string, Set<(clientId: string, payload: any) => void>>();
    const clients = new Map<string, Map<string, Set<(payload: any) => void>>>();
    const serverAnyHandlers = new Set<(event: string, clientId: string, payload: any) => void>();
    const clientAnyHandlers = new Map<string, Set<(event: string, payload: any) => void>>();
    let seq = 0;   // clientId 自動発番用（'c1', 'c2', ...）

    const addHandler = <T>(map: Map<string, Set<T>>, event: string, handler: T): void => {
        if (map.has(event) === false) { map.set(event, new Set()); }
        map.get(event)!.add(handler);
    };
    const removeHandler = <T>(map: Map<string, Set<T>>, event: string, handler: T): void => {
        map.get(event)?.delete(handler);
    };
    const fireServer = (event: string, clientId: string, payload?: any): void => {
        serverHandlers.get(event)?.forEach((handler) => handler(clientId, payload));
        // onAny は app イベントだけ（socket.io の挙動に合わせる）。
        if (event !== 'connect' && event !== 'disconnect') {
            serverAnyHandlers.forEach((handler) => handler(event, clientId, payload));
        }
    };
    const fireClient = (clientId: string, event: string, payload?: any): void => {
        clients.get(clientId)?.get(event)?.forEach((handler) => handler(payload));
        clientAnyHandlers.get(clientId)?.forEach((handler) => handler(event, payload));
    };

    const server: ServerSocket = {
        on(event, handler) { addHandler(serverHandlers, event, handler); },
        off(event, handler) { removeHandler(serverHandlers, event, handler); },
        emit(event, payload) { for (const clientId of clients.keys()) { fireClient(clientId, event, payload); } },  // broadcast
        to(clientId) { return { emit(event, payload) { fireClient(clientId, event, payload); } }; },
        onAny(handler) { serverAnyHandlers.add(handler); },
    };

    function connect(clientId?: string): ClientSocket {
        if (clientId === undefined) { clientId = 'c' + (++seq); }   // 未指定なら自動発番
        clients.set(clientId, new Map());
        clientAnyHandlers.set(clientId, new Set());
        fireServer('connect', clientId);
        return {
            id: clientId,
            emit(event, payload) { fireServer(event, clientId!, payload); },
            // disconnect 後の on/off は no-op（finalize 時の off('sync') が切断済みでも安全なように）。
            on(event, handler) { const map = clients.get(clientId!); if (map !== undefined) { addHandler(map, event, handler); } },
            off(event, handler) { const map = clients.get(clientId!); if (map !== undefined) { removeHandler(map, event, handler); } },
            onAny(handler) { clientAnyHandlers.get(clientId!)?.add(handler); },
            disconnect() { clients.delete(clientId!); clientAnyHandlers.delete(clientId!); fireServer('disconnect', clientId!); },
        };
    }

    return { server, connect };
}

/**
 * socket.io アダプタ。server プロセスは io を、client は socket を渡す。
 * room 指定時は query.room が一致する接続だけを扱い、配信も io.to(room) に絞る。
 */
export function socketio(ioOrSocket: any, opts: { room?: string } = {}): Transport {
    const room = opts.room;
    let serverAdapter: ServerSocket | null = null;
    return {
        // server 側: io.on('connection') ごとに onAny で全イベントを (clientId, payload) へ橋渡しする。
        get server(): ServerSocket {
            if (serverAdapter !== null) { return serverAdapter; }
            const io = ioOrSocket;
            const handlers = new Map<string, Set<(clientId: string, payload: any) => void>>();
            const anyHandlers = new Set<(event: string, clientId: string, payload: any) => void>();
            const bucket = (event: string) => {
                let set = handlers.get(event);
                if (set === undefined) { handlers.set(event, set = new Set()); }
                return set;
            };
            io.on('connection', (socket: any) => {
                if (room !== undefined && socket.handshake?.query?.room !== room) { return; }   // 別ルームは無視
                if (room !== undefined) { socket.join(room); }
                bucket('connect').forEach((fn) => fn(socket.id, undefined));
                socket.onAny((event: string, payload: any) => {
                    handlers.get(event)?.forEach((fn) => fn(socket.id, payload));
                    anyHandlers.forEach((fn) => fn(event, socket.id, payload));
                });
                socket.on('disconnect', () => handlers.get('disconnect')?.forEach((fn) => fn(socket.id, undefined)));
            });
            const target = () => (room !== undefined ? io.to(room) : io);
            serverAdapter = {
                on: (event, handler) => bucket(event).add(handler),
                off: (event, handler) => handlers.get(event)?.delete(handler),
                emit: (event, payload) => target().emit(event, payload),
                to: (clientId) => ({ emit: (event, payload) => io.to(clientId).emit(event, payload) }),
                onAny: (handler) => anyHandlers.add(handler),
            };
            return serverAdapter;
        },
        // client 側: socket を ClientSocket 形に薄くラップする。
        connect(): ClientSocket {
            const socket = ioOrSocket;
            return {
                get id() { return socket.id; },
                emit: (event, payload) => socket.emit(event, payload),
                on: (event, handler) => socket.on(event, handler),
                off: (event, handler) => socket.off(event, handler),
                onAny: (handler) => socket.onAny(handler),
                disconnect: () => socket.disconnect(),
            };
        },
    };
}
