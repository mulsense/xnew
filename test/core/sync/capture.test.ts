import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';
import { getSyncName, getRegisteredComponent, resetRegistry } from '../../../src/core/sync';

function Player() {}

describe('registry', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); resetRegistry(); Unit.reset(); xnew.config.mode = null; });
    afterEach(() => { Unit.rootUnit?.finalize(); xnew.config.mode = null; jest.useRealTimers(); });

    it('register maps a name to a component both ways', () => {
        xnew.state.register('Player', Player);
        expect(getRegisteredComponent('Player')).toBe(Player);
        const unit = xnew(Player);
        expect(getSyncName(unit)).toBe('Player');
    });

    it('unregistered units are not synced', () => {
        const unit = xnew((u: Unit) => {});
        expect(getSyncName(unit)).toBeUndefined();
    });
});
