//----------------------------------------------------------------------------------------------------
// sync — server→client 状態同期エンジン
//
// server ツリーの同期対象を SyncNode 列として捕捉し client ツリーへ差分適用する。同期対象は
// 「直接の親のレジストリに登録された型」だけ。通信は socket.io 前提で、boot に io（server）/
// socket（client）をそのまま渡す（抽象 transport 層は持たない）。
// 注意: socket の on ハンドラは tick/scope 外で走るので unit の生成/finalize はしない（spawn は update で）。
//
// - sync : xnew.sync ファサード（state / register / emit / status / boot / server / client）
// - syncOf / setState / setRegister : unit 単位の同期データ取得 / state 補完 / レジストリ追記
// - StateTree : capture・apply が運ぶノード列
// - SyncStatus / ClientData / RoomData : ルームのステータス各種
// - BootServerOptions / BootClientOptions : server / client それぞれの boot 入力
//----------------------------------------------------------------------------------------------------

import { Unit, ComponentFn, DefinesOf, PropsOf } from './unit';
import { getEnvironment } from './env';

interface SyncNode { id: number; name: string; parentId: number | null; state: Record<string, any>; }
export type StateTree = SyncNode[];

interface SyncData {
    id: number | null;                 // 同期ノード id（capture 時に採番）
    state: Record<string, any> | null; // synced state（sync.state で宣言 / apply がプリシード）
    registry: Record<string, Function> | null;     // 直接の同期子として許可する {name: Component}
}

const syncData: WeakMap<Unit, SyncData> = new WeakMap();

// apply が unit 生成前に初期 SyncData を仕込むための受け渡し。生成中に走る body の sync.state より前に
// state / id を確定させたいが、生成前は Unit 参照が無く WeakMap に置けない。そこで「次に採番される id」
// (Unit.next) を key にして置き、syncOf が初回生成時に adopt する（id key なので生成途中の再入でも混ざらない）。
const seededData: Map<number, SyncData> = new Map();

/** unit の同期データを返す（無ければ seed を adopt、無ければ空生成。可変で直接読み書きしてよい）。 */
export function syncOf(unit: Unit): SyncData {
    let data = syncData.get(unit);
    if (data === undefined) {
        data = seededData.get(unit._.id) ?? { id: null, state: null, registry: null };
        seededData.delete(unit._.id);
        syncData.set(unit, data);
    }
    return data;
}

/** unit の synced state を取得（既存キーは尊重し、無いキーだけ initial で補完）。 */
export function setState(unit: Unit, initial: Record<string, any>): Record<string, any> {
    const data = syncOf(unit);
    data.state ??= {};
    // 既存キーは尊重し、無いキーだけ initial で埋める（apply のプリシード/先行宣言を優先）。
    for (const key of Object.keys(initial)) {
        if (!(key in data.state)) { data.state[key] = initial[key]; }
    }
    return data.state;
}

/** unit のレジストリへ {name: Component} を追記する（無ければ生成）。 */
export function setRegister(unit: Unit, Components: Record<string, Function>): void {
    const data = syncOf(unit);
    data.registry = Object.assign(data.registry ?? {}, Components);
}

// 同期ノード id の採番カウンタ（identity 用）。root（boot ルート）ごとに独立して単調増加。
// id は root 内で一意なら十分（apply は root 別 reconcileMap、dispatch は root で絞る）。
const syncIdCounters: WeakMap<Unit, number> = new WeakMap();

export function captureStateTree(root: Unit): StateTree {
    const nodes: StateTree = [];
    let nextId = syncIdCounters.get(root) ?? 1;

    // 親のレジストリ上の登録名（未登録なら undefined = 同期対象外）。
    // _.Components は [基底..., 最派生] 順なので末尾側の一致を採る。
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
            nodes.push({ id: data.id, name, parentId, state: { ...(data.state ?? {}) } });
            parentId = data.id;
        }
        unit._.children.forEach((child) => walk(child, parentId));
    };

    walk(root, null);
    syncIdCounters.set(root, nextId);
    return nodes;
}

/** client ルートごとの id→Unit マップ。 */
const reconcileMaps: WeakMap<Unit, Map<number, Unit>> = new WeakMap();

/** state tree を client サブツリーへ差分適用（create/update/remove。tree は pre-order で client 側のみ呼ばれる）。 */
export function applyStateTree(root: Unit, tree: StateTree): void {
    let map = reconcileMaps.get(root);
    if (map === undefined) {
        map = new Map<number, Unit>();
        reconcileMaps.set(root, map);
    }
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
        // 生成前に初期 SyncData（id + server state）を仕込む。生成中の body の sync.state より前に
        // 欠落キーが埋まり、id も確定する。body が syncOf を呼ばなければ直後の syncOf(unit) が adopt する。
        seededData.set(Unit.next, { id: node.id, state: { ...node.state }, registry: null });
        const unit = new Unit(parent, Component);
        syncOf(unit);
        map.set(node.id, unit);
    }

    // remove: tree から消えた id の replica を畳む
    for (const [id, unit] of [...map.entries()]) {
        if (!incoming.has(id)) { unit.finalize(); map.delete(id); }
    }
}

export interface ClientData { id: string; name: string; }
export interface RoomData { id: string; name: string; count: number; }

export interface SyncStatus { room: RoomData; clients: ClientData[]; client: ClientData; }

interface ServerInfo { io: any; room: RoomData; clients: ClientData[]; }
interface ClientInfo { socket: any; room: RoomData; clients: ClientData[]; }

const roots: Map<number, ServerInfo | ClientInfo> = new Map();

/** unit から遡って最も近い boot ルートを返す（無ければ null）。 */
function findSyncRoot(unit: Unit): Unit | null {
    for (let u: Unit | null = unit; u !== null; u = u._.parent) {
        if (roots.has(u._.id)) { return u; }
    }
    return null;
}

/** caller の sync ルートの内部情報を返す（未 boot なら throw）。 */
function rootInfoOf(unit: Unit): ServerInfo | ClientInfo {
    const root = findSyncRoot(unit);
    const info = root !== null ? roots.get(root._.id) : undefined;
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

export interface BootServerOptions { io: any; room: RoomData; }
export interface BootClientOptions { socket: any; room: RoomData; }

function bootServer(opts: BootServerOptions, parent: Unit | null, args: any[]): Unit {
    const { io, room } = opts;
    const info: ServerInfo = { io, room, clients: [] };
    roots.set(Unit.next, info);
    const root = new Unit(parent, ...args);
    root.on('finalize', () => roots.delete(root._.id));
    root.on('update', () => io.to(room.id).emit('sync', captureStateTree(root)));

    io.on('connection', (socket: any) => {
        if (socket.handshake?.query?.room !== room.id) { return; }   // 別ルームは無視
        socket.join(room.id);
        // 接続 → 台帳へ追加し connect / 全受信 / disconnect をサブツリーへ配る（host への転送は Room の責務）。
        info.clients.push({ id: socket.id, name: socket.handshake?.query?.name ?? '' });
        dispatchSync(root, 'sync.connect', socket.id, undefined);
        statusUpdate();
        socket.onAny((event: string, payload: any) => dispatchSync(root, event, socket.id, payload));
        socket.on('disconnect', () => {
            info.clients = info.clients.filter((c) => c.id !== socket.id);
            dispatchSync(root, 'sync.disconnect', socket.id, undefined);
            statusUpdate();
        });
    });
    function statusUpdate() {
        io.to(room.id).emit('status', { clients: info.clients });
        dispatchSync(root, 'sync.statusupdate', undefined, undefined);
    }
    return root;
}

function bootClient(opts: BootClientOptions, parent: Unit | null, args: any[]): Unit {
    const { socket, room } = opts;
    const info: ClientInfo = { socket, clients: [], room };   // room は boot で確定（server は配らない）
    roots.set(Unit.next, info);   // 生成前に「次に採番される id」へ紐付ける
    const root = new Unit(parent, ...args);
    const onSync = (tree: StateTree) => applyStateTree(root, tree);
    socket.on('sync', onSync);
    // server からのメンバ台帳を取り込み、サブツリーへ sync.statusupdate を配る。
    const onStatus = (status: { clients?: ClientData[] }) => {
        info.clients = status?.clients ?? [];
        dispatchSync(root, 'sync.statusupdate', undefined, undefined);
    };
    socket.on('status', onStatus);
    root.on('finalize', () => { socket.off('sync', onSync); socket.off('status', onStatus); roots.delete(root._.id); });
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
        return setState(Unit.currentUnit, initial);
    },
    register(Components: Record<string, Function>): void {
        const unit = Unit.currentUnit;
        if (unit._.status !== 'invoked') {
            throw new Error('xnew.sync.register must be called during component initialization.');
        }
        setRegister(unit, Components);
    },
    get status(): SyncStatus {
        if (getEnvironment() === 'server') {
            const info = rootInfoOf(Unit.currentUnit) as ServerInfo;
            return {
                room: info.room, clients: info.clients,
                get client(): ClientData { throw new Error('sync.status.client is only available on the client side.'); },
            };
        } else {
            const info = rootInfoOf(Unit.currentUnit) as ClientInfo;
            return {
                room: info.room, clients: info.clients,
                get client(): ClientData { return info.clients.find((c) => c.id === info.socket.id) ?? { id: info.socket.id, name: '' }; },
            };
        }
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
        if (getEnvironment() === 'server') {
            return bootServer(opts as BootServerOptions, Unit.currentUnit, args);
        } else {
            return bootClient(opts as BootClientOptions, Unit.currentUnit, args);
        }
    },
};
