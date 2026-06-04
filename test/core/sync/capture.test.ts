import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';
import { getSyncName, getRegisteredComponent, resetRegistry } from '../../../src/core/sync';

function Player() {}

describe('registry', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); resetRegistry(); Unit.reset(); xnew.config.mode = null; });
    afterEach(() => { Unit.rootUnit?.finalize(); xnew.config.mode = null; jest.useRealTimers(); });

    it('register maps a name to a component both ways', () => {
        xnew.sync.register({ Player });
        expect(getRegisteredComponent('Player')).toBe(Player);
        const unit = xnew(Player);
        expect(getSyncName(unit)).toBe('Player');
    });

    it('unregistered units are not synced', () => {
        const unit = xnew((u: Unit) => {});
        expect(getSyncName(unit)).toBeUndefined();
    });
});

describe('captureStateTree', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); resetRegistry(); Unit.reset(); xnew.config.mode = null; });
    afterEach(() => { Unit.rootUnit?.finalize(); xnew.config.mode = null; jest.useRealTimers(); });

    function World(unit: Unit) { xnew.sync.state({ tick: 0 }); xnew(Child); }
    function Child(unit: Unit) { xnew.sync.state({ position: 5 }); }

    it('captures a synced unit; parentId is null when no synced ancestor exists', () => {
        xnew.sync.register({ World, Child });
        const root = xnew(function Root() { xnew(World); });
        const tree = xnew.sync.capture(root);
        const worldNode = tree.find(n => n.name === 'World')!;
        expect(worldNode).toBeDefined();
        expect(worldNode.parentId).toBeNull();
        expect(worldNode.state).toEqual({ tick: 0 });
    });

    it('sets a child parentId to the nearest synced ancestor id', () => {
        xnew.sync.register({ World, Child });
        const root = xnew(function Root() { xnew(World); });
        const tree = xnew.sync.capture(root);
        const worldNode = tree.find(n => n.name === 'World')!;
        const childNode = tree.find(n => n.name === 'Child')!;
        expect(childNode.parentId).toBe(worldNode.id);
    });

    it('assigns stable ids and reflects mutated state on later captures', () => {
        xnew.sync.register({ Child });
        const root = xnew(function Root() { xnew(Child); });
        const first = xnew.sync.capture(root)[0];
        root._.children[0]._.syncState!.position = 9;
        const second = xnew.sync.capture(root)[0];
        expect(second.id).toBe(first.id);
        expect(second.state).toEqual({ position: 9 });
    });
});
