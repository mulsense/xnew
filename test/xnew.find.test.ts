import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit context', () => {

    it('component', () => {
        xnew(() => {
            const unit1 = xnew(A);
            const unit2 = xnew(B);
            const unit3 = xnew(C);

            expect(xnew.find(A)[0]).toBe(unit1);
            expect(xnew.find(B)[0]).toBe(unit2);
            expect(xnew.find(C)[0]).toBe(unit3);
        });

        function A(unit: Unit) {
        }
        function B(unit: Unit) {
        }
        function C(unit: Unit) {
        }
    });
});

