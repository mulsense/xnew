interface ClientSocket {
    id: string;
    emit(event: string, payload?: any): void;
    on(event: string, handler: (payload: any) => void): void;
    off(event: string, handler: (payload: any) => void): void;
    onAny(handler: (event: string, payload: any) => void): void;
    disconnect(): void;
}
interface ServerSocket {
    on(event: string, handler: (clientId: string, payload: any) => void): void;
    off(event: string, handler: (clientId: string, payload: any) => void): void;
    emit(event: string, payload?: any): void;
    to(clientId: string): {
        emit(event: string, payload?: any): void;
    };
    onAny(handler: (event: string, clientId: string, payload: any) => void): void;
}

interface Transport {
    server: ServerSocket;
    connect(clientId?: string): ClientSocket;
}
declare function loopback(): Transport;
declare function socketio(ioOrSocket: any, opts?: {
    room?: string;
}): Transport;
interface RoomInfo {
    id: string;
    name: string;
    memberCount: number;
}
interface ServeRoomsOptions {
    component: Function;
    maxRooms?: number;
    roomNameMax?: number;
    graceMs?: number;
}
declare function serveRooms(io: any, options: ServeRoomsOptions): void;
declare const _default: {
    loopback: typeof loopback;
    socketio: typeof socketio;
    serveRooms: typeof serveRooms;
};

export { _default as default };
export type { RoomInfo, ServeRoomsOptions, Transport };
