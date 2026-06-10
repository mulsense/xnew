//----------------------------------------------------------------------------------------------------
// xsocket — socket.io 連携アドオン（xnew.sync の transport + サーバー側ルームホスティング）
//
// xnew.sync.boot(socket, ...) が受け取る socket を供給する transport ファクトリと、その socket を使った
// サーバー側のルーム/ロビー基盤を提供する。socket.io への import 依存は持たず、メソッド名（on/onAny/
// emit/to/disconnect）に duck-type で乗るだけ（socket.io でも互換実装でも動く）。core（xnew.sync）が
// 定義する socket 契約（ClientSocket / ServerSocket）に構造的に適合する Transport を返す。
//
// - Transport   : `{ server, connect(clientId?) }`。server は ServerSocket、connect() は ClientSocket を返す
// - loopback()  : インメモリ transport ハブ（同一プロセスで server↔client を繋ぐ。テスト/擬似用）
// - socketio(ioOrSocket, { room? }) : socket.io の io（server）/ socket（client）を Transport 形へ橋渡し。
//                 `room` 指定で「query.room が一致する接続だけ」を扱い、broadcast も io.to(room) に絞る
// - serveRooms(io, { component, ... }) : ロビー + 動的ルームをサーバーに配線。ルームごとに
//                 socketio(io, { room }) + xnew.sync.boot(transport.server, component) し、人数カウントと
//                 空室の自動掃除まで担う。ゲーム本体（component）は無改変のまま注入する
//
// 関係: boot/getRootSocket（core/sync.ts）は socket の methods を使うだけで、Transport（server+connect）は
//   この addon 固有の概念。core は transport ファクトリに依存しない（依存方向は addon → core の一方向）。
//----------------------------------------------------------------------------------------------------

import xnew from '@mulsense/xnew';
// socket 契約型は core から型のみ import（実行時には消える。dts には inline される）。
// 実行時の値（xnew.sync.boot 等）は外部パッケージ '@mulsense/xnew' から取り、core を二重バンドルしない。
import type { ClientSocket, ServerSocket } from '../core/sync';

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
function loopback(): Transport {
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
function socketio(ioOrSocket: any, opts: { room?: string } = {}): Transport {
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
    root: any;   // xnew.sync.boot が返す World ルート unit
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
function serveRooms(io: any, options: ServeRoomsOptions): void {
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
        const root = xnew.sync.boot(transport.server, component);   // 下りは boot が自動配線
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

export default { loopback, socketio, serveRooms };
