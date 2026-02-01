import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit relation', () => {
    it('basic', () => {
        xnew((unit: Unit) => {
            const unit2 = xnew();
            expect(unit._.parent).toBe(Unit.rootUnit);
            expect(unit2._.parent).toBe(unit);
        })
    });

    it('delete', () => {
        xnew((unit: Unit) => {
            const unit2 = xnew();
            expect(unit._.parent).toBe(Unit.rootUnit);
            expect(unit2._.parent).toBe(unit);
        })
    });
});