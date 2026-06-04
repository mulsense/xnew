import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';
import { resetRegistry } from '../../../src/core/sync';

// 1 関数コンポーネント: server ブロック(update)と client ブロック(描画) を持つ
function Mover(unit: Unit) {
    const state = xnew.state.initialize({ position: 0 });
    xnew.server(() => {
        unit.on('update', () => { state.position += 1; });   // server のみ
    });
    xnew.client(() => {
        const el = xnew.nest('<div>');
        unit.on('render', () => { (el as HTMLElement).style.left = `${state.position}px`; }); // client のみ
    });
}

describe('loopback simulation (server/client blocks)', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); resetRegistry(); Unit.reset(); xnew.config.mode = null; xnew.state.register('Mover', Mover); });
    afterEach(() => { Unit.rootUnit?.finalize(); xnew.config.mode = null; jest.useRealTimers(); });

    it('mirrors server state into the client subtree and renders it', () => {
        xnew.config.mode = 'server';
        const server = xnew(function Server() { xnew(Mover); });
        xnew.config.mode = 'client';
        const client = xnew((u: Unit) => {});
        xnew.config.mode = null;

        function cycle() {
            Unit.start(Unit.rootUnit);
            Unit.update(Unit.rootUnit);                              // server Mover: position += 1
            xnew.state.apply(client, xnew.state.capture(server));    // sync
            Unit.start(Unit.rootUnit);                               // start newly-created replica units
            Unit.render(Unit.rootUnit);                             // replica render
        }

        cycle();
        const replicaMover = client._.children[0];
        expect(replicaMover._.syncState!.position).toBe(1);
        expect((replicaMover.element as HTMLElement).style.left).toBe('1px');   // client block render consumed synced state

        cycle();
        expect(replicaMover._.syncState!.position).toBe(2);
        expect((replicaMover.element as HTMLElement).style.left).toBe('2px');
        expect(client._.children.length).toBe(1);
    });

    it('mirrors spawn and despawn driven from server update', () => {
        function Server(unit: Unit) {
            let spawned = false; let child: Unit | null = null;
            xnew.server(() => {
                unit.on('update', () => {
                    if (!spawned) { child = xnew(Mover) as unknown as Unit; spawned = true; }
                    else if (child) { child.finalize(); child = null; }
                });
            });
        }
        xnew.config.mode = 'server';
        const server = xnew(Server);
        xnew.config.mode = 'client';
        const client = xnew((u: Unit) => {});
        xnew.config.mode = null;

        const sync = () => xnew.state.apply(client, xnew.state.capture(server));
        Unit.start(Unit.rootUnit);
        Unit.update(Unit.rootUnit); sync();
        expect(client._.children.length).toBe(1);    // spawn mirrored
        Unit.update(Unit.rootUnit); sync();
        expect(client._.children.length).toBe(0);     // despawn mirrored
    });
});
