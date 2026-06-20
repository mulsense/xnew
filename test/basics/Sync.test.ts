import { Unit } from '../../src/core/unit';
import { xnew } from '../../src/core/xnew';
import { Lobby, Room } from '../../src/basics/Sync';
import { setEnvironment } from '../../src/core/env';

// boot 対象の client ツリー（client 側でペインを nest する）。
function World(unit: Unit) {
    xnew.client(() => { xnew.nest('<div>'); });
}

// socket.io 互換の最小モック socket。fire でイベントを擬似発火する（onAny は connect/disconnect を含まない）。
function mockSocket() {
    const handlers = new Map<string, Set<Function>>();
    const anyHandlers = new Set<Function>();
    return {
        id: 's1',
        connected: false,
        emit: jest.fn(),
        on(event: string, h: Function) { if (!handlers.has(event)) { handlers.set(event, new Set()); } handlers.get(event)!.add(h); },
        off(event: string, h: Function) { handlers.get(event)?.delete(h); },
        onAny(h: Function) { anyHandlers.add(h); },
        offAny(h: Function) { anyHandlers.delete(h); },
        disconnect: jest.fn(),
        fire(event: string, payload?: any) {
            handlers.get(event)?.forEach((h) => h(payload));
            if (event !== 'connect' && event !== 'disconnect') { anyHandlers.forEach((h) => h(event, payload)); }
        },
    };
}

describe('Lobby', () => {
    beforeEach(() => { jest.useFakeTimers(); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); document.body.innerHTML = ''; });

    it("forwards socket events to the host unit as '-events'", () => {
        const socket = mockSocket();
        const log: string[] = [];
        xnew(function Host(unit: Unit) {
            xnew.extend(Lobby, { socket });
            unit.on('-connect', () => log.push('connect'));
            unit.on('-lobby:rooms', ({ rooms }: any) => log.push(`rooms:${rooms.length}`));
            unit.on('-disconnect', () => log.push('disconnect'));
        });

        socket.fire('connect');
        socket.fire('lobby:rooms', { rooms: [1, 2, 3] });   // onAny 経由（connect/disconnect 以外）
        socket.fire('disconnect');

        expect(log).toEqual(['connect', 'rooms:3', 'disconnect']);
    });

    it('disconnects the socket and stops forwarding on finalize', () => {
        const socket = mockSocket();
        const log: string[] = [];
        const host = xnew(function Host(unit: Unit) {
            xnew.extend(Lobby, { socket });
            unit.on('-connect', () => log.push('connect'));
        });

        host.finalize();
        expect(socket.disconnect).toHaveBeenCalledTimes(1);

        socket.fire('connect');   // ハンドラ解除済みなので host へは届かない
        expect(log).toEqual([]);
    });

    it('exposes create(name) on the host unit that emits room:create', () => {
        const socket = mockSocket();
        const host = xnew(function Host() { xnew.extend(Lobby, { socket }); });
        (host as any).create('my room');
        expect(socket.emit).toHaveBeenCalledWith('room:create', { name: 'my room' });
    });

    it('sends lobby:enter deferred (after host setup, not synchronously)', () => {
        const socket = mockSocket();
        xnew(function Host() { xnew.extend(Lobby, { socket }); });
        expect(socket.emit).not.toHaveBeenCalledWith('lobby:enter');   // 同期では送らない
        jest.advanceTimersByTime(1);
        expect(socket.emit).toHaveBeenCalledWith('lobby:enter');       // 時間差で送られる
    });
});

// server 側 io モック。connection リスナと、接続してくる socket を connect(socket) で擬似発火する。
function mockIo() {
    const connectionHandlers = new Set<Function>();
    const lobbyEmit = jest.fn();
    return {
        on(event: string, h: Function) { if (event === 'connection') { connectionHandlers.add(h); } },
        off(event: string, h: Function) { if (event === 'connection') { connectionHandlers.delete(h); } },
        to(room: string) { return { emit: (event: string, payload?: any) => lobbyEmit(room, event, payload) }; },
        lobbyEmit,
        connect(socket: any) { connectionHandlers.forEach((h) => h(socket)); },
        get connectionCount() { return connectionHandlers.size; },
    };
}

// server 側で接続してくる socket のモック。handshake.query.room の有無でロビー/ルーム接続を切り替える。
function mockConn(roomId?: string) {
    const handlers = new Map<string, Set<Function>>();
    return {
        id: 'c1',
        handshake: { query: roomId !== undefined ? { room: roomId } : {} },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        on(event: string, h: Function) { if (!handlers.has(event)) { handlers.set(event, new Set()); } handlers.get(event)!.add(h); },
        fire(event: string, payload?: any) { handlers.get(event)?.forEach((h) => h(payload)); },
    };
}

describe('Lobby (server)', () => {
    beforeEach(() => { setEnvironment('server'); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); document.body.innerHTML = ''; setEnvironment(null); });

    it('forwards a lobby connection (no room) to the host as -connect with the socket', () => {
        const io = mockIo();
        const conn = mockConn();   // room 無し = ロビー接続
        const seen: any[] = [];
        xnew(function Host(unit: Unit) {
            xnew.extend(Lobby, { socket: io });
            unit.on('-connect', ({ socket }: any) => seen.push(socket));
        });

        io.connect(conn);
        expect(conn.join).toHaveBeenCalledWith('lobby');
        expect(seen).toEqual([conn]);
    });

    it('forwards lobby:enter / room:create from a lobby socket to the host', () => {
        const io = mockIo();
        const conn = mockConn();
        const log: string[] = [];
        xnew(function Host(unit: Unit) {
            xnew.extend(Lobby, { socket: io });
            unit.on('-lobby:enter', ({ socket }: any) => log.push(`enter:${socket.id}`));
            unit.on('-room:create', ({ socket, name }: any) => log.push(`create:${socket.id}:${name}`));
        });

        io.connect(conn);
        conn.fire('lobby:enter');
        conn.fire('room:create', { name: 'my room' });
        expect(log).toEqual(['enter:c1', 'create:c1:my room']);
    });

    it('forwards a room connection (with room) to the host as -room:connect (host validates)', () => {
        const io = mockIo();
        const conn = mockConn('r1');   // room 付き = ルーム接続
        const seen: any[] = [];
        xnew(function Host(unit: Unit) {
            xnew.extend(Lobby, { socket: io });
            unit.on('-room:connect', (payload: any) => seen.push(payload));
        });

        io.connect(conn);
        expect(conn.join).not.toHaveBeenCalled();   // ルーム接続は lobby に join しない
        expect(seen).toHaveLength(1);
        expect(seen[0]).toMatchObject({ socket: conn, roomId: 'r1' });
    });

    it('exposes broadcast(event, payload) that emits to the lobby room', () => {
        const io = mockIo();
        const host = xnew(function Host() { return xnew.extend(Lobby, { socket: io }); });
        (host as any).broadcast('lobby:rooms', { rooms: [1, 2] });
        expect(io.lobbyEmit).toHaveBeenCalledWith('lobby', 'lobby:rooms', { rooms: [1, 2] });
    });

    it('removes the connection listener on finalize', () => {
        const io = mockIo();
        const host = xnew(function Host() { xnew.extend(Lobby, { socket: io }); });
        expect(io.connectionCount).toBe(1);
        host.finalize();
        expect(io.connectionCount).toBe(0);
    });
});

describe('Room', () => {
    beforeEach(() => { jest.useFakeTimers(); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); document.body.innerHTML = ''; setEnvironment(null); });

    it('delivers socket connect/disconnect/room:notfound to the host (boot parent) unit.on', () => {
        const socket = mockSocket();
        const log: string[] = [];
        xnew(function Scene(unit: Unit) {
            xnew.extend(Room, { socket, Component: World });
            // host unit（Scene）= boot 親なので、基本イベントを自身の unit.on で受け取れる。
            unit.on('connect', () => log.push('connect'));
            unit.on('disconnect', () => log.push('disconnect'));
            unit.on('room:notfound', () => log.push('notfound'));
        });

        socket.fire('connect');
        socket.fire('room:notfound', { roomId: 'r1' });
        socket.fire('disconnect');

        expect(log).toEqual(['connect', 'notfound', 'disconnect']);
    });

    it('boots the component as a client tree', () => {
        const socket = mockSocket();
        let client: any;
        xnew(function Scene(_: Unit) {
            ({ client } = xnew.extend(Room, { socket, Component: World }) as any);
        });
        expect((client.element as HTMLElement).tagName).toBe('DIV');   // client 環境: World の client ブロックが nest
        expect(client._.status).not.toBe('finalized');
    });

    it('finalizes the client tree and disconnects the socket on finalize', () => {
        const socket = mockSocket();
        let client: any;
        const scene = xnew(function Scene(_: Unit) {
            ({ client } = xnew.extend(Room, { socket, Component: World }) as any);
        });

        expect(client._.status).not.toBe('finalized');
        scene.finalize();

        expect(socket.disconnect).toHaveBeenCalledTimes(1);
        expect(client._.status).toBe('finalized');
    });

    it('boots in server mode without disconnecting, and finalizes on finalize', () => {
        setEnvironment('server');   // Node 実行を模す（jsdom はそのままだと client 判定）
        const socket = mockSocket();
        let client: any;
        const scene = xnew(function Scene(_: Unit) {
            ({ client } = xnew(Room, { socket, Component: World }) as any);
        });

        expect(client._.status).not.toBe('finalized');

        scene.finalize();   // server 分岐は disconnect を呼ばず（ServerSocket に無い）booted root を畳むだけ

        expect(client._.status).toBe('finalized');
    });
});
