//----------------------------------------------------------------------------------------------------
// sync — server→client 状態同期エンジン
//
// server ツリーの同期対象を SyncNode 列として捕捉し client ツリーへ差分適用する。同期対象は
// 「直接の親のレジストリに登録された型」だけ。通信は socket.io 前提で、boot に io（server）/
// socket（client）をそのまま渡す（抽象 transport 層は持たない）。
// 注意: socket の on ハンドラは tick/scope 外で走るので unit の生成/finalize はしない（spawn は update で）。
//
// - sync : xnew.sync ファサード（state / register / emit / status / boot / server / client）
// - syncOf / StateTree : unit 単位の同期データ取得 / capture・apply が運ぶノード列
// - SyncStatus / ClientData / RoomData : ルームのステータス各種
// - BootServerOptions / BootClientOptions : server / client それぞれの boot 入力
//----------------------------------------------------------------------------------------------------

import { Unit, ComponentFn, DefinesOf, PropsOf } from './unit';
import { getEnvironment } from './env';
import { getOrCreate } from './map';

interface SyncNode { id: number; name: string; parentId: number | null; state: Record<string, any>; }
export type StateTree = SyncNode[];

interface SyncData {
    id: number | null;                 // 同期ノード id（capture 時に採番）
    state: Record<string, any> | null; // synced state（sync.state で宣言 / apply がプリシード）
    registry: Record<string, Function> | null;     // 直接の同期子として許可する {name: Component}
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

export interface ClientData { id: string; name: string; }
export interface RoomData { id: string; name: string; }

export interface SyncStatus { room: RoomData; clients: ClientData[]; client: ClientData; }

interface ServerInfo { io: any; room: RoomData; clients: ClientData[]; }
interface ClientInfo { socket: any; room: RoomData; clients: ClientData[]; }
const syncRoots: WeakMap<Unit, ServerInfo | ClientInfo> = new WeakMap();

/** unit から遡って最も近い boot ルートを返す（無ければ null）。 */
function findSyncRoot(unit: Unit): Unit | null {
    for (let u: Unit | null = unit; u !== null; u = u._.parent) {
        if (syncRoots.has(u)) { return u; }
    }
    return null;
}

/** caller の sync ルートの内部情報を返す（未 boot なら throw）。 */
function rootInfoOf(unit: Unit): ServerInfo | ClientInfo {
    const root = findSyncRoot(unit);
    const info = root !== null ? syncRoots.get(root) : undefined;
    if (info === undefined) {
        throw new Error('no socket bound to this root; create it with xnew.sync.boot({ socket, room }, ...).');
    }
    return info;
}

//----------------------------------------------------------------------------------------------------
// boot — ルート生成 + 配線。server/client の分岐は sync.boot の 1 箇所だけ。
// 配線は 2 つ: (1) 状態の下り mirror（server=update で capture→broadcast / client=on('sync')→apply）
// (2) dispatcher（受信を root 配下の unit.on へ。'-event'=同一 syncId / '+'・無印=全体）。
// 基本イベントの host(boot 親) への転送は basics/sync.ts Room が担う。
//----------------------------------------------------------------------------------------------------

/** server 側 boot の入力。io（socket.io の Server）と、絞り込む room（id で query.room / broadcast を限定）。 */
export interface BootServerOptions {
    io: any;
    room: RoomData;    // id で query.room / broadcast を絞る
}

/** client 側 boot の入力。socket（socket.io の Socket）と、接続先 room（server からの status で上書きされる初期値）。 */
export interface BootClientOptions {
    socket: any;
    room: RoomData;
}

/** server ルートを生成・配線。下り mirror（update で capture→room へ broadcast）と、接続ごとに
 *  connect / 全受信 / disconnect を clientId 付きで root 配下へ配る。room 指定時は query.room 一致だけ扱う。 */
function bootServer(opts: BootServerOptions, parent: Unit | null, args: any[]): Unit {
    const { io, room } = opts;
    const roomId = room.id;          // socket.io の room（join / filter / broadcast 用 id）
    const info: ServerInfo = { io, room, clients: [] };
    const root = new Unit({ setup: (unit) => { syncRoots.set(unit, info); } }, parent, ...args);
    const target = () => io.to(roomId);   // 常に room 単位で配信する
    root.on('update', () => target().emit('sync', captureStateTree(root)));
    // メンバ台帳を client へ配信し、サブツリーへ sync.statusupdate を配る。
    const refreshStatus = () => {
        target().emit('status', { clients: [...info.clients] });
        dispatchSync(root, 'sync.statusupdate', undefined, undefined);
    };
    io.on('connection', (socket: any) => {
        if (socket.handshake?.query?.room !== roomId) { return; }   // 別ルームは無視
        socket.join(roomId);
        // 接続 → 台帳へ追加し connect / 全受信 / disconnect をサブツリーへ配る（host への転送は Room の責務）。
        info.clients.push({ id: socket.id, name: socket.handshake?.query?.name ?? '' });
        dispatchSync(root, 'sync.connect', socket.id, undefined);
        refreshStatus();
        socket.onAny((event: string, payload: any) => dispatchSync(root, event, socket.id, payload));
        socket.on('disconnect', () => {
            info.clients = info.clients.filter((c) => c.id !== socket.id);
            dispatchSync(root, 'sync.disconnect', socket.id, undefined);
            refreshStatus();
        });
    });
    return root;
}

/** client ルートを生成・配線。下り apply（on('sync')）、ステータス取り込み（on('status')）、受信配布を行う。 */
function bootClient(opts: BootClientOptions, parent: Unit | null, args: any[]): Unit {
    const { socket, room } = opts;
    const info: ClientInfo = { socket, clients: [], room };   // room は boot で確定（server は配らない）
    const root = new Unit({ setup: (unit) => { syncRoots.set(unit, info); } }, parent, ...args);
    const onSync = (tree: StateTree) => applyStateTree(root, tree);
    socket.on('sync', onSync);
    // server からのメンバ台帳を取り込み、サブツリーへ sync.statusupdate を配る。
    const onStatus = (status: { clients?: ClientData[] }) => {
        info.clients = status?.clients ?? [];
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
// xnew.sync facade — index.ts が xnew へ attach する後付けパターン。
// 各メソッドは暗黙の Unit.currentUnit に作用するため Component 関数 / ハンドラ内から呼ぶ。
//
// - state / register : 同期 state の宣言 / 直接の同期子 {Name: Component} の登録
// - emit / status    : イベント送信 / ルームのステータス（room・clients は両環境、client は client 環境のみ）
// - boot             : socket をバインドしたルート生成（server/client は実行環境で自動判定）
// - server / client  : 実行環境（Node=server / browser=client）限定の extend ブロック
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
        data.state ??= {};
        // 既存キーは尊重し、無いキーだけ initial で埋める（apply のプリシード/先行宣言を優先）。
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
        // 呼び出しユニットのレジストリへ {name: Component} を追記する（無ければ生成）。
        const data = syncOf(unit);
        data.registry = Object.assign(data.registry ?? {}, Components);
    },
    /** ルームのステータス。room / clients は両環境、client（自分の情報）は client 環境のみ（server は throw）。 */
    get status(): SyncStatus {
        if (getEnvironment() === 'server') {
            const server = rootInfoOf(Unit.currentUnit) as ServerInfo;
            return {
                room: server.room,
                clients: [...server.clients],
                get client(): ClientData { throw new Error('sync.status.client is only available on the client side.'); },
            };
        } else {
            const client = rootInfoOf(Unit.currentUnit) as ClientInfo;
            return {
                room: client.room,
                clients: client.clients,
                // 自分の ClientData。status 受信前（台帳に未掲載）は socket.id から最小形を補う。
                get client(): ClientData { return client.clients.find((c) => c.id === client.socket.id) ?? { id: client.socket.id, name: '' }; },
            };
        }
    },
    emit(event: string, payload: Record<string, any> = {}): void {
        if (getEnvironment() === 'server') {
            const server = rootInfoOf(Unit.currentUnit) as ServerInfo;
            server.io.to(server.room.id).emit(event, { syncId: syncOf(Unit.currentUnit).id, data: payload });
        } else {
            const client = rootInfoOf(Unit.currentUnit) as ClientInfo;
            client.socket.emit(event, { syncId: syncOf(Unit.currentUnit).id, data: payload });
        }
    },
    boot(opts: BootServerOptions | BootClientOptions, ...args: any[]): Unit {
        if (Unit.engineRoot === undefined) { Unit.reset(); }
        if (getEnvironment() === 'server') {
            return bootServer(opts as BootServerOptions, Unit.currentUnit, args);
        } else {
            return bootClient(opts as BootClientOptions, Unit.currentUnit, args);
        }
    },
};
