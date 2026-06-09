//----------------------------------------------------------------------------------------------------
// sync — server→client 状態同期エンジン（スコープ付きレジストリ）
//
// server ツリーの同期対象状態を SyncNode 列(state tree)として捕捉し、client ツリーへ
// 差分適用(create/update/remove)する。実ネットワークは扱わず、捕捉物の生成と再構成のみを担う。
//
// 同期対象の型は「各コンポーネントが自分の直接の子として登録した型」だけ。登録は Unit 単位で
// 保持し（_.sync.registry）、ある unit の同期可否・登録名は「直接の親ユニットのレジストリ」で解決する。
//
// - SyncRegistry / registerOnUnit : ユニット単位の {name ⇄ Component} レジストリ（BiMap）と追記
// - getSyncName        : unit が同期対象なら、直接の親のレジストリ上の登録名(最派生一致)を返す
// - captureStateTree   : server サブツリー → SyncNode[](全量)
// - applyStateTree     : SyncNode[] → client サブツリーへ差分適用。node.name は親ユニットの
//                        レジストリで解決し、create 時に new Unit の options.injected でサーバー状態を注入
//
// イベントチャンネル（socket.io 互換の transport）。client が emit したイベントを server が on で受け取る。
// transport はルート単位にバインドし（_.sync.socket）、emit/on はカレントユニットのルートから解決する。
// createLoopback はインメモリ実装で、これを socket.io アダプタ（同じ {server, connect} / socket 形）に
// 差し替えれば実ネットワークになる。state の下り（capture/apply）はそのまま。
// on ハンドラは xnew の tick/scope の外で走る点に注意: その中で unit の生成/finalize はせず（spawn は
// tick 内の update で行う）、closure で掴んだ state の書き換えなどプレーンなデータ更新に留める。
// - createLoopback         : インメモリ transport ハブ {server, connect(clientId)} を生成
// - createSocketioTransport: socket.io の io / socket を Transport 形へ橋渡し（duck-type。import 依存なし）
// - getRootSocket          : ルートにバインド済みの socket を解決（boot が _.sync.socket へ自動バインドする）
// - mirrorRoot             : 状態の下りを 1 呼び出しで配線（server=capture→emit('sync') / client=on('sync')→apply）
// - installSyncDispatch    : socket で届いたイベントを対象 unit の unit.on(event) リスナへ橋渡し（'-'=同一 syncId / 他=全体）
//----------------------------------------------------------------------------------------------------

import { Unit } from './unit';
import { BiMap } from './map';

export interface SyncNode { id: number; name: string; parentId: number | null; state: Record<string, any>; }
export type StateTree = SyncNode[];

/** ユニット単位の同期レジストリ。name(left) ⇄ Component(right) の 1:1 双方向マップ。 */
export type SyncRegistry = BiMap<string, Function>;

/** 呼び出しユニットのレジストリへ {name: Component} を追記する（無ければ生成）。 */
export function registerOnUnit(unit: Unit, components: Record<string, Function>): void {
    if (unit._.sync.registry === null) {
        unit._.sync.registry = new BiMap<string, Function>();
    }
    for (const [name, Component] of Object.entries(components)) {
        unit._.sync.registry.set(name, Component);
    }
}

export function getSyncName(unit: Unit): string | undefined {
    // 同期可否・登録名は「直接の親ユニットのレジストリ」で決まる。
    // _.Components は [基底..., 実際にインスタンス化した Component] の順なので、最も派生した
    // （= 末尾側の）一致を採る（基底に化けない / extend は最派生名で 1 SyncNode）。
    const registry = unit._.parent?._.sync.registry;
    if (registry === undefined || registry === null) {
        return undefined;
    }
    for (let i = unit._.Components.length - 1; i >= 0; i--) {
        const name = registry.getLeft(unit._.Components[i]);
        if (name !== undefined) {
            return name;
        }
    }
    return undefined;
}

export function captureStateTree(root: Unit): StateTree {
    const nodes: StateTree = [];

    const walk = (unit: Unit, nearestSyncedId: number | null): void => {
        let parentForChildren = nearestSyncedId;
        const name = getSyncName(unit);
        if (name !== undefined) {
            if (unit._.sync.id === null) {
                unit._.sync.id = Unit.syncIdCounter++;
            }
            nodes.push({
                id: unit._.sync.id,
                name,
                parentId: nearestSyncedId,
                state: { ...(unit._.sync.state ?? {}) },
            });
            parentForChildren = unit._.sync.id;
        }
        unit._.children.forEach((child) => walk(child, parentForChildren));
    };

    walk(root, null);
    return nodes;
}

/** client ルートごとに id→Unit のマップを保持する。Unit を汚染しないよう WeakMap に格納する。 */
const reconcileMaps: WeakMap<Unit, Map<number, Unit>> = new WeakMap();

/**
 * Applies a state tree to a client subtree, reconciling create/update/remove.
 * @param root - root unit of the client subtree (owned by the caller)
 * @param tree - state tree captured from the server side (pre-order: parents before children)
 */
export function applyStateTree(root: Unit, tree: StateTree): void {
    let map = reconcileMaps.get(root);
    if (map === undefined) {
        map = new Map();
        reconcileMaps.set(root, map);
    }

    const incoming = new Set<number>(tree.map((node) => node.id));

    // create / update（tree は pre-order なので親が先に存在する）
    for (const node of tree) {
        const existing = map.get(node.id);
        if (existing === undefined) {
            // create
            const parent = node.parentId === null ? root : map.get(node.parentId);
            if (parent === undefined) { continue; }
            const Component = parent._.sync.registry?.getRight(node.name);
            if (Component === undefined) { continue; }   // 親が許可していない型は無視
            // サーバー状態を options.injected で渡す（Unit 構築開始時に _.sync.injected へ退避）。mode は親(client)を継承する。
            const unit = new Unit({ injected: node.state }, parent, Component);
            unit._.sync.id = node.id;
            if (unit._.sync.state === null) { unit._.sync.state = {}; }
            Object.assign(unit._.sync.state, node.state);   // 状態を宣言しない型・欠落キーへの保険
            map.set(node.id, unit);
        } else {
            // update（変更フィールドのみ書き換え）
            // 不変条件: 一度入ったキーは削除されない。capture は全フィールドを毎回送るため、
            // サーバー側で state からキーを「消す」運用をすると client に残り続ける（v1 の割り切り）。
            if (existing._.sync.state === null) { existing._.sync.state = {}; }
            for (const key of Object.keys(node.state)) {
                if (existing._.sync.state[key] !== node.state[key]) {
                    existing._.sync.state[key] = node.state[key];
                }
            }
        }
    }

    // remove（incoming に存在しない id を finalize して map から除去）
    for (const [id, unit] of [...map.entries()]) {
        if (incoming.has(id) === false) {
            unit.finalize();
            map.delete(id);
        }
    }
}

//----------------------------------------------------------------------------------------------------
// イベントチャンネル（socket.io 互換 transport）
//----------------------------------------------------------------------------------------------------

/** socket.io の socket 相当（client 側）。emit で server へ送り、on で server からの push を受ける。 */
export interface ClientSocket {
    id: string;
    emit(event: string, payload?: any): void;
    on(event: string, handler: (payload: any) => void): void;
    off(event: string, handler: (payload: any) => void): void;
    onAny(handler: (event: string, payload: any) => void): void;   // 全イベント受信（dispatcher 用。connect/disconnect は除く）
    disconnect(): void;
}

/** socket.io の io 相当（server 側）。on は (clientId, payload) を受け、emit は全 client へ broadcast。 */
export interface ServerSocket {
    on(event: string, handler: (clientId: string, payload: any) => void): void;
    off(event: string, handler: (clientId: string, payload: any) => void): void;
    emit(event: string, payload?: any): void;                 // broadcast
    to(clientId: string): { emit(event: string, payload?: any): void };
    onAny(handler: (event: string, clientId: string, payload: any) => void): void;   // 全イベント受信（connect/disconnect は除く）
}

export interface Transport { server: ServerSocket; connect(clientId?: string): ClientSocket; }

/**
 * In-memory transport hub. client.emit を server の on ハンドラへ（clientId 付きで）同期配送し、
 * server.emit/to(clientId).emit を client の on ハンドラへ配送する。socket.io アダプタは同じ形を実装すればよい。
 * socket.io 同様、1 イベントに複数ハンドラを登録できる（例: Player ごとに on('move')）。
 */
export function createLoopback(): Transport {
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
        // onAny は app イベントだけ（connect/disconnect は dispatcher が socket.on で別途受ける）。
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
            emit(event, payload) { fireServer(event, clientId, payload); },
            // disconnect 後（clients から削除済み）の on/off は no-op にする（実 socket.io の挙動に合わせる。
            // boot の自動 mirror が finalize で off('sync') を呼ぶため、切断済みでも安全である必要がある）。
            on(event, handler) { const map = clients.get(clientId); if (map !== undefined) { addHandler(map, event, handler); } },
            off(event, handler) { const map = clients.get(clientId); if (map !== undefined) { removeHandler(map, event, handler); } },
            onAny(handler) { clientAnyHandlers.get(clientId)?.add(handler); },
            disconnect() { clients.delete(clientId); clientAnyHandlers.delete(clientId); fireServer('disconnect', clientId); },
        };
    }

    return { server, connect };
}

/**
 * socket.io の io（server）/ socket（client）を Transport 形へ橋渡しするアダプタ。
 * 渡す側を間違えないこと: server プロセスは io を、client は socket を渡す（boot が mode で使う側を選ぶ）。
 * socket.io への import 依存は持たず、メソッド名（on/onAny/emit/to/disconnect）に duck-type で乗るだけ。
 */
export function createSocketioTransport(ioOrSocket: any, opts: { room?: string } = {}): Transport {
    const room = opts.room;
    let serverAdapter: ServerSocket | null = null;
    return {
        // server 側: io.on('connection') ごとに onAny で全イベントを (clientId, payload) へ橋渡しする。
        // room 指定時は「query.room が一致する socket だけ」を扱い、配信も io.to(room) に絞る（複数ルームが
        // 1 つの io を共有するため）。
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
                if (room !== undefined) { socket.join(room); }   // io.to(room) の宛先にする
                bucket('connect').forEach((fn) => fn(socket.id, undefined));
                socket.onAny((event: string, payload: any) => {
                    handlers.get(event)?.forEach((fn) => fn(socket.id, payload));
                    anyHandlers.forEach((fn) => fn(event, socket.id, payload));   // socket.io の onAny は connect/disconnect を含まない
                });
                socket.on('disconnect', () => handlers.get('disconnect')?.forEach((fn) => fn(socket.id, undefined)));
            });
            const target = () => (room !== undefined ? io.to(room) : io);   // broadcast 先（room 指定時はそのルームだけ）
            serverAdapter = {
                on: (event, handler) => bucket(event).add(handler),
                off: (event, handler) => handlers.get(event)?.delete(handler),
                emit: (event, payload) => target().emit(event, payload),
                to: (clientId) => ({ emit: (event, payload) => io.to(clientId).emit(event, payload) }),
                onAny: (handler) => anyHandlers.add(handler),
            };
            return serverAdapter;
        },
        // client 側: socket をそのまま ClientSocket 形に薄くラップする。
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

/** Resolves the socket bound to the caller's sync-tree root (throws if none bound). */
export function getRootSocket(unit: Unit): ClientSocket | ServerSocket {
    const socket = unit._.sync.root?._.sync.socket ?? null;
    if (socket === null) {
        throw new Error('no socket bound to this root; register a transport via xnew.sync.use(transport) before xnew.sync.boot.');
    }
    return socket;
}

/** 既に mirror 済みのルート。boot の自動配線が同一ルートへ二重配線するのを防ぐ（冪等化）。 */
const mirroredRoots: WeakSet<Unit> = new WeakSet();

/**
 * 状態の下り（server→client）を 1 呼び出しで配線する。socket がバインド済みのルートに対して呼ぶ。
 *   - server : 毎 update で capture → emit('sync')（全 client へ broadcast）
 *   - client : on('sync') → apply（自分のツリーへ反映。unit finalize で off）
 *   - null   : 何もしない（standalone）
 * capture/apply/emit/on の合成を隠蔽する薄いヘルパー。同一ルートに 2 度呼んでも 2 度目は no-op
 * （xnew.sync.boot が socket バインド時に自動で呼ぶため。細かい配信制御が要るときは capture/apply を手書きでよい）。
 */
export function mirrorRoot(root: Unit): void {
    if (mirroredRoots.has(root)) {
        return;
    }
    mirroredRoots.add(root);
    if (root._.sync.mode === 'server') {
        const socket = getRootSocket(root) as ServerSocket;
        root.on('update', () => socket.emit('sync', captureStateTree(root)));
    } else if (root._.sync.mode === 'client') {
        const socket = getRootSocket(root) as ClientSocket;
        const handler = (tree: StateTree) => applyStateTree(root, tree);
        socket.on('sync', handler);
        root.on('finalize', () => socket.off('sync', handler));
    }
}

/** 既に dispatcher を設置したルート（boot から二重設置されないように）。 */
const dispatchedRoots: WeakSet<Unit> = new WeakSet();

/**
 * socket で届いたイベントを、対象 unit の `unit.on(event)` リスナへ橋渡しするディスパッチャを設置する。
 * 受け手が xnew.sync.on ではなく unit.on に統一されるため、socket→unit のルーティングをここで担う。
 *   - '-event' … message.syncId と一致する syncId を持つ unit のリスナだけ発火（同一コンポーネント）。
 *   - '+event' / 無印 … この root 配下で該当リスナを持つ全 unit を発火（全体）。
 *   - connect/disconnect（transport 由来）… 同名イベントとして全体配信。
 * handler へは単一オブジェクト { id, ...payload }（id=送信元 clientId, server のみ）を渡す。
 */
export function installSyncDispatch(root: Unit): void {
    if (dispatchedRoots.has(root)) {
        return;
    }
    dispatchedRoots.add(root);
    const socket = getRootSocket(root);
    if (root._.sync.mode === 'server') {
        (socket as ServerSocket).onAny((event, clientId, message) => dispatchSync(root, event, clientId, message));
        socket.on('connect', (clientId) => dispatchSync(root, 'connect', clientId, undefined));
        socket.on('disconnect', (clientId) => dispatchSync(root, 'disconnect', clientId, undefined));
    } else if (root._.sync.mode === 'client') {
        (socket as ClientSocket).onAny((event, message) => dispatchSync(root, event, undefined, message));
    }
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
    const sameComponent = event[0] === '-';
    const syncId = isEnvelope ? message.syncId : undefined;
    targets.forEach((unit) => {
        if (unit._.sync.root !== root) {
            return;   // 別ルート（別 client / server）の unit には配らない
        }
        if (sameComponent && unit._.sync.id !== syncId) {
            return;   // '-' は同一 syncId のみ
        }
        unit._.listeners.get(event)?.forEach((item) => item.execute(props));
    });
}
