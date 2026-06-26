import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/index';
import { ioMock, bootClient } from './io-mock';
import { syncOf, StateTree, applyStateTree } from '../../../src/core/sync';

function Box(unit: Unit) {
    xnew.sync.register({ Box });   // Box は自分を直接の同期子として許可（ネスト用）
    const state = xnew.sync.state({ value: 0 });
    xnew.sync.client(() => {
        const el = xnew.nest('<div>');
        unit.on('render', () => { (el as HTMLElement).textContent = String(state.value); });
    });
}

describe('applyStateTree create', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    function makeView() { return bootClient({ socket: ioMock().connect() }, function View() { xnew.sync.register({ Box }); }); }

    it('creates client units under the reconcile root with state applied', () => {
        const view = makeView();
        const tree: StateTree = [{ id: 1, name: 'Box', parentId: null, state: { value: 7 } }];
        applyStateTree(view, tree);
        expect(view._.children.length).toBe(1);
        const child = view._.children[0];
        expect(syncOf(child).id).toBe(1);
        expect(syncOf(child).state).toEqual({ value: 7 });
    });

    it('creates nested replica units honoring parentId', () => {
        const view = makeView();
        applyStateTree(view, [
            { id: 1, name: 'Box', parentId: null, state: { value: 1 } },
            { id: 2, name: 'Box', parentId: 1, state: { value: 2 } },
        ]);
        expect(syncOf(view._.children[0]).id).toBe(1);
        expect(syncOf(view._.children[0]._.children[0]).id).toBe(2);
    });
});

describe('applyStateTree state hydration (client gets server state after apply)', () => {
    let observed: Record<string, any> | null;
    function Probe(unit: Unit) {
        const state = xnew.sync.state({ value: 0, who: 'local' });
        observed = { ...state };   // 本体実行時点で見えている state のスナップショット
    }
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); observed = null; });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });
    function makeView() { return bootClient({ socket: ioMock().connect() }, function View() { xnew.sync.register({ Probe }); }); }

    it('overrides local initial with server state after construction', () => {
        const view = makeView();
        applyStateTree(view, [{ id: 1, name: 'Probe', parentId: null, state: { value: 42, who: 'server' } }]);
        expect(observed).toEqual({ value: 0, who: 'local' });                              // 構築時はまだ local
        expect(syncOf(view._.children[0]).state).toEqual({ value: 42, who: 'server' });   // apply は生成後に server 値で上書き
    });

    it('does not affect a unit created outside apply (keeps local initial)', () => {
        const view = makeView();
        applyStateTree(view, [{ id: 1, name: 'Probe', parentId: null, state: { value: 42, who: 'server' } }]);
        observed = null;
        xnew(function Holder() { xnew.sync.register({ Probe }); xnew(Probe); });   // apply 経由でない生成（null mode）
        expect(observed).toEqual({ value: 0, who: 'local' });
    });
});

describe('applyStateTree update', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });
    function makeView() { return bootClient({ socket: ioMock().connect() }, function View() { xnew.sync.register({ Box }); }); }

    it('updates existing unit in place without recreating it', () => {
        const view = makeView();
        applyStateTree(view, [{ id: 1, name: 'Box', parentId: null, state: { value: 1 } }]);
        const first = view._.children[0];
        applyStateTree(view, [{ id: 1, name: 'Box', parentId: null, state: { value: 2 } }]);
        expect(view._.children[0]).toBe(first);
        expect(syncOf(first).state).toEqual({ value: 2 });
        expect(view._.children.length).toBe(1);
    });
});

describe('applyStateTree remove', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });
    function makeView() { return bootClient({ socket: ioMock().connect() }, function View() { xnew.sync.register({ Box }); }); }

    it('finalizes replica units whose id disappears from the tree', () => {
        const view = makeView();
        applyStateTree(view, [
            { id: 1, name: 'Box', parentId: null, state: {} },
            { id: 2, name: 'Box', parentId: null, state: {} },
        ]);
        expect(view._.children.length).toBe(2);
        const removed = view._.children.find(c => syncOf(c).id === 2)!;
        applyStateTree(view, [{ id: 1, name: 'Box', parentId: null, state: {} }]);
        expect(view._.children.length).toBe(1);
        expect(syncOf(view._.children[0]).id).toBe(1);
        expect(removed._.status).toBe('finalized');
    });
});
