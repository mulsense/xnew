import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';
import { resetRegistry, StateTree } from '../../../src/core/sync';

function Box(unit: Unit) {
    const state = xnew.state.initialize({ value: 0 });
    xnew.browser(() => {
        const el = xnew.nest('<div>');
        unit.on('render', () => { (el as HTMLElement).textContent = String(state.value); });
    });
}

describe('applyStateTree create', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); resetRegistry(); Unit.reset(); xnew.config.mode = null; xnew.state.register('Box', Box); });
    afterEach(() => { Unit.rootUnit?.finalize(); xnew.config.mode = null; jest.useRealTimers(); });

    function makeView() { xnew.config.mode = 'replica'; const v = xnew((u: Unit) => {}); xnew.config.mode = null; return v; }

    it('creates replica units under the reconcile root with state applied', () => {
        const view = makeView();
        const tree: StateTree = [{ id: 1, name: 'Box', parentId: null, state: { value: 7 } }];
        xnew.state.apply(view, tree);
        expect(view._.children.length).toBe(1);
        const child = view._.children[0];
        expect(child._.syncId).toBe(1);
        expect(child._.mode).toBe('replica');
        expect(child._.syncState).toEqual({ value: 7 });
    });

    it('creates nested replica units honoring parentId', () => {
        const view = makeView();
        xnew.state.apply(view, [
            { id: 1, name: 'Box', parentId: null, state: { value: 1 } },
            { id: 2, name: 'Box', parentId: 1, state: { value: 2 } },
        ]);
        expect(view._.children[0]._.syncId).toBe(1);
        expect(view._.children[0]._.children[0]._.syncId).toBe(2);
    });
});

describe('applyStateTree update', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); resetRegistry(); Unit.reset(); xnew.config.mode = null; xnew.state.register('Box', Box); });
    afterEach(() => { Unit.rootUnit?.finalize(); xnew.config.mode = null; jest.useRealTimers(); });
    function makeView() { xnew.config.mode = 'replica'; const v = xnew((u: Unit) => {}); xnew.config.mode = null; return v; }

    it('updates existing unit in place without recreating it', () => {
        const view = makeView();
        xnew.state.apply(view, [{ id: 1, name: 'Box', parentId: null, state: { value: 1 } }]);
        const first = view._.children[0];
        xnew.state.apply(view, [{ id: 1, name: 'Box', parentId: null, state: { value: 2 } }]);
        expect(view._.children[0]).toBe(first);
        expect(first._.syncState).toEqual({ value: 2 });
        expect(view._.children.length).toBe(1);
    });
});

describe('applyStateTree remove', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); resetRegistry(); Unit.reset(); xnew.config.mode = null; xnew.state.register('Box', Box); });
    afterEach(() => { Unit.rootUnit?.finalize(); xnew.config.mode = null; jest.useRealTimers(); });
    function makeView() { xnew.config.mode = 'replica'; const v = xnew((u: Unit) => {}); xnew.config.mode = null; return v; }

    it('finalizes replica units whose id disappears from the tree', () => {
        const view = makeView();
        xnew.state.apply(view, [
            { id: 1, name: 'Box', parentId: null, state: {} },
            { id: 2, name: 'Box', parentId: null, state: {} },
        ]);
        expect(view._.children.length).toBe(2);
        const removed = view._.children.find(c => c._.syncId === 2)!;
        xnew.state.apply(view, [{ id: 1, name: 'Box', parentId: null, state: {} }]);
        expect(view._.children.length).toBe(1);
        expect(view._.children[0]._.syncId).toBe(1);
        expect(removed._.state).toBe('finalized');
    });
});
