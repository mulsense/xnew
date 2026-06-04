import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';
import { resetRegistry, StateTree } from '../../../src/core/sync';

function Box(unit: Unit) {
    const state = xnew.sync.state({ value: 0 });
    xnew.client(() => {
        const el = xnew.nest('<div>');
        unit.on('render', () => { (el as HTMLElement).textContent = String(state.value); });
    });
}

describe('applyStateTree create', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); resetRegistry(); Unit.reset(); Unit.config.mode = null; xnew.sync.register({ Box }); });
    afterEach(() => { Unit.rootUnit?.finalize(); Unit.config.mode = null; jest.useRealTimers(); });

    function makeView() { Unit.config.mode = 'client'; const v = xnew((u: Unit) => {}); Unit.config.mode = null; return v; }

    it('creates client units under the reconcile root with state applied', () => {
        const view = makeView();
        const tree: StateTree = [{ id: 1, name: 'Box', parentId: null, state: { value: 7 } }];
        xnew.sync.apply(view, tree);
        expect(view._.children.length).toBe(1);
        const child = view._.children[0];
        expect(child._.syncId).toBe(1);
        expect(child._.mode).toBe('client');
        expect(child._.state).toEqual({ value: 7 });
    });

    it('creates nested replica units honoring parentId', () => {
        const view = makeView();
        xnew.sync.apply(view, [
            { id: 1, name: 'Box', parentId: null, state: { value: 1 } },
            { id: 2, name: 'Box', parentId: 1, state: { value: 2 } },
        ]);
        expect(view._.children[0]._.syncId).toBe(1);
        expect(view._.children[0]._.children[0]._.syncId).toBe(2);
    });
});

describe('applyStateTree state injection (client inits from server state)', () => {
    let observed: Record<string, any> | null;
    function Probe(unit: Unit) {
        const state = xnew.sync.state({ value: 0, who: 'local' });
        observed = { ...state };   // 本体実行時点で見えている state のスナップショット
    }
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); resetRegistry(); Unit.reset(); Unit.config.mode = null; observed = null; xnew.sync.register({ Probe }); });
    afterEach(() => { Unit.rootUnit?.finalize(); Unit.config.mode = null; jest.useRealTimers(); });
    function makeView() { Unit.config.mode = 'client'; const v = xnew((u: Unit) => {}); Unit.config.mode = null; return v; }

    it('injects server state before the body runs so local initial is ignored', () => {
        const view = makeView();
        xnew.sync.apply(view, [{ id: 1, name: 'Probe', parentId: null, state: { value: 42, who: 'server' } }]);
        expect(observed).toEqual({ value: 42, who: 'server' });   // 本体実行時には既に注入済み
    });

    it('does not leak injected state to a unit created outside apply (read-once)', () => {
        const view = makeView();
        xnew.sync.apply(view, [{ id: 1, name: 'Probe', parentId: null, state: { value: 42, who: 'server' } }]);
        observed = null;
        Unit.config.mode = null;
        xnew(Probe);   // synced 型だが apply 経由でない → 注入は消費済みで local 初期値を使う
        expect(observed).toEqual({ value: 0, who: 'local' });
    });
});

describe('applyStateTree update', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); resetRegistry(); Unit.reset(); Unit.config.mode = null; xnew.sync.register({ Box }); });
    afterEach(() => { Unit.rootUnit?.finalize(); Unit.config.mode = null; jest.useRealTimers(); });
    function makeView() { Unit.config.mode = 'client'; const v = xnew((u: Unit) => {}); Unit.config.mode = null; return v; }

    it('updates existing unit in place without recreating it', () => {
        const view = makeView();
        xnew.sync.apply(view, [{ id: 1, name: 'Box', parentId: null, state: { value: 1 } }]);
        const first = view._.children[0];
        xnew.sync.apply(view, [{ id: 1, name: 'Box', parentId: null, state: { value: 2 } }]);
        expect(view._.children[0]).toBe(first);
        expect(first._.state).toEqual({ value: 2 });
        expect(view._.children.length).toBe(1);
    });
});

describe('applyStateTree remove', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); resetRegistry(); Unit.reset(); Unit.config.mode = null; xnew.sync.register({ Box }); });
    afterEach(() => { Unit.rootUnit?.finalize(); Unit.config.mode = null; jest.useRealTimers(); });
    function makeView() { Unit.config.mode = 'client'; const v = xnew((u: Unit) => {}); Unit.config.mode = null; return v; }

    it('finalizes replica units whose id disappears from the tree', () => {
        const view = makeView();
        xnew.sync.apply(view, [
            { id: 1, name: 'Box', parentId: null, state: {} },
            { id: 2, name: 'Box', parentId: null, state: {} },
        ]);
        expect(view._.children.length).toBe(2);
        const removed = view._.children.find(c => c._.syncId === 2)!;
        xnew.sync.apply(view, [{ id: 1, name: 'Box', parentId: null, state: {} }]);
        expect(view._.children.length).toBe(1);
        expect(view._.children[0]._.syncId).toBe(1);
        expect(removed._.status).toBe('finalized');
    });
});
