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
// - captureStateTree   : server サブツリー → SyncNode[](全量)。同期可否・登録名は内部で解決
// - applyStateTree     : SyncNode[] → client サブツリーへ差分適用。node.name は親ユニットの
//                        レジストリで解決し、create 時に new Unit の options.state でサーバー状態をプリシード
//
// イベントチャンネル（socket.io 互換の transport）。client が emit したイベントを server が on で受け取る。
// socket はルート単位にバインドし、socket などのルート情報は syncRoots マップ（root unit をキー）が保持する。
// emit/on は findSyncRoot でカレントユニットのルートを解決して引く。
// 具体的な transport（loopback / socketio）と Transport 形は addons/xsocket.ts に移設した。core は socket
// 契約（ClientSocket / ServerSocket の methods）だけを使う。state の下り（capture/apply）はそのまま。
// on ハンドラは xnew の tick/scope の外で走る点に注意: その中で unit の生成/finalize はせず（spawn は
// tick 内の update で行う）、closure で掴んだ state の書き換えなどプレーンなデータ更新に留める。
// - ClientSocket / ServerSocket / RootSocket : boot が受け取る socket の契約（型のみ）
// - registerSyncRoot       : boot ルートを syncRoots に登録（root → { socket } の関連情報）
// - findSyncRoot           : unit から parent を辿り、属する同期ツリーのルート unit を解決
// - getRootSocket          : ルートにバインド済みの socket を解決（boot が registerSyncRoot で登録する）
// - bootSyncRoot           : socket バインドの boot ルートを生成し socket チャンネルを配線（状態の下り
//                            mirror ＋ socket→unit.on ディスパッチャ。'-event'=同一 syncId / '+event'・無印=全体）
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

export function captureStateTree(root: Unit): StateTree {
    const nodes: StateTree = [];

    // unit が同期対象なら、直接の親ユニットのレジストリ上の登録名（最派生一致）を返す（未登録なら undefined）。
    // 同期可否・登録名は「直接の親ユニットのレジストリ」で決まる。_.Components は [基底..., 実際に
    // インスタンス化した Component] の順なので、最も派生した（= 末尾側の）一致を採る（基底に化けない
    // / extend は最派生名で 1 SyncNode）。
    const syncName = (unit: Unit): string | undefined => {
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
    };

    const walk = (unit: Unit, nearestSyncedId: number | null): void => {
        let parentForChildren = nearestSyncedId;
        const name = syncName(unit);
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
    if (map === undefined) { reconcileMaps.set(root, map = new Map()); }

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
            // サーバー状態を options.state で渡し、構築時に _.sync.state へプリシードする
            // （状態を宣言しない型・欠落キーもこれで埋まる）。mode は親(client)を継承する。
            const unit = new Unit({ state: node.state }, parent, Component);
            unit._.sync.id = node.id;
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
// socket 契約（boot が受け取り、mirror/dispatch が methods を使う）
//
// 具体的な transport（loopback / socketio）と Transport 形（{ server, connect }）は addons/xsocket.ts に
// 移設した。core はこの socket 契約（methods）だけを使い、transport ファクトリには依存しない。
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
 * (2) socket→unit.on のディスパッチャ（受信イベントを対象 unit の `unit.on(event)` リスナへ橋渡し）:
 *   - '-event' … 送信元と同一 syncId の unit のリスナだけ発火（自身）。
 *   - '+event' / 無印 … この root 配下で該当リスナを持つ全 unit を発火（全体）。
 *   - connect/disconnect（transport 由来）… 同名イベントとして全体配信。
 *   handler へは単一オブジェクト { id, ...payload }（id=送信元 clientId, server のみ）を渡す。
 *
 * 各 boot で新しい root を 1 度だけ配線するため、二重配線は起きない（冪等ガード不要）。
 *
 * @param socket  ルートにバインドする socket（server: transport.server / client: transport.connect()）
 * @param parent  生成するルートの親（通常はエンジンルート）
 * @param args    xnew(...) へ転送する引数（Component / target / props）
 */
export function bootSyncRoot(socket: RootSocket, parent: Unit | null, ...args: any[]): Unit {
    const mode = ('to' in socket) ? 'server' : 'client';
    const root = new Unit({ mode, socket }, parent, ...args);

    if (mode === 'server') {
        const server = socket as ServerSocket;
        // (1) 状態の下り: 毎 update で capture → broadcast
        root.on('update', () => server.emit('sync', captureStateTree(root)));
        // (2) ディスパッチャ: 受信イベントを対象 unit の on(event) へ
        server.onAny((event, clientId, message) => dispatchSync(root, event, clientId, message));
        server.on('connect', (clientId) => dispatchSync(root, 'connect', clientId, undefined));
        server.on('disconnect', (clientId) => dispatchSync(root, 'disconnect', clientId, undefined));
    } else {
        const client = socket as ClientSocket;
        // (1) 状態の下り: on('sync') → apply（finalize で解除）
        const handler = (tree: StateTree) => applyStateTree(root, tree);
        client.on('sync', handler);
        root.on('finalize', () => client.off('sync', handler));
        // (2) ディスパッチャ
        client.onAny((event, message) => dispatchSync(root, event, undefined, message));
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
        if (selfOnly && unit._.sync.id !== syncId) {
            return;   // '-event' は同一 syncId のみ（'+event'・無印は素通り＝全体へ）
        }
        unit._.listeners.get(event)?.forEach((item) => item.execute(props));
    });
}
