import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

afterEach(() => {
    Unit.rootUnit?.finalize();
});

describe('xnew.find', () => {
    it('returns every unit instance registered under the given component', () => {
        function A(_: Unit) {}
        function B(_: Unit) {}

        let a1!: Unit, a2!: Unit, b1!: Unit;
        xnew(() => {
            a1 = xnew(A);
            a2 = xnew(A);
            b1 = xnew(B);
        });

        expect(xnew.find(A)).toEqual(expect.arrayContaining([a1, a2]));
        expect(xnew.find(A)).toHaveLength(2);
        expect(xnew.find(B)).toEqual([b1]);
    });

    it('returns an empty array when no unit matches', () => {
        function Absent(_: Unit) {}
        expect(xnew.find(Absent)).toEqual([]);
    });

    it('drops a unit from the index after finalize', () => {
        function A(_: Unit) {}
        const unit = xnew(A);
        expect(xnew.find(A)).toContain(unit);

        unit.finalize();
        expect(xnew.find(A)).not.toContain(unit);
    });
});
