//----------------------------------------------------------------------------------------------------
// sync — server→client 状態同期エンジン
//
// server ツリーの同期対象状態を SyncNode 列として捕捉し、client ツリーへ差分適用する。
// 同期対象は「直接の親ユニットのレジストリに登録された型」だけ。socket はルート単位にバインドする。
// 注意: socket の on ハンドラは tick/scope の外で走るので、その中で unit の生成/finalize はしない
// （プレーンなデータ更新に留め、spawn は update で行う）。
//
// 通信は socket.io 前提。boot に socket.io の io（server）/ socket（client）をそのまま渡し、bootServerRoot /
// bootClientRoot が直接 io.on('connection') / socket.onAny などを使う（抽象 transport 層は持たない）。
//
// 公開は xnew.sync ファサード（sync）。型 export（BootOptions / ClientInfo）は index.ts が再公開し、syncOf /
// getRootSocket / StateTree / captureStateTree / applyStateTree は Room / テストが使う（capture・apply は
// ファサードには載せない＝アプリは boot の自動 mirror を使う）。register などの helper や SyncNode・SyncData
// 等の型は module 内部のみ。
//
// - sync : xnew.sync ファサード（state / register / emit / client / boot）
// - syncOf / StateTree : unit 単位の同期データ取得 / captureStateTree・applyStateTree が運ぶノード列
// - ClientInfo / getRootSocket / BootOptions : 自分の {id,name} / socket 解決 / boot 入力
//----------------------------------------------------------------------------------------------------

import { Unit } from '../core/unit';
import { getEnvironment } from '../core/env';
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

export function captureStateTree(root: Unit): StateTree {
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
 * apply は client 側でのみ呼ばれる（client が 'sync' を受信したとき）ので、replica は client 環境で構築される。
 */
export function applyStateTree(root: Unit, tree: StateTree): void {
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
}

//----------------------------------------------------------------------------------------------------
// 同期ツリーのルート情報（syncRoots）— socket.io の io(server)/socket(client) をそのまま保持する
//----------------------------------------------------------------------------------------------------

/** この client 自身の identity（{ id, name }）。 */
export interface ClientInfo {
    id: string | undefined;
    name: string | undefined;
}

/** boot ルートに紐づく内部情報。socket.io ハンドルと room / 自分の name を持つ。 */
interface RootInfo {
    socket: any;                         // socket.io の io（server）/ socket（client）
    room: string | undefined;            // server: 配信を絞る room（client は undefined）
    name: string | undefined;            // この client 自身の name（server では undefined）
}

/** boot ルート → 関連情報。findSyncRoot / rootInfoOf / getRootSocket がこれを引く。 */
const syncRoots: WeakMap<Unit, RootInfo> = new WeakMap();

/** unit から遡って最も近い boot ルートを返す（無ければ null）。 */
function findSyncRoot(unit: Unit): Unit | null {
    for (let u: Unit | null = unit; u !== null; u = u._.parent) {
        if (syncRoots.has(u)) { return u; }
    }
    return null;
}

/** caller の sync ルートの内部情報を返す（boot されていなければ throw）。 */
function rootInfoOf(unit: Unit): RootInfo {
    const root = findSyncRoot(unit);
    const info = root !== null ? syncRoots.get(root) : undefined;
    if (info === undefined) {
        throw new Error('no socket bound to this root; create it with xnew.sync.boot({ socket }, ...).');
    }
    return info;
}

/** Resolves the socket.io ハンドル bound to the caller's sync-tree root（無ければ throw）. */
export function getRootSocket(unit: Unit): any {
    return rootInfoOf(unit).socket;
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
    name?: string;       // この client の表示名（xnew.sync.client.name で読める）。
}

/** boot ルート Unit を生成し、socket/room/name を syncRoots へ登録する（server/client 共通の土台）。 */
function createSyncRoot(socket: any, opts: BootOptions, parent: Unit | null, args: any[]): Unit {
    // socket / room / name は unit に保持せず、setup フックで syncRoots へ登録する。
    const info: RootInfo = { socket, room: opts.room, name: opts.name };
    return new Unit({ setup: (unit) => { syncRoots.set(unit, info); } }, parent, ...args);
}

/**
 * server ルートを生成・配線（socket.io の io を直接使う）。下り mirror（update で capture→room へ broadcast）と、
 * io.on('connection') ごとに connect / 全受信イベント / disconnect を clientId 付きで root 配下の unit.on へ配る。
 * room 指定時は query.room が一致する接続だけを扱い、配信も io.to(room) に絞る。
 */
function bootServerRoot(io: any, opts: BootOptions, parent: Unit | null, args: any[]): Unit {
    const root = createSyncRoot(io, opts, parent, args);
    const room = opts.room;
    const target = () => (room !== undefined ? io.to(room) : io);   // 配信は room があれば絞る
    root.on('update', () => target().emit('sync', captureStateTree(root)));
    io.on('connection', (socket: any) => {
        if (room !== undefined && socket.handshake?.query?.room !== room) { return; }   // 別ルームは無視
        if (room !== undefined) { socket.join(room); }
        // connect / 全受信 / disconnect を clientId 付きで配る（host への転送は Room の責務）。
        dispatchSync(root, 'connect', socket.id, undefined);
        socket.onAny((event: string, payload: any) => dispatchSync(root, event, socket.id, payload));
        socket.on('disconnect', () => dispatchSync(root, 'disconnect', socket.id, undefined));
    });
    return root;
}

/** client ルートを生成・配線（socket.io の socket を直接使う）。下り apply（on('sync')→apply）/ 受信を root 配下へ配る。 */
function bootClientRoot(socket: any, opts: BootOptions, parent: Unit | null, args: any[]): Unit {
    const root = createSyncRoot(socket, opts, parent, args);
    const onSync = (tree: StateTree) => applyStateTree(root, tree);
    socket.on('sync', onSync);
    root.on('finalize', () => socket.off('sync', onSync));
    socket.onAny((event: string, payload: any) => dispatchSync(root, event, undefined, payload));
    return root;
}

/** 1 つの受信イベントを、root 配下の該当 unit リスナへ配る。 */
function dispatchSync(root: Unit, event: string, id: string | undefined, message: any): void {
    if (root._.status === 'finalized' || event === 'sync') {
        return;   // 'sync'（状態 mirror の予約イベント）は app ユニットへ配らない
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
// 各メソッドは暗黙の Unit.currentUnit に作用するため、Component 関数 / ハンドラの中から呼ぶ。
//
// - state / register : 同期 state の宣言 / 直接の同期子 {Name: Component} の登録
// - emit / client : イベント送信 / 自分の {id,name}
// - boot             : socket をバインドしたルート生成（server/client は実行環境で自動判定）
//----------------------------------------------------------------------------------------------------

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
        const unit = Unit.currentUnit;
        if (unit._.status !== 'invoked') {
            throw new Error('xnew.sync.register must be called during component initialization.');
        }
        // 呼び出しユニットのレジストリへ {name: Component} を追記する（無ければ生成）。
        const data = syncOf(unit);
        data.registry = Object.assign(data.registry ?? {}, components);
    },
    /** この client 自身の identity（{ id, name }）。server では id/name とも undefined。 */
    get client(): ClientInfo {
        const info = rootInfoOf(Unit.currentUnit);
        return { id: info.socket.id, name: info.name };
    },
    emit(event: string, payload: Record<string, any> = {}): void {
        const unit = Unit.currentUnit;
        const info = rootInfoOf(unit);
        // 送信ユニットの syncId を載せる（受信側の '-event' ルーティング用）。server は room へ broadcast。
        const target = info.room !== undefined ? info.socket.to(info.room) : info.socket;
        target.emit(event, { syncId: syncOf(unit).id, data: payload });
    },
    /**
     * Creates a sync root Unit。mode は実行環境から自動判定する（Node=server / browser=client）。opts.socket は
     * socket.io の io（server）/ socket（client）をそのまま渡す（server は opts.room で接続を絞れる）。残りの
     * 引数は xnew(...) へ転送。server/client の分岐はここ 1 箇所だけ（配線は bootServerRoot / bootClientRoot に委譲）。
     */
    boot(opts: BootOptions, ...args: any[]): Unit {
        if (Unit.engineRoot === undefined) { Unit.reset(); }
        const parent = Unit.currentUnit;
        return getEnvironment() === 'server'
            ? bootServerRoot(opts.socket, opts, parent, args)
            : bootClientRoot(opts.socket, opts, parent, args);
    },
};
