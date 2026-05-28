import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

afterEach(() => {
    Unit.rootUnit?.finalize();
});

describe('Unit hierarchy', () => {
    it('a top-level unit has the root unit as parent', () => {
        xnew((unit: Unit) => {
            expect(unit.parent).toBe(Unit.rootUnit);
        });
    });

    it('a nested unit has its outer unit as parent', () => {
        xnew((outer: Unit) => {
            const inner = xnew();
            expect(inner.parent).toBe(outer);
        });
    });

    it('children are appended to the parent in creation order', () => {
        xnew((outer: Unit) => {
            const a = xnew();
            const b = xnew();
            expect(outer._.children).toEqual([a, b]);
        });
    });

    it('finalize removes the unit from its parent children', () => {
        let inner!: Unit;
        const outer = xnew(() => {
            inner = xnew();
        });

        inner.finalize();
        expect(outer._.children).not.toContain(inner);
    });
});
