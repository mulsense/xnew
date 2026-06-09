import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';
import { getSyncName } from '../../../src/core/sync';

describe('scoped registry isolation', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.rootUnit?.finalize(); jest.useRealTimers(); });

    // 同名 'Child' を 2 つの親がそれぞれ別の実体で登録する
    function ChildA(unit: Unit) { xnew.sync.state({ kind: 'A' }); }
    function ChildB(unit: Unit) { xnew.sync.state({ kind: 'B' }); }
    function ParentA(unit: Unit) { xnew.sync.register({ Child: ChildA }); xnew(ChildA); }
    function ParentB(unit: Unit) { xnew.sync.register({ Child: ChildB }); xnew(ChildB); }

    it('resolves the same name to different components per scope (capture)', () => {
        const root = xnew(function Root() {
            xnew.sync.register({ ParentA, ParentB });
            xnew(ParentA);
            xnew(ParentB);
        });
        const tree = xnew.sync.capture(root);
        const childNodes = tree.filter(n => n.name === 'Child');
        expect(childNodes).toHaveLength(2);
        expect(childNodes.map(n => n.state.kind).sort()).toEqual(['A', 'B']);
    });

    it('apply re-creates each Child with the component its reconciled parent registered', () => {
        const server = xnew.sync.boot('server', function Root() {
            xnew.sync.register({ ParentA, ParentB });
            xnew(ParentA);
            xnew(ParentB);
        });
        const client = xnew.sync.boot('client', function ClientRoot() { xnew.sync.register({ ParentA, ParentB }); });

        xnew.sync.apply(client, xnew.sync.capture(server));

        const replicaA = client._.children.find(c => getSyncName(c) === 'ParentA')!;
        const replicaB = client._.children.find(c => getSyncName(c) === 'ParentB')!;
        expect(replicaA._.children[0]._.Components.includes(ChildA)).toBe(true);
        expect(replicaB._.children[0]._.Components.includes(ChildB)).toBe(true);
        expect(replicaA._.children[0]._.state).toEqual({ kind: 'A' });
        expect(replicaB._.children[0]._.state).toEqual({ kind: 'B' });
    });

    it('a child not registered by its parent is omitted from capture', () => {
        function Loose(unit: Unit) { xnew.sync.state({ v: 1 }); }
        const root = xnew(function Root() { xnew(Loose); });   // Root は Loose を register しない
        const tree = xnew.sync.capture(root);
        expect(tree).toHaveLength(0);
    });

    it('throws when register is called outside a component body', () => {
        const err = jest.spyOn(console, 'error').mockImplementation(() => {});
        function Solo(unit: Unit) {}
        // トップレベル（構築中のユニットが無い）で呼ぶとエラー
        expect(() => xnew.sync.register({ Solo })).toThrow('outside a component');
        err.mockRestore();
    });
});
