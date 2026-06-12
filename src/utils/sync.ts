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
// - findSyncRoot / getRootSocket / getRootClient / getRootClients : boot ルートの解決と client/presence 取得
// - ClientInfo : 1 接続者の {id, name}（xnew.sync.client / clients が返す）
// - BootOptions / bootSyncRoot / loopbackHub : boot 入力・ルート生成 + 配線・共有 loopback hub
// - Transport / loopback / socketio : transport 実装（in-memory ハブ / socket.io アダプタ）
//----------------------------------------------------------------------------------------------------

import { Unit } from '../core/unit';
import { getOrCreate } from '../core/map';

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
    return getOrCreate(syncData, unit, () => ({ id: null, state: null, registry: null }));
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
    const map = getOrCreate(reconcileMaps, root, () => new Map<number, Unit>());

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

/** boot ルートを登録する（bootSyncRoot から呼ぶ。file 内部専用）。 */
function registerSyncRoot(root: Unit, info: RootInfo): void {
    syncRoots.set(root, info);
}

// 接続まわりの「基本イベント」。dispatchSync（root 配下へ）とは別に、boot を呼んだ親ユニットの
// unit.on(event) へ配る対象。
const BASIC_EVENTS = ['connect', 'disconnect', 'room:notfound'] as const;

/** unit のリスナへ props を配る（dispatchSync / dispatchBasicEvent 共通）。 */
function deliver(unit: Unit, event: string, props: any): void {
    unit._.listeners.get(event)?.forEach((item) => item.execute(props));
}

/** 基本イベントを boot ルートの「外」にいる親ユニット 1 つだけに配る。 */
function dispatchBasicEvent(parent: Unit | null, event: string, payload?: any): void {
    if (parent === null || parent._.status === 'finalized') {
        return;
    }
    const props = (payload !== null && typeof payload === 'object') ? payload : {};
    deliver(parent, event, props);
}

/** unit から遡って最も近い boot ルートを返す（無ければ null）。 */
export function findSyncRoot(unit: Unit): Unit | null {
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
        throw new Error('no socket bound to this root; create it with xnew.sync.boot({ mode }, ...).');
    }
    return info;
}

/** Resolves the socket bound to the caller's sync-tree root（無ければ throw）. */
export function getRootSocket(unit: Unit): RootSocket {
    return rootInfoOf(unit).socket as RootSocket;
}

/** この client 自身の identity（{ id, name }）。server では id/name とも undefined。 */
export function getRootClient(unit: Unit): ClientInfo {
    const info = rootInfoOf(unit);
    return { id: (info.socket as any).id, name: info.name };
}

/** 同じ room の全接続者（presence 名簿のスナップショット）。 */
export function getRootClients(unit: Unit): ClientInfo[] {
    return [...rootInfoOf(unit).roster.values()];
}

/** xnew.sync.boot の入力。mode は必須、socket を渡すと socket.io 経由・省略で in-memory loopback。 */
export interface BootOptions {
    mode: 'server' | 'client';
    socket?: any;        // socket.io の io（server）/ socket（client）。省略時は loopback。
    room?: string;       // server + socket.io のときだけ意味を持つ（接続を query.room で絞る）。
    name?: string;       // この client の表示名（presence に載り、xnew.sync.client.name で読める）。
}

// 同一 engineRoot 配下で socket 省略の boot が共有する in-memory hub。reset で engineRoot が変わると
// WeakMap がミスして作り直されるので、明示リセットは不要（unit.ts は sync を一切知らないまま）。
const loopbackHubs: WeakMap<Unit, Transport> = new WeakMap();

/** 現在の engineRoot に紐づく共有 loopback hub を返す（無ければ生成）。テストが生 socket を得るのにも使う。 */
export function loopbackHub(): Transport {
    return getOrCreate(loopbackHubs, Unit.engineRoot, () => loopback());
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
    // socket / name / roster は unit に保持せず、setup フックで syncRoots へ登録する。
    const info: RootInfo = { socket, name: opts.name, roster: new Map() };
    const root = new Unit({ mode, setup: (unit) => registerSyncRoot(unit, info) }, parent, ...args);

    if (mode === 'server') {
        const server = socket as ServerSocket;
        // presence: connect/disconnect/sync:hello で名簿を更新し、変化のたびに全員へ配る。
        const broadcastRoster = () => server.emit('sync:roster', { clients: [...info.roster.values()] });
        root.on('update', () => server.emit('sync', captureStateTree(root)));
        server.onAny((event, clientId, message) => dispatchSync(root, event, clientId, message));
        server.on('connect', (clientId) => {
            info.roster.set(clientId, { id: clientId, name: undefined });
            broadcastRoster();
            dispatchSync(root, 'connect', clientId, undefined);
            dispatchBasicEvent(parent, 'connect', { id: clientId });
        });
        server.on('disconnect', (clientId) => {
            info.roster.delete(clientId);
            broadcastRoster();
            dispatchSync(root, 'disconnect', clientId, undefined);
            dispatchBasicEvent(parent, 'disconnect', { id: clientId });
        });
        server.on('sync:hello', (clientId, payload) => {
            const name = (payload !== null && typeof payload === 'object') ? payload.name : undefined;
            info.roster.set(clientId, { id: clientId, name });
            broadcastRoster();
        });
    } else {
        const client = socket as ClientSocket;
        const handler = (tree: StateTree) => applyStateTree(root, tree);
        client.on('sync', handler);
        root.on('finalize', () => client.off('sync', handler));
        client.onAny((event, message) => dispatchSync(root, event, undefined, message));
        // socket.io の onAny は connect/disconnect を含まないため、基本イベントは明示的に拾う。
        BASIC_EVENTS.forEach((event) => client.on(event, (payload: any) => dispatchBasicEvent(parent, event, payload)));
        // presence: 受け取った名簿を mirror し、自分の name を hello で申告する。
        client.on('sync:roster', (payload: any) => {
            info.roster.clear();
            const list = (payload !== null && typeof payload === 'object' && Array.isArray(payload.clients)) ? payload.clients : [];
            for (const c of list) { info.roster.set(c.id, { id: c.id, name: c.name }); }
        });
        // hello は roster ハンドラ登録後に送る。loopback では connect 時の初回 roster 配信が
        // この登録より前に走るが、その hello への再配信で名簿が追いつく（前提: server を先に boot）。
        const sendHello = () => client.emit('sync:hello', { name: info.name });
        if ((client as any).id) { sendHello(); }   // 接続済み（loopback / 既接続 socket.io）なら即申告
        client.on('connect', sendHello);           // socket.io の初回 / 再接続で申告
    }
    return root;
}

/** 1 つの受信イベントを、root 配下の該当 unit リスナへ配る。 */
function dispatchSync(root: Unit, event: string, id: string | undefined, message: any): void {
    if (root._.status === 'finalized') {
        return;
    }
    if (event.startsWith('sync:')) {
        return;   // 'sync:hello' / 'sync:roster' などの予約イベントは app ユニットへ配らない
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
        deliver(unit, event, props);
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

type BusHandler = (...args: any[]) => void;
type BusAnyHandler = (event: string, ...args: any[]) => void;

/** event→handler 群 + onAny の最小バス。loopback の server / 各 client と socketio の server が共有する。 */
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

// 'connect' / 'disconnect' は onAny に配らない（socket.io の onAny の挙動に合わせる）。
const isAppEvent = (event: string): boolean => event !== 'connect' && event !== 'disconnect';

/** In-memory transport hub（同一プロセスで server↔client を同期配送。テスト/擬似用）。 */
export function loopback(): Transport {
    const serverBus = eventBus();
    const clients = new Map<string, ReturnType<typeof eventBus>>();   // clientId → その client の受信バス
    let seq = 0;   // clientId 自動発番用（'c1', 'c2', ...）

    // server: ハンドラは (clientId, payload) で受け、emit は全 client へ broadcast。
    const server: ServerSocket = {
        on: serverBus.on,
        off: serverBus.off,
        emit(event, payload) { for (const bus of clients.values()) { bus.fire(event, true, payload); } },  // broadcast
        to(clientId) { return { emit(event, payload) { clients.get(clientId)?.fire(event, true, payload); } }; },
        onAny: serverBus.onAny,
    };

    function connect(clientId?: string): ClientSocket {
        if (clientId === undefined) { clientId = 'c' + (++seq); }   // 未指定なら自動発番
        const bus = eventBus();
        clients.set(clientId, bus);
        serverBus.fire('connect', false, clientId, undefined);
        return {
            id: clientId,
            emit(event, payload) { serverBus.fire(event, isAppEvent(event), clientId!, payload); },
            // disconnect 後は bus を消すので on/off/onAny は ?. で no-op（finalize 時の off('sync') が切断済みでも安全）。
            on(event, handler) { clients.get(clientId!)?.on(event, handler); },
            off(event, handler) { clients.get(clientId!)?.off(event, handler); },
            onAny(handler) { clients.get(clientId!)?.onAny(handler); },
            disconnect() { clients.delete(clientId!); serverBus.fire('disconnect', false, clientId!, undefined); },
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
            const bus = eventBus();
            io.on('connection', (socket: any) => {
                if (room !== undefined && socket.handshake?.query?.room !== room) { return; }   // 別ルームは無視
                if (room !== undefined) { socket.join(room); }
                bus.fire('connect', false, socket.id, undefined);
                socket.onAny((event: string, payload: any) => bus.fire(event, true, socket.id, payload));
                socket.on('disconnect', () => bus.fire('disconnect', false, socket.id, undefined));
            });
            const target = () => (room !== undefined ? io.to(room) : io);
            serverAdapter = {
                on: bus.on,
                off: bus.off,
                emit: (event, payload) => target().emit(event, payload),
                to: (clientId) => ({ emit: (event, payload) => io.to(clientId).emit(event, payload) }),
                onAny: bus.onAny,
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

//----------------------------------------------------------------------------------------------------
// xnew.sync facade — index.ts が xnew へ attach する（audio / image と同じ後付けパターン）。
// 各メソッドは暗黙の Unit.currentUnit に作用するため、Component 関数 / ハンドラの中から呼ぶ。
//
// - state / register : 同期 state の宣言 / 直接の同期子 {Name: Component} の登録
// - capture / apply  : 手動同期用（boot の自動 mirror を使わない場合）
// - emit / client / clients : イベント送信 / 自分の {id,name} / 同 room の全接続者
// - boot             : socket をバインドしたルート生成（mode で server/client を指定）
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
        if (data.state === null) {
            data.state = {};
        }
        // 既存キーは尊重し、無いキーだけ initial で埋める（apply のプリシードや先行宣言を優先）。
        for (const key of Object.keys(initial)) {
            if ((key in data.state) === false) {
                data.state[key] = initial[key];
            }
        }
        return data.state;
    },
    register(components: Record<string, Function>): void {
        if (Unit.currentUnit == null || Unit.currentUnit._.status !== 'invoked') {
            throw new Error('xnew.sync.register can not be called outside a component.');
        }
        registerOnUnit(Unit.currentUnit, components);
    },
    capture(root: Unit): ReturnType<typeof captureStateTree> {
        return captureStateTree(root);
    },
    apply(root: Unit, tree: Parameters<typeof applyStateTree>[1]): void {
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
     * Creates a root Unit for `opts.mode`（'server'|'client'）。transport は opts.socket の有無で決まる
     * （省略 = in-memory loopback / 指定 = socket.io。server は opts.room で接続を絞れる）。残りの引数は
     * xnew(...) へ転送。下り mirror と dispatcher の配線は bootSyncRoot が行う。
     */
    boot(opts: BootOptions, ...args: any[]): Unit {
        if (Unit.engineRoot === undefined) { Unit.reset(); }
        return bootSyncRoot(opts, Unit.currentUnit, ...args);
    },
};
