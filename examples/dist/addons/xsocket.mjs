import xnew from '@mulsense/xnew';

function loopback() {
    const serverHandlers = new Map();
    const clients = new Map();
    const serverAnyHandlers = new Set();
    const clientAnyHandlers = new Map();
    let seq = 0;
    const addHandler = (map, event, handler) => {
        if (map.has(event) === false) {
            map.set(event, new Set());
        }
        map.get(event).add(handler);
    };
    const removeHandler = (map, event, handler) => {
        var _a;
        (_a = map.get(event)) === null || _a === void 0 ? void 0 : _a.delete(handler);
    };
    const fireServer = (event, clientId, payload) => {
        var _a;
        (_a = serverHandlers.get(event)) === null || _a === void 0 ? void 0 : _a.forEach((handler) => handler(clientId, payload));
        if (event !== 'connect' && event !== 'disconnect') {
            serverAnyHandlers.forEach((handler) => handler(event, clientId, payload));
        }
    };
    const fireClient = (clientId, event, payload) => {
        var _a, _b, _c;
        (_b = (_a = clients.get(clientId)) === null || _a === void 0 ? void 0 : _a.get(event)) === null || _b === void 0 ? void 0 : _b.forEach((handler) => handler(payload));
        (_c = clientAnyHandlers.get(clientId)) === null || _c === void 0 ? void 0 : _c.forEach((handler) => handler(event, payload));
    };
    const server = {
        on(event, handler) { addHandler(serverHandlers, event, handler); },
        off(event, handler) { removeHandler(serverHandlers, event, handler); },
        emit(event, payload) { for (const clientId of clients.keys()) {
            fireClient(clientId, event, payload);
        } },
        to(clientId) { return { emit(event, payload) { fireClient(clientId, event, payload); } }; },
        onAny(handler) { serverAnyHandlers.add(handler); },
    };
    function connect(clientId) {
        if (clientId === undefined) {
            clientId = 'c' + (++seq);
        }
        clients.set(clientId, new Map());
        clientAnyHandlers.set(clientId, new Set());
        fireServer('connect', clientId);
        return {
            id: clientId,
            emit(event, payload) { fireServer(event, clientId, payload); },
            on(event, handler) { const map = clients.get(clientId); if (map !== undefined) {
                addHandler(map, event, handler);
            } },
            off(event, handler) { const map = clients.get(clientId); if (map !== undefined) {
                removeHandler(map, event, handler);
            } },
            onAny(handler) { var _a; (_a = clientAnyHandlers.get(clientId)) === null || _a === void 0 ? void 0 : _a.add(handler); },
            disconnect() { clients.delete(clientId); clientAnyHandlers.delete(clientId); fireServer('disconnect', clientId); },
        };
    }
    return { server, connect };
}
function socketio(ioOrSocket, opts = {}) {
    const room = opts.room;
    let serverAdapter = null;
    return {
        get server() {
            if (serverAdapter !== null) {
                return serverAdapter;
            }
            const io = ioOrSocket;
            const handlers = new Map();
            const anyHandlers = new Set();
            const bucket = (event) => {
                let set = handlers.get(event);
                if (set === undefined) {
                    handlers.set(event, set = new Set());
                }
                return set;
            };
            io.on('connection', (socket) => {
                var _a, _b;
                if (room !== undefined && ((_b = (_a = socket.handshake) === null || _a === void 0 ? void 0 : _a.query) === null || _b === void 0 ? void 0 : _b.room) !== room) {
                    return;
                }
                if (room !== undefined) {
                    socket.join(room);
                }
                bucket('connect').forEach((fn) => fn(socket.id, undefined));
                socket.onAny((event, payload) => {
                    var _a;
                    (_a = handlers.get(event)) === null || _a === void 0 ? void 0 : _a.forEach((fn) => fn(socket.id, payload));
                    anyHandlers.forEach((fn) => fn(event, socket.id, payload));
                });
                socket.on('disconnect', () => { var _a; return (_a = handlers.get('disconnect')) === null || _a === void 0 ? void 0 : _a.forEach((fn) => fn(socket.id, undefined)); });
            });
            const target = () => (room !== undefined ? io.to(room) : io);
            serverAdapter = {
                on: (event, handler) => bucket(event).add(handler),
                off: (event, handler) => { var _a; return (_a = handlers.get(event)) === null || _a === void 0 ? void 0 : _a.delete(handler); },
                emit: (event, payload) => target().emit(event, payload),
                to: (clientId) => ({ emit: (event, payload) => io.to(clientId).emit(event, payload) }),
                onAny: (handler) => anyHandlers.add(handler),
            };
            return serverAdapter;
        },
        connect() {
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
function serveRooms(io, options) {
    var _a, _b, _c;
    const component = options.component;
    const maxRooms = (_a = options.maxRooms) !== null && _a !== void 0 ? _a : 20;
    const roomNameMax = (_b = options.roomNameMax) !== null && _b !== void 0 ? _b : 16;
    const graceMs = (_c = options.graceMs) !== null && _c !== void 0 ? _c : 3000;
    const rooms = new Map();
    let nextRoomNum = 0;
    const roomList = () => [...rooms.values()].map((r) => ({ id: r.id, name: r.name, memberCount: r.members.size }));
    const notifyLobby = () => { io.to('lobby').emit('lobby:rooms', { rooms: roomList() }); };
    function createRoom(rawName) {
        if (rooms.size >= maxRooms) {
            return { error: 'ルーム数が上限に達しています' };
        }
        const id = `r${++nextRoomNum}`;
        const name = String(rawName || '').trim().slice(0, roomNameMax) || `Room ${nextRoomNum}`;
        const transport = socketio(io, { room: id });
        const root = xnew.sync.boot(transport.server, component);
        const room = { id, name, transport, root, members: new Set(), graceTimer: null };
        const scheduleCleanup = () => {
            if (room.graceTimer !== null) {
                clearTimeout(room.graceTimer);
            }
            room.graceTimer = setTimeout(() => { if (room.members.size === 0) {
                removeRoom(id);
            } }, graceMs);
        };
        transport.server.on('connect', (clientId) => {
            if (!rooms.has(id)) {
                return;
            }
            if (room.graceTimer !== null) {
                clearTimeout(room.graceTimer);
            }
            room.members.add(clientId);
            notifyLobby();
        });
        transport.server.on('disconnect', (clientId) => {
            if (!rooms.has(id)) {
                return;
            }
            room.members.delete(clientId);
            notifyLobby();
            if (room.members.size === 0) {
                scheduleCleanup();
            }
        });
        scheduleCleanup();
        rooms.set(id, room);
        notifyLobby();
        return { room };
    }
    function removeRoom(id) {
        const room = rooms.get(id);
        if (room === undefined) {
            return;
        }
        if (room.graceTimer !== null) {
            clearTimeout(room.graceTimer);
        }
        rooms.delete(id);
        room.root.finalize();
        notifyLobby();
    }
    io.on('connection', (socket) => {
        var _a, _b;
        const roomId = (_b = (_a = socket.handshake) === null || _a === void 0 ? void 0 : _a.query) === null || _b === void 0 ? void 0 : _b.room;
        if (roomId) {
            if (!rooms.has(roomId)) {
                socket.emit('room:notfound', { roomId });
                socket.disconnect(true);
            }
            return;
        }
        socket.join('lobby');
        socket.emit('lobby:rooms', { rooms: roomList() });
        socket.on('lobby:enter', () => socket.emit('lobby:rooms', { rooms: roomList() }));
        socket.on('room:create', ({ name } = {}) => {
            const { room, error } = createRoom(name !== null && name !== void 0 ? name : '');
            if (error !== undefined) {
                socket.emit('room:error', { message: error });
                return;
            }
            socket.emit('room:created', { roomId: room.id });
        });
    });
}
var xsocket = { loopback, socketio, serveRooms };

export { xsocket as default };
