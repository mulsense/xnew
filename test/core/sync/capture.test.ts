import { Unit } from '../../../src/core/unit';
import { syncOf, captureStateTree } from '../../../src/core/sync';
import { xnew } from '../../../src/index';

function Player() {}

describe('registry (scoped)', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    it('a child is synced under the name its parent registered', () => {
        const root = xnew(function Root() { xnew.sync.register({ Player }); xnew(Player); });
        expect(captureStateTree(root).map(n => n.name)).toContain('Player');
    });

    it('a child whose parent did not register it is not synced', () => {
        const root = xnew(function Root() { xnew(Player); });   // register していない
        expect(captureStateTree(root)).toHaveLength(0);
    });

    it('a unit whose parent has no registry is not synced', () => {
        const unit = xnew((u: Unit) => {});
        expect(captureStateTree(unit)).toHaveLength(0);
    });
});

describe('captureStateTree', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    function World(unit: Unit) { xnew.sync.register({ Child }); xnew.sync.state({ tick: 0 }); xnew(Child); }
    function Child(unit: Unit) { xnew.sync.state({ position: 5 }); }

    it('captures a synced unit; parentId is null when no synced ancestor exists', () => {
        const root = xnew(function Root() { xnew.sync.register({ World }); xnew(World); });
        const tree = captureStateTree(root);
        const worldNode = tree.find(n => n.name === 'World')!;
        expect(worldNode).toBeDefined();
        expect(worldNode.parentId).toBeNull();
        expect(worldNode.state).toEqual({ tick: 0 });
    });

    it('sets a child parentId to the nearest synced ancestor id', () => {
        const root = xnew(function Root() { xnew.sync.register({ World }); xnew(World); });
        const tree = captureStateTree(root);
        const worldNode = tree.find(n => n.name === 'World')!;
        const childNode = tree.find(n => n.name === 'Child')!;
        expect(childNode.parentId).toBe(worldNode.id);
    });

    it('assigns stable ids and reflects mutated state on later captures', () => {
        const root = xnew(function Root() { xnew.sync.register({ Child }); xnew(Child); });
        const first = captureStateTree(root)[0];
        syncOf(root._.children[0]).state!.position = 9;
        const second = captureStateTree(root)[0];
        expect(second.id).toBe(first.id);
        expect(second.state).toEqual({ position: 9 });
    });
});
