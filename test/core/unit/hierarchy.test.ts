import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

describe('Unit hierarchy', () => {
    beforeEach(() => { Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); });

    it('a unit created inside a component has that component as parent', () => {
        let outer!: Unit, inner!: Unit;
        xnew((u: Unit) => { outer = u; inner = xnew(); });
        expect(inner.parent).toBe(outer);
    });

    it('a top-level unit has the root unit as parent', () => {
        const unit = xnew(() => {});
        expect(unit.parent).toBe(Unit.engineRoot);
    });

    it('finalizing a parent finalizes its children', () => {
        const onChildFinalize = jest.fn();
        const parent = xnew(() => {
            xnew((c: Unit) => c.on('finalize', onChildFinalize));
        });
        parent.finalize();
        expect(onChildFinalize).toHaveBeenCalledTimes(1);
    });

    it('finalizes children in reverse creation order', () => {
        const order: string[] = [];
        const parent = xnew(() => {
            xnew((c: Unit) => c.on('finalize', () => order.push('a')));
            xnew((c: Unit) => c.on('finalize', () => order.push('b')));
            xnew((c: Unit) => c.on('finalize', () => order.push('c')));
        });
        parent.finalize();
        expect(order).toEqual(['c', 'b', 'a']);
    });

    it('removes a finalized child so it is no longer found', () => {
        function Child(_: Unit) {}
        let child!: Unit;
        const parent = xnew(() => { child = xnew(Child); });
        expect(xnew.find(Child)).toContain(child);
        child.finalize();
        expect(xnew.find(Child)).not.toContain(child);
        parent.finalize();
    });
});
