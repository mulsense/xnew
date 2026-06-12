import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';
import { syncOf, StateTree } from '../../../src/core/sync';

function Box(unit: Unit) {
    xnew.sync.register({ Box });   // Box は自分を直接の同期子として許可（ネスト用）
    const state = xnew.sync.state({ value: 0 });
    xnew.client(() => {
        const el = xnew.nest('<div>');
        unit.on('render', () => { (el as HTMLElement).textContent = String(state.value); });
    });
}

describe('applyStateTree create', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    function makeView() { return xnew.sync.boot({ mode: 'client' }, function View() { xnew.sync.register({ Box }); }); }

    it('creates client units under the reconcile root with state applied', () => {
        const view = makeView();
        const tree: StateTree = [{ id: 1, name: 'Box', parentId: null, state: { value: 7 } }];
        xnew.sync.apply(view, tree);
        expect(view._.children.length).toBe(1);
        const child = view._.children[0];
        expect(syncOf(child).id).toBe(1);
        expect(child._.mode).toBe('client');
        expect(syncOf(child).state).toEqual({ value: 7 });
    });

    it('creates nested replica units honoring parentId', () => {
        const view = makeView();
        xnew.sync.apply(view, [
            { id: 1, name: 'Box', parentId: null, state: { value: 1 } },
            { id: 2, name: 'Box', parentId: 1, state: { value: 2 } },
        ]);
        expect(syncOf(view._.children[0]).id).toBe(1);
        expect(syncOf(view._.children[0]._.children[0]).id).toBe(2);
    });
});

describe('applyStateTree state injection (client inits from server state)', () => {
    let observed: Record<string, any> | null;
    function Probe(unit: Unit) {
        const state = xnew.sync.state({ value: 0, who: 'local' });
        observed = { ...state };   // 本体実行時点で見えている state のスナップショット
    }
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); observed = null; });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });
    function makeView() { return xnew.sync.boot({ mode: 'client' }, function View() { xnew.sync.register({ Probe }); }); }

    it('injects server state before the body runs so local initial is ignored', () => {
        const view = makeView();
        xnew.sync.apply(view, [{ id: 1, name: 'Probe', parentId: null, state: { value: 42, who: 'server' } }]);
        expect(observed).toEqual({ value: 42, who: 'server' });   // 本体実行時には既に注入済み
    });

    it('does not leak injected state to a unit created outside apply (read-once)', () => {
        const view = makeView();
        xnew.sync.apply(view, [{ id: 1, name: 'Probe', parentId: null, state: { value: 42, who: 'server' } }]);
        observed = null;
        xnew(function Holder() { xnew.sync.register({ Probe }); xnew(Probe); });   // apply 経由でない生成（null mode）
        expect(observed).toEqual({ value: 0, who: 'local' });
    });
});

describe('applyStateTree update', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });
    function makeView() { return xnew.sync.boot({ mode: 'client' }, function View() { xnew.sync.register({ Box }); }); }

    it('updates existing unit in place without recreating it', () => {
        const view = makeView();
        xnew.sync.apply(view, [{ id: 1, name: 'Box', parentId: null, state: { value: 1 } }]);
        const first = view._.children[0];
        xnew.sync.apply(view, [{ id: 1, name: 'Box', parentId: null, state: { value: 2 } }]);
        expect(view._.children[0]).toBe(first);
        expect(syncOf(first).state).toEqual({ value: 2 });
        expect(view._.children.length).toBe(1);
    });
});

describe('applyStateTree remove', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });
    function makeView() { return xnew.sync.boot({ mode: 'client' }, function View() { xnew.sync.register({ Box }); }); }

    it('finalizes replica units whose id disappears from the tree', () => {
        const view = makeView();
        xnew.sync.apply(view, [
            { id: 1, name: 'Box', parentId: null, state: {} },
            { id: 2, name: 'Box', parentId: null, state: {} },
        ]);
        expect(view._.children.length).toBe(2);
        const removed = view._.children.find(c => syncOf(c).id === 2)!;
        xnew.sync.apply(view, [{ id: 1, name: 'Box', parentId: null, state: {} }]);
        expect(view._.children.length).toBe(1);
        expect(syncOf(view._.children[0]).id).toBe(1);
        expect(removed._.status).toBe('finalized');
    });
});
