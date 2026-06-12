import { Unit } from '../../src/core/unit';
import { xnew } from '../../src/core/xnew';
import { Room } from '../../src/basics/Room';
import { Selectable } from '../../src/basics/Selectable';

// boot 対象の client ツリー（client 側でペインを nest し、Selectable で選択を持つ）。
function World(unit: Unit) {
    xnew.client(() => { xnew.nest('<div>'); xnew.extend(Selectable); });
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
        disconnect: jest.fn(),
        fire(event: string, payload?: any) {
            handlers.get(event)?.forEach((h) => h(payload));
            if (event !== 'connect' && event !== 'disconnect') { anyHandlers.forEach((h) => h(event, payload)); }
        },
    };
}

describe('Room', () => {
    beforeEach(() => { jest.useFakeTimers(); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); document.body.innerHTML = ''; });

    it('delivers socket connect/disconnect/room:notfound to the host (boot parent) unit.on', () => {
        const socket = mockSocket();
        const log: string[] = [];
        xnew(function Scene(unit: Unit) {
            xnew.extend(Room, { mode: 'client', socket, component: World });
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

    it('boots the component as a client tree and selects it', () => {
        const socket = mockSocket();
        let client: any;
        xnew(function Scene(_: Unit) {
            ({ client } = xnew.extend(Room, { mode: 'client', socket, component: World }) as any);
        });
        expect(client.selected).toBe(true);
    });

    it('finalizes the client tree and disconnects the socket on finalize', () => {
        const socket = mockSocket();
        let client: any;
        const scene = xnew(function Scene(_: Unit) {
            ({ client } = xnew.extend(Room, { mode: 'client', socket, component: World }) as any);
        });

        expect(client._.status).not.toBe('finalized');
        scene.finalize();

        expect(socket.disconnect).toHaveBeenCalledTimes(1);
        expect(client._.status).toBe('finalized');
    });

    it('boots in server mode without disconnecting, and finalizes on finalize', () => {
        let client: any;
        const scene = xnew(function Scene(_: Unit) {
            ({ client } = xnew(Room, { mode: 'server', component: World }) as any);
        });

        expect(client._.mode).toBe('server');
        expect(client._.status).not.toBe('finalized');

        scene.finalize();   // server 分岐は disconnect を呼ばず（ServerSocket に無い）booted root を畳むだけ

        expect(client._.status).toBe('finalized');
    });
});
