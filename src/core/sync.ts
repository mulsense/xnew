//----------------------------------------------------------------------------------------------------
// sync — server→client 状態同期エンジン（スコープ付きレジストリ）
//
// server ツリーの同期対象状態を SyncNode 列(state tree)として捕捉し、client ツリーへ
// 差分適用(create/update/remove)する。実ネットワークは扱わず、捕捉物の生成と再構成のみを担う。
//
// 同期対象の型は「各コンポーネントが自分の直接の子として登録した型」だけ。登録は Unit 単位で
// 保持し（syncOf(unit).registry）、ある unit の同期可否・登録名は「直接の親ユニットのレジストリ」で解決する。
//
// - SyncData / syncOf  : 旧 Unit._.sync（id/state/registry）を unit キーの WeakMap で保持する口（遅延生成・可変）
// - SyncRegistry / registerOnUnit : ユニット単位の {name ⇄ Component} レジストリ（BiMap）と追記
// - captureStateTree   : server サブツリー → SyncNode[](全量)。同期可否・登録名は内部で解決
// - applyStateTree     : SyncNode[] → client サブツリーへ差分適用。node.name は親ユニットの
//                        レジストリで解決し、create 時に new Unit の options.state でサーバー状態をプリシード
//
// イベントチャンネル（socket.io 互換の transport）。client が emit したイベントを server が on で受け取る。
// socket はルート単位にバインドし、socket などのルート情報は syncRoots マップ（root unit をキー）が保持する。
// emit/on は findSyncRoot でカレントユニットのルートを解決して引く。core は socket 契約（ClientSocket /
// ServerSocket の methods）だけを使い、具体的な transport（loopback / socketio）はその契約を実装する。
// on ハンドラは xnew の tick/scope の外で走る点に注意: その中で unit の生成/finalize はせず（spawn は
// tick 内の update で行う）、closure で掴んだ state の書き換えなどプレーンなデータ更新に留める。
// - ClientSocket / ServerSocket / RootSocket : boot が受け取る socket の契約（型のみ）
// - registerSyncRoot       : boot ルートを syncRoots に登録（root → { socket } の関連情報）
// - findSyncRoot           : unit から parent を辿り、属する同期ツリーのルート unit を解決
// - getRootSocket          : ルートにバインド済みの socket を解決（boot が registerSyncRoot で登録する）
// - bootSyncRoot           : socket バインドの boot ルートを生成し socket チャンネルを配線（状態の下り
//                            mirror ＋ socket→unit.on ディスパッチャ。'-event'=同一 syncId / '+event'・無印=全体）
//
// transport（socket 契約の具体実装）とサーバー側ルームホスティング。socket.io への import 依存は持たず、
// メソッド名（on/onAny/emit/to/disconnect）に duck-type で乗るだけ（socket.io でも互換実装でも動く）。
// - Transport / loopback   : `{ server, connect(clientId?) }` 形と、その in-memory ハブ実装（テスト/擬似用）
// - socketio               : socket.io の io（server）/ socket（client）を Transport 形へ橋渡しするアダプタ
// - RoomInfo / ServeRoomsOptions / serveRooms : ロビー + 動的ルームをサーバーに配線（ルームごとに boot）
//----------------------------------------------------------------------------------------------------

import { Unit } from './unit';
import { BiMap } from './map';

export interface SyncNode { id: number; name: string; parentId: number | null; state: Record<string, any>; }
export type StateTree = SyncNode[];

/** ユニット単位の同期レジストリ。name(left) ⇄ Component(right) の 1:1 双方向マップ。 */
export type SyncRegistry = BiMap<string, Function>;

//----------------------------------------------------------------------------------------------------
// per-unit sync data（旧 Unit._.sync）
//
// id/state/registry を Unit クラスから切り離し、unit をキーにした WeakMap で保持する。Unit は sync を
// 一切知らない。syncOf(unit) が遅延生成しつつ可変レコードを返すので、呼び出し側はそのフィールドを
// 直接読み書きする（id の採番、state のプリシード/更新、registry への登録すべてここを経由する）。
//----------------------------------------------------------------------------------------------------

/** 1 unit 分の同期データ（旧 Unit._.sync 相当）。 */
export interface SyncData {
    id: number | null;                 // 同期ノード id（capture 時に採番。SyncNode.id と対応）
    state: Record<string, any> | null; // synced state（xnew.sync.state で宣言、または apply がプリシード。null until set）
    registry: SyncRegistry | null;     // このユニットが直接の同期子として許可する {name ⇄ Component}（未登録なら null）
}

/** unit をキーに同期データを保持する（Unit を汚染しないよう WeakMap）。 */
const syncData: WeakMap<Unit, SyncData> = new WeakMap();

/** unit の同期データを返す（無ければ遅延生成）。返り値は可変で、フィールドを直接読み書きしてよい。 */
export function syncOf(unit: Unit): SyncData {
    let data = syncData.get(unit);
    if (data === undefined) {
        syncData.set(unit, data = { id: null, state: null, registry: null });
    }
    return data;
}

// 同期ノード id の採番カウンタ（旧 Unit.syncIdCounter）。capture が新規同期ノードへ連番を振る。
// id はノードの identity であって順序保証は不要なので、エンジン reset 後に 1 へ戻す必要はない。
// よって Unit.reset には依存させず、sync.ts の module スコープで単調増加させる。
let syncIdCounter = 1;

/** 新しい同期ノード id を 1 つ採番して返す（単調増加）。 */
function nextSyncId(): number {
    return syncIdCounter++;
}

/** 呼び出しユニットのレジストリへ {name: Component} を追記する（無ければ生成）。 */
export function registerOnUnit(unit: Unit, components: Record<string, Function>): void {
    const data = syncOf(unit);
    if (data.registry === null) {
        data.registry = new BiMap<string, Function>();
    }
    for (const [name, Component] of Object.entries(components)) {
        data.registry.set(name, Component);
    }
}

export function captureStateTree(root: Unit): StateTree {
    const nodes: StateTree = [];

    // unit が同期対象なら、直接の親ユニットのレジストリ上の登録名（最派生一致）を返す（未登録なら undefined）。
    // 同期可否・登録名は「直接の親ユニットのレジストリ」で決まる。_.Components は [基底..., 実際に
    // インスタンス化した Component] の順なので、最も派生した（= 末尾側の）一致を採る（基底に化けない
    // / extend は最派生名で 1 SyncNode）。
    const syncName = (unit: Unit): string | undefined => {
        const parent = unit._.parent;
        const registry = parent ? syncOf(parent).registry : null;
        if (registry === null) {
            return undefined;
        }
        for (let i = unit._.Components.length - 1; i >= 0; i--) {
            const name = registry.getLeft(unit._.Components[i]);
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

/** client ルートごとに id→Unit のマップを保持する。Unit を汚染しないよう WeakMap に格納する。 */
const reconcileMaps: WeakMap<Unit, Map<number, Unit>> = new WeakMap();

/**
 * Applies a state tree to a client subtree, reconciling create/update/remove.
 * @param root - root unit of the client subtree (owned by the caller)
 * @param tree - state tree captured from the server side (pre-order: parents before children)
 */
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
            const Component = syncOf(parent).registry?.getRight(node.name);
            if (Component === undefined) { continue; }   // 親が許可していない型は無視
            // サーバー状態を setup フックで構築時に sync.state へプリシードする（body より前に走るので
            // 状態を宣言しない型・欠落キーもこれで埋まる）。mode は親(client)を継承する。
            const unit = new Unit({ setup: (u) => { syncOf(u).state = { ...node.state }; } }, parent, Component);
            syncOf(unit).id = node.id;
            map.set(node.id, unit);
        } else {
            // update（変更フィールドのみ書き換え）
            // 不変条件: 一度入ったキーは削除されない。capture は全フィールドを毎回送るため、
            // サーバー側で state からキーを「消す」運用をすると client に残り続ける（v1 の割り切り）。
            const data = syncOf(existing);
            if (data.state === null) { data.state = {}; }
            for (const key of Object.keys(node.state)) {
                if (data.state[key] !== node.state[key]) {
                    data.state[key] = node.state[key];
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
// socket 契約（boot が受け取り、mirror/dispatch が methods を使う）
//
// boot / mirror / dispatch はこの socket 契約（methods）だけを使う。具体的な transport（loopback /
// socketio）と Transport 形（{ server, connect }）はこのファイル末尾で契約を実装する。
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

/** boot ルートにバインドされる socket（server なら ServerSocket / client なら ClientSocket）。 */
export type RootSocket = ClientSocket | ServerSocket;

//----------------------------------------------------------------------------------------------------
// 同期ツリーのルート情報（syncRoots）
//----------------------------------------------------------------------------------------------------

/**
 * boot で生成された同期ツリーのルート → そのルートに紐づく関連情報（socket など）。
 * unit を汚染しないよう WeakMap に置き、ルート判定（findSyncRoot）と socket 解決（getRootSocket）の両方がこれを引く。
 */
const syncRoots: WeakMap<Unit, { socket: RootSocket | null }> = new WeakMap();

/** boot がルートを登録する（xnew.sync.boot から呼ぶ）。root をキーに socket などの関連情報を保持する。 */
export function registerSyncRoot(root: Unit, info: { socket: RootSocket | null }): void {
    syncRoots.set(root, info);
}

/**
 * socket の「基本イベント」一覧。dispatchSync（syncRoot 配下の unit へ）とは別経路で、boot を呼んだ
 * 親ユニット A（= boot ルートの親）の `unit.on(event)` へ配る対象。app ロジックではなく接続まわりの
 * 通知に限る（connect/disconnect は transport 由来、room:notfound は server からの入室不可通知）。
 */
const BASIC_EVENTS = ['connect', 'disconnect', 'room:notfound'] as const;

/**
 * boot ルートの親ユニット A へ socket の基本イベントを配る別経路。dispatchSync は syncRoot 配下の unit に
 * 配るが、こちらは root の「外」にいる親 A 1 つだけに配る（A = xnew.sync.boot を呼んだ unit）。
 * A の `unit.on(event)` リスナを発火し、payload があれば props として渡す。
 */
function dispatchBasicEvent(parent: Unit | null, event: string, payload?: any): void {
    if (parent === null || parent._.status === 'finalized') {
        return;
    }
    const props = (payload !== null && typeof payload === 'object') ? payload : {};
    parent._.listeners.get(event)?.forEach((item) => item.execute(props));
}

/** unit から parent 方向へ遡り、syncRoots に登録された最も近いルート unit を返す（無ければ null）。 */
export function findSyncRoot(unit: Unit): Unit | null {
    for (let u: Unit | null = unit; u !== null; u = u._.parent) {
        if (syncRoots.has(u)) { return u; }
    }
    return null;
}

/** Resolves the socket bound to the caller's sync-tree root (throws if none bound). */
export function getRootSocket(unit: Unit): RootSocket {
    // findSyncRoot は syncRoots.has で見つけたルートを返すので、get は必ず存在する。
    const root = findSyncRoot(unit);
    const socket = root !== null ? syncRoots.get(root)!.socket : null;
    if (socket === null) {
        throw new Error('no socket bound to this root; create it with xnew.sync.boot(socket, ...).');
    }
    return socket;
}

/**
 * socket をバインドした boot ルートを生成し、socket チャンネルを mode 別に一括配線して返す。
 * mode は socket のメンバから判定する（ServerSocket は to() を持つ=server / ClientSocket は
 * disconnect()/id を持つ=client）。socket は unit には保持されず、構築時に boot ルートとして
 * syncRoots へ登録される（子孫は findSyncRoot で解決する）。配線は次の 2 つ:
 *
 * (1) 状態の下り（mirror, server→client）:
 *   - server : 毎 update で capture → emit('sync')（全 client へ broadcast）
 *   - client : on('sync') → apply（自分のツリーへ反映。unit finalize で off）
 *
 * (2) socket→unit.on のディスパッチャ（アプリイベントを root 配下の対象 unit の `unit.on(event)` へ橋渡し）:
 *   - '-event' … 送信元と同一 syncId の unit のリスナだけ発火（自身）。
 *   - '+event' / 無印 … この root 配下で該当リスナを持つ全 unit を発火（全体）。
 *   handler へは単一オブジェクト { id, ...payload }（id=送信元 clientId, server のみ）を渡す。
 *
 * (3) 基本イベント（BASIC_EVENTS = connect / disconnect / room:notfound）は、root 配下ではなく
 *   **boot を呼んだ親ユニット A（= parent）** の `unit.on(event)` へ配る（dispatchBasicEvent）。これにより
 *   syncRoot の外にある scene/host（例: GameScene）が接続まわりの通知を直接受け取れる。server では
 *   connect/disconnect を root 配下（spawn/despawn 用）と親 A の両方へ配る。
 *
 * 各 boot で新しい root を 1 度だけ配線するため、二重配線は起きない（冪等ガード不要）。
 *
 * @param socket  ルートにバインドする socket（server: transport.server / client: transport.connect()）
 * @param parent  生成するルートの親（通常はエンジンルート）
 * @param args    xnew(...) へ転送する引数（Component / target / props）
 */
export function bootSyncRoot(socket: RootSocket, parent: Unit | null, ...args: any[]): Unit {
    const mode = ('to' in socket) ? 'server' : 'client';
    // socket は unit に保持せず、setup フックで syncRoots へ登録する（unit→sync.ts の依存を持たせない）。
    const root = new Unit({ mode, setup: (unit) => registerSyncRoot(unit, { socket }) }, parent, ...args);

    if (mode === 'server') {
        const server = socket as ServerSocket;
        // (1) 状態の下り: 毎 update で capture → broadcast
        root.on('update', () => server.emit('sync', captureStateTree(root)));
        // (2) ディスパッチャ: 受信イベントを対象 unit の on(event) へ
        server.onAny((event, clientId, message) => dispatchSync(root, event, clientId, message));
        // connect/disconnect は root 配下（World 等）へ配り（spawn/despawn 用）、同時に親 A へも基本イベントとして配る。
        server.on('connect', (clientId) => { dispatchSync(root, 'connect', clientId, undefined); dispatchBasicEvent(parent, 'connect'); });
        server.on('disconnect', (clientId) => { dispatchSync(root, 'disconnect', clientId, undefined); dispatchBasicEvent(parent, 'disconnect'); });
    } else {
        const client = socket as ClientSocket;
        // (1) 状態の下り: on('sync') → apply（finalize で解除）
        const handler = (tree: StateTree) => applyStateTree(root, tree);
        client.on('sync', handler);
        root.on('finalize', () => client.off('sync', handler));
        // (2) ディスパッチャ: アプリイベントは root 配下の unit.on へ
        client.onAny((event, message) => dispatchSync(root, event, undefined, message));
        // (3) 基本イベントは boot を呼んだ親ユニット A の unit.on へ配る（root 配下ではなく親へ。socket.io の
        //     onAny は connect/disconnect を含まないため明示。room:notfound は server からの入室不可通知）。
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
    // ルーティング規則（リスナ名は接頭辞込みで一致: on('+event') ⇄ emit('+event')）:
    //   '+event' … root 配下で該当リスナを持つ全 unit へ（全コンポーネント）。
    //   '-event' … 送信元と同一 syncId の unit のみへ（自身）。
    //   無印      … connect/disconnect/join 等のライフサイクル/アプリイベント。'+' と同じく全体扱い。
    const prefix = event[0];
    const selfOnly = prefix === '-';   // '-' のみ自身(同一 syncId)に絞る。'+'・無印は全体
    const syncId = isEnvelope ? message.syncId : undefined;
    targets.forEach((unit) => {
        if (findSyncRoot(unit) !== root) {
            return;   // 別ルート（別 client / server）の unit には配らない
        }
        if (selfOnly && syncOf(unit).id !== syncId) {
            return;   // '-event' は同一 syncId のみ（'+event'・無印は素通り＝全体へ）
        }
        unit._.listeners.get(event)?.forEach((item) => item.execute(props));
    });
}

//----------------------------------------------------------------------------------------------------
// transport — socket 契約の具体実装（loopback / socketio）と Transport 形
//
// boot(socket, ...) が受け取る socket を供給する transport ファクトリ。socket.io への import 依存は持たず、
// メソッド名（on/onAny/emit/to/disconnect）に duck-type で乗るだけ（socket.io でも互換実装でも動く）。
// 上の socket 契約（ClientSocket / ServerSocket）に構造的に適合する Transport を返す。
//----------------------------------------------------------------------------------------------------

/** transport の口。server は権威側 socket、connect() は client 側 socket を（必要なら採番して）返す。 */
export interface Transport {
    server: ServerSocket;
    connect(clientId?: string): ClientSocket;
}

/**
 * In-memory transport hub. client.emit を server の on ハンドラへ（clientId 付きで）同期配送し、
 * server.emit/to(clientId).emit を client の on ハンドラへ配送する。socket.io アダプタは同じ形を実装すればよい。
 * socket.io 同様、1 イベントに複数ハンドラを登録できる（例: Player ごとに on('move')）。
 */
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
            emit(event, payload) { fireServer(event, clientId!, payload); },
            // disconnect 後（clients から削除済み）の on/off は no-op にする（実 socket.io の挙動に合わせる。
            // boot の自動 mirror が finalize で off('sync') を呼ぶため、切断済みでも安全である必要がある）。
            on(event, handler) { const map = clients.get(clientId!); if (map !== undefined) { addHandler(map, event, handler); } },
            off(event, handler) { const map = clients.get(clientId!); if (map !== undefined) { removeHandler(map, event, handler); } },
            onAny(handler) { clientAnyHandlers.get(clientId!)?.add(handler); },
            disconnect() { clients.delete(clientId!); clientAnyHandlers.delete(clientId!); fireServer('disconnect', clientId!); },
        };
    }

    return { server, connect };
}

/**
 * socket.io の io（server）/ socket（client）を Transport 形へ橋渡しするアダプタ。
 * 渡す側を間違えないこと: server プロセスは io を、client は socket を渡す（boot が socket 形で server/client を判定）。
 * socket.io への import 依存は持たず、メソッド名（on/onAny/emit/to/disconnect）に duck-type で乗るだけ。
 */
export function socketio(ioOrSocket: any, opts: { room?: string } = {}): Transport {
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

//----------------------------------------------------------------------------------------------------
// serveRooms — ロビー + 動的ルームのサーバー配線
//----------------------------------------------------------------------------------------------------

/** ロビーへ配る 1 ルームの要約。 */
export interface RoomInfo { id: string; name: string; memberCount: number; }

export interface ServeRoomsOptions {
    /** ルームごとに boot するサーバーツリーのルート component（server/client 共通の World 等）。 */
    component: Function;
    /** 同時ルーム数の上限（default 20）。 */
    maxRooms?: number;
    /** ルーム名の最大長（default 16）。 */
    roomNameMax?: number;
    /** 空室を掃除するまでの猶予 ms（作成直後の無人/全員退出の保険。default 3000）。 */
    graceMs?: number;
}

interface RoomState {
    id: string;
    name: string;
    transport: Transport;
    root: Unit;   // boot が返す World ルート unit
    members: Set<string>;
    graceTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * socket.io の `io` にロビー + 動的ルームを配線する。接続は `query.room` の有無で 2 系統に分かれる:
 *   - ロビー（room 無し） : `lobby:rooms`（一覧配信）/ `room:create`→`room:created`|`room:error`
 *   - ゲーム（room 付き）  : そのルームの component に参加（`socketio(io, { room })` + boot が処理）
 * ルームごとに room スコープの transport で boot するので、auto-mirror は io.to(roomId) にだけ broadcast し、
 * ルーム間で状態が混ざらない。人数は connect/disconnect で数え、空室は猶予後に root.finalize() で掃除する。
 * component（World 等）は無改変で注入できる。
 */
export function serveRooms(io: any, options: ServeRoomsOptions): void {
    const component = options.component;
    const maxRooms = options.maxRooms ?? 20;
    const roomNameMax = options.roomNameMax ?? 16;
    const graceMs = options.graceMs ?? 3000;

    const rooms = new Map<string, RoomState>();
    let nextRoomNum = 0;

    const roomList = (): RoomInfo[] =>
        [...rooms.values()].map((r) => ({ id: r.id, name: r.name, memberCount: r.members.size }));
    const notifyLobby = (): void => { io.to('lobby').emit('lobby:rooms', { rooms: roomList() }); };

    function createRoom(rawName: string): { room?: RoomState; error?: string } {
        if (rooms.size >= maxRooms) {
            return { error: 'ルーム数が上限に達しています' };
        }
        const id = `r${++nextRoomNum}`;
        const name = String(rawName || '').trim().slice(0, roomNameMax) || `Room ${nextRoomNum}`;

        // ★ ルーム対応の肝: room スコープの transport を作り、その server socket で component を boot。
        //   transport は query.room === id の接続だけを扱い、broadcast も io.to(id) に絞る。
        const transport = socketio(io, { room: id });
        if (Unit.engineRoot === undefined) { Unit.reset(); }
        const root = bootSyncRoot(transport.server, Unit.currentUnit, component);   // 下りは boot が自動配線
        const room: RoomState = { id, name, transport, root, members: new Set(), graceTimer: null };

        const scheduleCleanup = (): void => {
            if (room.graceTimer !== null) { clearTimeout(room.graceTimer); }
            room.graceTimer = setTimeout(() => { if (room.members.size === 0) { removeRoom(id); } }, graceMs);
        };
        // 接続/切断で人数を数える（socket.io の connect/disconnect を transport が橋渡し）。component の
        // spawn/despawn は boot のディスパッチャが別途 join/disconnect を配るので、ここは台帳だけ。
        transport.server.on('connect', (clientId: string) => {
            if (!rooms.has(id)) { return; }   // 掃除済みルームへの stale 接続は無視
            if (room.graceTimer !== null) { clearTimeout(room.graceTimer); }
            room.members.add(clientId);
            notifyLobby();
        });
        transport.server.on('disconnect', (clientId: string) => {
            if (!rooms.has(id)) { return; }
            room.members.delete(clientId);
            notifyLobby();
            if (room.members.size === 0) { scheduleCleanup(); }
        });
        scheduleCleanup();   // 作成直後に誰も来なければ猶予後に掃除（最初の connect で解除）
        rooms.set(id, room);
        notifyLobby();
        return { room };
    }

    function removeRoom(id: string): void {
        const room = rooms.get(id);
        if (room === undefined) { return; }
        if (room.graceTimer !== null) { clearTimeout(room.graceTimer); }
        rooms.delete(id);
        room.root.finalize();   // World ツリーを破棄（auto-mirror の購読も外れる）
        notifyLobby();
        // 注（割り切り）: room スコープの io.on('connection') リスナはアダプタ内に残る。消滅ルームへの
        //   接続は下の guard で弾き、上の connect/disconnect も rooms.has で無視するので無害。
    }

    io.on('connection', (socket: any) => {
        const roomId = socket.handshake?.query?.room;

        if (roomId) {
            // 消滅/不正ルームは弾く（正常ルームは room スコープの transport が処理する）。
            if (!rooms.has(roomId)) {
                socket.emit('room:notfound', { roomId });
                socket.disconnect(true);
            }
            return;
        }

        // ---- ロビー接続 ----
        socket.join('lobby');
        socket.emit('lobby:rooms', { rooms: roomList() });
        socket.on('lobby:enter', () => socket.emit('lobby:rooms', { rooms: roomList() }));
        socket.on('room:create', ({ name }: { name?: string } = {}) => {
            const { room, error } = createRoom(name ?? '');
            if (error !== undefined) {
                socket.emit('room:error', { message: error });
                return;
            }
            socket.emit('room:created', { roomId: room!.id });   // 作成者はこの roomId で入室する
        });
    });
}
