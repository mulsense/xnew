//----------------------------------------------------------------------------------------------------
// sync — server→client 状態同期エンジン
//
// server ツリーの同期対象状態を SyncNode 列として捕捉し、client ツリーへ差分適用する。
// 同期対象は「直接の親ユニットのレジストリに登録された型」だけ。socket はルート単位にバインドする。
// 注意: socket の on ハンドラは tick/scope の外で走るので、その中で unit の生成/finalize はしない
// （プレーンなデータ更新に留め、spawn は update で行う）。
//
// 公開は xnew.sync ファサード（sync）。型 export（ClientSocket / ServerSocket / RootSocket / BootOptions /
// ClientInfo）は index.ts が再公開し、syncOf / getRootSocket / socketio / StateTree は Room / テストが使う。
// capture / apply / register / presence などの helper や SyncNode・SyncData 等の型は module 内部のみ
// （アプリは sync ファサード経由で使う）。
//
// - sync : xnew.sync ファサード（state / register / capture / apply / emit / client / clients / boot）
// - syncOf / StateTree : unit 単位の同期データ取得 / capture・apply が運ぶノード列
// - ClientSocket / ServerSocket / RootSocket / socketio : socket 契約と socket.io アダプタ
// - ClientInfo / getRootSocket / BootOptions : presence 公開情報 / socket 解決 / boot 入力
//----------------------------------------------------------------------------------------------------

import { Unit } from '../core/unit';
import { getEnvironment, withEnvironment } from '../core/env';
import { getOrCreate } from '../core/map';

interface SyncNode { id: number; name: string; parentId: number | null; state: Record<string, any>; }
export type StateTree = SyncNode[];

/** ユニット単位の同期レジストリ。name → Component の素のマップ（Component → name の逆引きは線形探索）。 */
type SyncRegistry = Record<string, Function>;

//----------------------------------------------------------------------------------------------------
// per-unit sync data — Unit を汚染しないよう WeakMap で保持（Unit は sync を一切知らない）
//----------------------------------------------------------------------------------------------------

/** 1 unit 分の同期データ。 */
interface SyncData {
    id: number | null;                 // 同期ノード id（capture 時に採番）
    state: Record<string, any> | null; // synced state（sync.state で宣言 / apply がプリシード）
    registry: SyncRegistry | null;     // 直接の同期子として許可する {name: Component}
}

const syncData: WeakMap<Unit, SyncData> = new WeakMap();

/** unit の同期データを返す（無ければ遅延生成。返り値は可変で直接読み書きしてよい）。 */
export function syncOf(unit: Unit): SyncData {
    return getOrCreate(syncData, unit, () => ({ id: null, state: null, registry: null }));
}

// 同期ノード id の採番カウンタ（identity 用。順序保証は不要で reset を跨いで単調増加でよい）。
let syncIdCounter = 1;

/** 呼び出しユニットのレジストリへ {name: Component} を追記する（無ければ生成）。 */
function registerOnUnit(unit: Unit, components: Record<string, Function>): void {
    const data = syncOf(unit);
    data.registry = Object.assign(data.registry ?? {}, components);
}

function captureStateTree(root: Unit): StateTree {
    const nodes: StateTree = [];

    // 直接の親のレジストリ上の登録名（未登録なら undefined = 同期対象外）。
    // _.Components は [基底..., 最派生] 順なので末尾側の一致を採る（extend は最派生名で 1 SyncNode）。
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

/**
 * Applies a state tree to a client subtree（create/update/remove の差分適用。tree は pre-order）。
 * apply は本質的に client 側の操作（server は capture）なので、replica の構築は常に client 環境で行う
 * （withEnvironment）。production の client では no-op だが、server の自動 broadcast から同期適用される
 * テスト文脈でも replica の client ブロックが正しく走る。
 */
function applyStateTree(root: Unit, tree: StateTree): void {
    withEnvironment('client', () => {
        const map = getOrCreate(reconcileMaps, root, () => new Map<number, Unit>());
        const incoming = new Set<number>(tree.map((node) => node.id));

        // create / update（tree は pre-order なので親が先に存在する）
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
            if (!Component) { continue; }   // 親が無い / 親が許可していない型は無視
            // setup でサーバー状態をプリシード（body より前に走るので欠落キーも埋まる）。
            const unit = new Unit({ setup: (u) => { syncOf(u).state = { ...node.state }; } }, parent, Component);
            syncOf(unit).id = node.id;
            map.set(node.id, unit);
        }

        // remove: tree から消えた id の replica を畳む
        for (const [id, unit] of [...map.entries()]) {
            if (!incoming.has(id)) { unit.finalize(); map.delete(id); }
        }
    });
}

//----------------------------------------------------------------------------------------------------
// socket 契約 — boot / mirror / dispatch はこの契約だけを使う（実装はファイル末尾の transport）
//----------------------------------------------------------------------------------------------------

/** socket.io の socket 相当（client 側）。onAny は connect/disconnect を含まない。 */
export interface ClientSocket {
    id: string;
    emit(event: string, payload?: any): void;
    on(event: string, handler: (payload: any) => void): void;
    off(event: string, handler: (payload: any) => void): void;
    onAny(handler: (event: string, payload: any) => void): void;
    disconnect(): void;
}

/** socket.io の io 相当（server 側）。on は (clientId, payload) を受け、emit は broadcast。 */
export interface ServerSocket {
    on(event: string, handler: (clientId: string, payload: any) => void): void;
    off(event: string, handler: (clientId: string, payload: any) => void): void;
    emit(event: string, payload?: any): void;                 // broadcast
    to(clientId: string): { emit(event: string, payload?: any): void };
    onAny(handler: (event: string, clientId: string, payload: any) => void): void;
}

/** boot ルートにバインドされる socket。 */
export type RootSocket = ClientSocket | ServerSocket;

//----------------------------------------------------------------------------------------------------
// 同期ツリーのルート情報（syncRoots）
//----------------------------------------------------------------------------------------------------

/** 1 接続者の公開情報（presence のエントリ／自分自身）。 */
export interface ClientInfo {
    id: string | undefined;
    name: string | undefined;
}

/** boot ルートに紐づく内部情報。socket・自分の name・presence 名簿を持つ。 */
interface RootInfo {
    socket: RootSocket | null;
    name: string | undefined;            // この client 自身の name（server では undefined）
    roster: Map<string, ClientInfo>;     // presence（server が権威、client は mirror）
}

/** boot ルート → 関連情報。findSyncRoot / getRootSocket / getRootClient(s) がこれを引く。 */
const syncRoots: WeakMap<Unit, RootInfo> = new WeakMap();

/** unit のリスナへ props を配る（dispatchSync が使う）。 */
function deliver(unit: Unit, event: string, props: any): void {
    unit._.listeners.get(event)?.forEach((item) => item.execute(props));
}

/** unit から遡って最も近い boot ルートを返す（無ければ null）。 */
function findSyncRoot(unit: Unit): Unit | null {
    for (let u: Unit | null = unit; u !== null; u = u._.parent) {
        if (syncRoots.has(u)) { return u; }
    }
    return null;
}

/** caller の sync ルートの内部情報を返す（socket 未バインドなら throw）。 */
function rootInfoOf(unit: Unit): RootInfo {
    const root = findSyncRoot(unit);
    const info = root !== null ? syncRoots.get(root) : undefined;
    if (info === undefined || info.socket === null) {
        throw new Error('no socket bound to this root; create it with xnew.sync.boot({ socket }, ...).');
    }
    return info;
}

/** Resolves the socket bound to the caller's sync-tree root（無ければ throw）. */
export function getRootSocket(unit: Unit): RootSocket {
    return rootInfoOf(unit).socket as RootSocket;
}

/** この client 自身の identity（{ id, name }）。server では id/name とも undefined。 */
function getRootClient(unit: Unit): ClientInfo {
    const info = rootInfoOf(unit);
    return { id: (info.socket as any).id, name: info.name };
}

/** 同じ room の全接続者（presence 名簿のスナップショット）。 */
function getRootClients(unit: Unit): ClientInfo[] {
    return [...rootInfoOf(unit).roster.values()];
}

//----------------------------------------------------------------------------------------------------
// boot — ルート生成 + 配線。server/client の分岐は sync.boot の 1 箇所だけ（→ ファサード末尾）。
// 配線は 2 つ: (1) 状態の下り mirror（server=update で capture→broadcast / client=on('sync')→apply）
// (2) dispatcher（受信を root 配下の unit.on へ。'-event'=同一 syncId / '+'・無印=全体。server は connect/
//     disconnect も root 配下へ配る）。基本イベントの host(boot 親) への転送は basics/Sync.ts Room が担う。
//----------------------------------------------------------------------------------------------------

/** xnew.sync.boot の入力。socket は必須（socket.io の io / socket）。mode は実行環境から自動判定する。 */
export interface BootOptions {
    socket: any;         // socket.io の io（server）/ socket（client）。
    room?: string;       // server のときだけ意味を持つ（接続を query.room で絞る）。
    name?: string;       // この client の表示名（presence に載り、xnew.sync.client.name で読める）。
}

/** boot ルート Unit と RootInfo を生成して syncRoots へ登録する（server/client 共通の土台）。 */
function createSyncRoot(socket: RootSocket, opts: BootOptions, parent: Unit | null, args: any[]): { root: Unit; info: RootInfo } {
    // socket / name / roster は unit に保持せず、setup フックで syncRoots へ登録する。
    const info: RootInfo = { socket, name: opts.name, roster: new Map() };
    const root = new Unit({ setup: (unit) => { syncRoots.set(unit, info); } }, parent, ...args);
    return { root, info };
}

/** server ルートを生成・配線。下り mirror / dispatcher / presence（名簿更新→broadcast）。 */
function bootServerRoot(server: ServerSocket, opts: BootOptions, parent: Unit | null, args: any[]): Unit {
    const { root, info } = createSyncRoot(server, opts, parent, args);
    const broadcastRoster = () => server.emit('sync:roster', { clients: [...info.roster.values()] });
    // connect/disconnect は名簿更新 + broadcast に加え、root 配下の unit.on へ配る（host への転送は Room の責務）。
    const presence = (event: 'connect' | 'disconnect', clientId: string) => {
        broadcastRoster();
        dispatchSync(root, event, clientId, undefined);
    };
    root.on('update', () => server.emit('sync', captureStateTree(root)));
    server.onAny((event, clientId, message) => dispatchSync(root, event, clientId, message));
    server.on('connect', (clientId) => { info.roster.set(clientId, { id: clientId, name: undefined }); presence('connect', clientId); });
    server.on('disconnect', (clientId) => { info.roster.delete(clientId); presence('disconnect', clientId); });
    server.on('sync:hello', (clientId, payload) => {
        info.roster.set(clientId, { id: clientId, name: payload?.name });
        broadcastRoster();
    });
    return root;
}

/** client ルートを生成・配線。下り apply / dispatcher / presence mirror + hello 申告。 */
function bootClientRoot(client: ClientSocket, opts: BootOptions, parent: Unit | null, args: any[]): Unit {
    const { root, info } = createSyncRoot(client, opts, parent, args);
    const onSync = (tree: StateTree) => applyStateTree(root, tree);
    client.on('sync', onSync);
    root.on('finalize', () => client.off('sync', onSync));
    client.onAny((event, message) => dispatchSync(root, event, undefined, message));
    // presence: 受け取った名簿を mirror する。
    client.on('sync:roster', (payload: any) => {
        info.roster.clear();
        for (const c of (Array.isArray(payload?.clients) ? payload.clients : [])) { info.roster.set(c.id, { id: c.id, name: c.name }); }
    });
    // 自分の name を hello で申告（roster ハンドラ登録後。前提: server を先に boot）。
    const sendHello = () => client.emit('sync:hello', { name: info.name });
    if ((client as any).id) { sendHello(); }   // 既に接続済みの socket なら即申告
    client.on('connect', sendHello);           // socket.io の初回 / 再接続で申告
    return root;
}

/** 1 つの受信イベントを、root 配下の該当 unit リスナへ配る。 */
function dispatchSync(root: Unit, event: string, id: string | undefined, message: any): void {
    if (root._.status === 'finalized' || event.startsWith('sync:')) {
        return;   // 'sync:hello' / 'sync:roster' などの予約イベントは app ユニットへ配らない
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
        deliver(unit, event, props);
    });
}

//----------------------------------------------------------------------------------------------------
// transport — socket 契約の具体実装（socketio）。socket.io への import 依存は持たず
// メソッド名（on/onAny/emit/to/disconnect）に duck-type で乗る。
//----------------------------------------------------------------------------------------------------

/** transport の口。server は権威側 socket、connect() は client 側 socket を返す。 */
interface Transport {
    server: ServerSocket;
    connect(clientId?: string): ClientSocket;
}

type BusHandler = (...args: any[]) => void;
type BusAnyHandler = (event: string, ...args: any[]) => void;

/** event→handler 群 + onAny の最小バス。socketio の server が使う。 */
function eventBus() {
    const handlers = new Map<string, Set<BusHandler>>();
    const anyHandlers = new Set<BusAnyHandler>();
    return {
        on(event: string, handler: BusHandler): void { getOrCreate(handlers, event, () => new Set<BusHandler>()).add(handler); },
        off(event: string, handler: BusHandler): void { handlers.get(event)?.delete(handler); },
        onAny(handler: BusAnyHandler): void { anyHandlers.add(handler); },
        // event のハンドラへ args を配る。withAny=true なら onAny にも (event, ...args) で配る。
        fire(event: string, withAny: boolean, ...args: any[]): void {
            handlers.get(event)?.forEach((handler) => handler(...args));
            if (withAny) { anyHandlers.forEach((handler) => handler(event, ...args)); }
        },
    };
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
            const bus = eventBus();
            io.on('connection', (socket: any) => {
                if (room !== undefined && socket.handshake?.query?.room !== room) { return; }   // 別ルームは無視
                if (room !== undefined) { socket.join(room); }
                bus.fire('connect', false, socket.id, undefined);
                socket.onAny((event: string, payload: any) => bus.fire(event, true, socket.id, payload));
                socket.on('disconnect', () => bus.fire('disconnect', false, socket.id, undefined));
            });
            const target = () => (room !== undefined ? io.to(room) : io);
            return serverAdapter = {
                on: bus.on,
                off: bus.off,
                emit: (event, payload) => target().emit(event, payload),
                to: (clientId) => ({ emit: (event, payload) => io.to(clientId).emit(event, payload) }),
                onAny: bus.onAny,
            };
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

//----------------------------------------------------------------------------------------------------
// xnew.sync facade — index.ts が xnew へ attach する（audio / image と同じ後付けパターン）。
// 各メソッドは暗黙の Unit.currentUnit に作用するため、Component 関数 / ハンドラの中から呼ぶ。
//
// - state / register : 同期 state の宣言 / 直接の同期子 {Name: Component} の登録
// - capture / apply  : 手動同期用（boot の自動 mirror を使わない場合）
// - emit / client / clients : イベント送信 / 自分の {id,name} / 同 room の全接続者
// - boot             : socket をバインドしたルート生成（server/client は実行環境で自動判定）
//----------------------------------------------------------------------------------------------------

/** Component / ハンドラ内であることを保証して currentUnit を返す（外だと throw）。 */
function activeUnit(api: string): Unit {
    if (Unit.currentUnit === null) {
        throw new Error(`xnew.sync.${api} can not be called outside a component.`);
    }
    return Unit.currentUnit;
}

export const sync = {
    state(initial: Record<string, any> = {}): Record<string, any> {
        const data = syncOf(Unit.currentUnit);
        data.state ??= {};
        // 既存キーは尊重し、無いキーだけ initial で埋める（apply のプリシードや先行宣言を優先）。
        for (const key of Object.keys(initial)) {
            if (!(key in data.state)) { data.state[key] = initial[key]; }
        }
        return data.state;
    },
    register(components: Record<string, Function>): void {
        if (Unit.currentUnit == null || Unit.currentUnit._.status !== 'invoked') {
            throw new Error('xnew.sync.register can not be called outside a component.');
        }
        registerOnUnit(Unit.currentUnit, components);
    },
    capture(root: Unit): StateTree {
        return captureStateTree(root);
    },
    apply(root: Unit, tree: StateTree): void {
        applyStateTree(root, tree);
    },
    /** この client 自身の identity（{ id, name }）。server では id/name とも undefined。 */
    get client(): ClientInfo {
        return getRootClient(activeUnit('client'));
    },
    /** 同じ room の全接続者（presence 名簿。name は入室時に boot / Room の name で設定）。 */
    get clients(): ReadonlyArray<ClientInfo> {
        return getRootClients(activeUnit('clients'));
    },
    emit(event: string, payload: Record<string, any> = {}): void {
        const unit = activeUnit('emit');
        // 送信ユニットの syncId を載せる（受信側の '-event' ルーティング用）。
        getRootSocket(unit).emit(event, { syncId: syncOf(unit).id, data: payload });
    },
    /**
     * Creates a sync root Unit。mode は実行環境から自動判定する（Node=server / browser=client）。transport は
     * opts.socket を socketio でラップして得る（server は opts.room で接続を絞れる）。残りの引数は xnew(...)
     * へ転送。server/client の分岐はここ 1 箇所だけ（配線は bootServerRoot / bootClientRoot に委譲）。
     */
    boot(opts: BootOptions, ...args: any[]): Unit {
        if (Unit.engineRoot === undefined) { Unit.reset(); }
        const parent = Unit.currentUnit;
        const transport = socketio(opts.socket, opts.room !== undefined ? { room: opts.room } : {});
        return getEnvironment() === 'server'
            ? bootServerRoot(transport.server, opts, parent, args)
            : bootClientRoot(transport.connect(), opts, parent, args);
    },
};
