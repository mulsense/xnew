//----------------------------------------------------------------------------------------------------
// sync — server→client 状態同期エンジン
//
// server ツリーの同期対象を SyncNode 列として捕捉し client ツリーへ差分適用する。同期対象は
// 「直接の親のレジストリに登録された型」だけ。通信は socket.io 前提で、boot に io（server）/
// socket（client）をそのまま渡す（抽象 transport 層は持たない）。
// 注意: socket の on ハンドラは tick/scope 外で走るので unit の生成/finalize はしない（spawn は update で）。
//
// - sync : xnew.sync ファサード（state / register / emit / status / boot）
// - syncOf / StateTree : unit 単位の同期データ取得 / capture・apply が運ぶノード列
// - SyncStatus / ClientStatus / RoomStatus / BootOptions : ルームのステータス各種 / boot 入力
//----------------------------------------------------------------------------------------------------

import { Unit } from '../core/unit';
import { getEnvironment } from '../core/env';
import { getOrCreate } from '../core/map';

interface SyncNode { id: number; name: string; parentId: number | null; state: Record<string, any>; }
export type StateTree = SyncNode[];

/** ユニット単位の同期レジストリ。name → Component（逆引きは線形探索）。 */
type SyncRegistry = Record<string, Function>;

//----------------------------------------------------------------------------------------------------
// per-unit sync data — Unit を汚染しないよう WeakMap で保持（Unit は sync を知らない）
//----------------------------------------------------------------------------------------------------

/** 1 unit 分の同期データ。 */
interface SyncData {
    id: number | null;                 // 同期ノード id（capture 時に採番）
    state: Record<string, any> | null; // synced state（sync.state で宣言 / apply がプリシード）
    registry: SyncRegistry | null;     // 直接の同期子として許可する {name: Component}
}

const syncData: WeakMap<Unit, SyncData> = new WeakMap();

/** unit の同期データを返す（無ければ遅延生成。可変で直接読み書きしてよい）。 */
export function syncOf(unit: Unit): SyncData {
    return getOrCreate(syncData, unit, () => ({ id: null, state: null, registry: null }));
}

// 同期ノード id の採番カウンタ（identity 用。reset を跨いで単調増加でよい）。
let syncIdCounter = 1;

export function captureStateTree(root: Unit): StateTree {
    const nodes: StateTree = [];

    // 親のレジストリ上の登録名（未登録なら undefined = 同期対象外）。
    // _.Components は [基底..., 最派生] 順なので末尾側の一致を採る。
    const syncName = (unit: Unit): string | undefined => {
        const registry = unit._.parent ? syncOf(unit._.parent).registry : null;
        if (registry === null) { return undefined; }
        const entries = Object.entries(registry);
        for (let i = unit._.Components.length - 1; i >= 0; i--) {
            const hit = entries.find(([, Component]) => Component === unit._.Components[i]);
            if (hit !== undefined) { return hit[0]; }
        }
        return undefined;
    };

    const walk = (unit: Unit, parentId: number | null): void => {
        const data = syncOf(unit);
        const name = syncName(unit);
        if (name !== undefined) {
            data.id ??= syncIdCounter++;
            nodes.push({ id: data.id, name, parentId, state: { ...(data.state ?? {}) } });
            parentId = data.id;
        }
        unit._.children.forEach((child) => walk(child, parentId));
    };

    walk(root, null);
    return nodes;
}

/** client ルートごとの id→Unit マップ。 */
const reconcileMaps: WeakMap<Unit, Map<number, Unit>> = new WeakMap();

/** state tree を client サブツリーへ差分適用（create/update/remove。tree は pre-order で client 側のみ呼ばれる）。 */
export function applyStateTree(root: Unit, tree: StateTree): void {
    const map = getOrCreate(reconcileMaps, root, () => new Map<number, Unit>());
    const incoming = new Set<number>(tree.map((node) => node.id));

    // create / update（pre-order なので親が先に存在する）
    for (const node of tree) {
        const existing = map.get(node.id);
        if (existing !== undefined) {
            // update: 変更フィールドを上書き（一度入ったキーは消さない。v1 の割り切り）
            const data = syncOf(existing);
            data.state = Object.assign(data.state ?? {}, node.state);
            continue;
        }
        const parent = node.parentId === null ? root : map.get(node.parentId);
        const Component = parent && syncOf(parent).registry?.[node.name];
        if (!Component) { continue; }   // 親が無い / 許可していない型は無視
        // setup でサーバー状態をプリシード（body より前に走るので欠落キーも埋まる）。
        const unit = new Unit({ setup: (u) => { syncOf(u).state = { ...node.state }; } }, parent, Component);
        syncOf(unit).id = node.id;
        map.set(node.id, unit);
    }

    // remove: tree から消えた id の replica を畳む
    for (const [id, unit] of [...map.entries()]) {
        if (!incoming.has(id)) { unit.finalize(); map.delete(id); }
    }
}

//----------------------------------------------------------------------------------------------------
// ルート情報（syncRoots）— socket.io の io(server)/socket(client) をそのまま保持する
//----------------------------------------------------------------------------------------------------

/** ルーム内の 1 メンバ。 */
export interface ClientStatus {
    id: string;
    name: string | undefined;
}

/** ルーム自体の情報。 */
export interface RoomStatus {
    id: string | undefined;
    name: string | undefined;
}

/** ルームのステータス。server は { clients } のみ、client は自分の id とルーム情報も持つ。 */
export interface SyncStatus {
    id?: string;              // client: 自分の client id
    clients: ClientStatus[];  // ルーム内メンバ
    room?: RoomStatus;        // client: ルーム情報
}

/** server boot ルートの内部情報。 */
interface ServerRootInfo {
    io: any;                             // socket.io の Server（broadcast 起点）
    room: RoomStatus | undefined;        // 配信を絞る room（無ければ全体）。status.room になる
    clients: Map<string, ClientStatus>;  // 接続中メンバ台帳（socket.id → {id,name}）
}

/** client boot ルートの内部情報。 */
interface ClientRootInfo {
    socket: any;                  // socket.io の Socket
    clients: ClientStatus[];      // server から受信したメンバ一覧
    room: RoomStatus | undefined; // server から受信したルーム情報
}

/** boot ルートの内部情報。server は io、client は socket を持つので 'io' in info で判別する。 */
type RootInfo = ServerRootInfo | ClientRootInfo;

/** boot ルート → 関連情報。findSyncRoot / rootInfoOf がこれを引く。 */
const syncRoots: WeakMap<Unit, RootInfo> = new WeakMap();

/** unit から遡って最も近い boot ルートを返す（無ければ null）。 */
function findSyncRoot(unit: Unit): Unit | null {
    for (let u: Unit | null = unit; u !== null; u = u._.parent) {
        if (syncRoots.has(u)) { return u; }
    }
    return null;
}

/** caller の sync ルートの内部情報を返す（未 boot なら throw）。 */
function rootInfoOf(unit: Unit): RootInfo {
    const root = findSyncRoot(unit);
    const info = root !== null ? syncRoots.get(root) : undefined;
    if (info === undefined) {
        throw new Error('no socket bound to this root; create it with xnew.sync.boot({ socket }, ...).');
    }
    return info;
}

//----------------------------------------------------------------------------------------------------
// boot — ルート生成 + 配線。server/client の分岐は sync.boot の 1 箇所だけ。
// 配線は 2 つ: (1) 状態の下り mirror（server=update で capture→broadcast / client=on('sync')→apply）
// (2) dispatcher（受信を root 配下の unit.on へ。'-event'=同一 syncId / '+'・無印=全体）。
// 基本イベントの host(boot 親) への転送は basics/Sync.ts Room が担う。
//----------------------------------------------------------------------------------------------------

/** xnew.sync.boot の入力。実行環境に応じて io（server）/ socket（client）を渡す。 */
export interface BootOptions {
    io?: any;            // server: socket.io の Server
    socket?: any;        // client: socket.io の Socket
    room?: RoomStatus;   // server のみ。id で query.room を絞り、status.room になる
}

/** server ルートを生成・配線。下り mirror（update で capture→room へ broadcast）と、接続ごとに
 *  connect / 全受信 / disconnect を clientId 付きで root 配下へ配る。room 指定時は query.room 一致だけ扱う。 */
function bootServerRoot(io: any, opts: BootOptions, parent: Unit | null, args: any[]): Unit {
    const room = opts.room;
    const roomId = room?.id;         // socket.io の room（join / filter / broadcast 用 id）
    const info: ServerRootInfo = { io, room, clients: new Map() };
    const root = new Unit({ setup: (unit) => { syncRoots.set(unit, info); } }, parent, ...args);
    const target = () => (roomId !== undefined ? io.to(roomId) : io);   // room があれば配信を絞る
    root.on('update', () => target().emit('sync', captureStateTree(root)));
    // ステータス（メンバ台帳 + ルーム情報）を client へ配信し、サブツリーへ sync.statusupdate を配る。
    const refreshStatus = () => {
        target().emit('status', { clients: [...info.clients.values()], room });
        dispatchSync(root, 'sync.statusupdate', undefined, undefined);
    };
    io.on('connection', (socket: any) => {
        if (roomId !== undefined && socket.handshake?.query?.room !== roomId) { return; }   // 別ルームは無視
        if (roomId !== undefined) { socket.join(roomId); }
        // 接続 → 台帳へ追加し connect / 全受信 / disconnect をサブツリーへ配る（host への転送は Room の責務）。
        info.clients.set(socket.id, { id: socket.id, name: socket.handshake?.query?.name });
        dispatchSync(root, 'sync.connect', socket.id, undefined);
        refreshStatus();
        socket.onAny((event: string, payload: any) => dispatchSync(root, event, socket.id, payload));
        socket.on('disconnect', () => {
            info.clients.delete(socket.id);
            dispatchSync(root, 'sync.disconnect', socket.id, undefined);
            refreshStatus();
        });
    });
    return root;
}

/** client ルートを生成・配線。下り apply（on('sync')）、ステータス取り込み（on('status')）、受信配布を行う。 */
function bootClientRoot(socket: any, parent: Unit | null, args: any[]): Unit {
    const info: ClientRootInfo = { socket, clients: [], room: undefined };
    const root = new Unit({ setup: (unit) => { syncRoots.set(unit, info); } }, parent, ...args);
    const onSync = (tree: StateTree) => applyStateTree(root, tree);
    socket.on('sync', onSync);
    // server からのステータスを取り込み、サブツリーへ sync.statusupdate を配る。
    const onStatus = (status: { clients?: ClientStatus[]; room?: RoomStatus }) => {
        info.clients = status?.clients ?? [];
        info.room = status?.room;
        dispatchSync(root, 'sync.statusupdate', undefined, undefined);
    };
    socket.on('status', onStatus);
    root.on('finalize', () => { socket.off('sync', onSync); socket.off('status', onStatus); });
    socket.onAny((event: string, payload: any) => dispatchSync(root, event, undefined, payload));
    return root;
}

/** 1 つの受信イベントを root 配下の該当 unit リスナへ配る。 */
function dispatchSync(root: Unit, event: string, id: string | undefined, message: any): void {
    if (root._.status === 'finalized' || event === 'sync' || event === 'status') {
        return;   // 'sync' / 'status' は予約イベントなので app ユニットへ配らない
    }
    const isEnvelope = message !== null && typeof message === 'object' && !Array.isArray(message);
    const data = isEnvelope && message.data !== null && typeof message.data === 'object' ? message.data : {};
    const props = { id, ...data };
    const targets = Unit.type2units.get(event);
    if (targets === undefined) { return; }
    // '-event' は送信元と同一 syncId の unit のみ。'+event'・無印は root 配下の全 unit へ。
    const selfOnly = event[0] === '-';
    const syncId = isEnvelope ? message.syncId : undefined;
    targets.forEach((unit) => {
        if (findSyncRoot(unit) !== root) { return; }                  // 別ルートの unit には配らない
        if (selfOnly && syncOf(unit).id !== syncId) { return; }
        unit._.listeners.get(event)?.forEach((item) => item.execute(props));
    });
}

//----------------------------------------------------------------------------------------------------
// xnew.sync facade — index.ts が xnew へ attach する（audio / image と同じ後付けパターン）。
// 各メソッドは暗黙の Unit.currentUnit に作用するため Component 関数 / ハンドラ内から呼ぶ。
//
// - state / register : 同期 state の宣言 / 直接の同期子 {Name: Component} の登録
// - emit / status    : イベント送信 / ルームのステータス（メンバ一覧・ルーム情報・自分の id）
// - boot             : socket をバインドしたルート生成（server/client は実行環境で自動判定）
//----------------------------------------------------------------------------------------------------

export const sync = {
    state(initial: Record<string, any> = {}): Record<string, any> {
        const data = syncOf(Unit.currentUnit);
        data.state ??= {};
        // 既存キーは尊重し、無いキーだけ initial で埋める（apply のプリシード/先行宣言を優先）。
        for (const key of Object.keys(initial)) {
            if (!(key in data.state)) { data.state[key] = initial[key]; }
        }
        return data.state;
    },
    register(components: Record<string, Function>): void {
        const unit = Unit.currentUnit;
        if (unit._.status !== 'invoked') {
            throw new Error('xnew.sync.register must be called during component initialization.');
        }
        // 呼び出しユニットのレジストリへ {name: Component} を追記する（無ければ生成）。
        const data = syncOf(unit);
        data.registry = Object.assign(data.registry ?? {}, components);
    },
    /** ルームのステータス。server は { clients } のみ、client は { id（自分）, clients, room }。 */
    get status(): SyncStatus {
        const info = rootInfoOf(Unit.currentUnit);
        if ('io' in info) {   // server ルート
            return { clients: [...info.clients.values()] };
        }
        return { id: info.socket.id, clients: info.clients, room: info.room };
    },
    emit(event: string, payload: Record<string, any> = {}): void {
        const unit = Unit.currentUnit;
        const info = rootInfoOf(unit);
        const envelope = { syncId: syncOf(unit).id, data: payload };   // syncId は受信側の '-event' ルーティング用
        if ('io' in info) {   // server は room（無ければ全体）へ broadcast、client は自分の socket で送る
            (info.room?.id !== undefined ? info.io.to(info.room.id) : info.io).emit(event, envelope);
        } else {
            info.socket.emit(event, envelope);
        }
    },
    /** sync ルート Unit を生成。実行環境で server(Node)/client(browser) を自動判定し、socket.io ハンドル
     *  （server=opts.io / client=opts.socket）を渡す。残りの引数は xnew(...) へ転送。 */
    boot(opts: BootOptions, ...args: any[]): Unit {
        if (Unit.engineRoot === undefined) { Unit.reset(); }
        const parent = Unit.currentUnit;
        return getEnvironment() === 'server'
            ? bootServerRoot(opts.io, opts, parent, args)
            : bootClientRoot(opts.socket, parent, args);
    },
};
