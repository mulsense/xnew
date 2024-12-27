import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit relation', () => {
    it('basic', () => {
        const unit1 = xnew();
        const unit2 = xnew(unit1);
        expect(unit1.parent).toBe(null);
        expect(unit2.parent).toBe(unit1);
    });

    it('nest', () => {
        xnew(() => {
            const unit1 = xnew.current;
            const unit2 = xnew();
            expect(unit1.parent).toBe(null);
            expect(unit2.parent).toBe(unit1);
        })
    });

    it('delete', () => {
        xnew(() => {
            const unit1 = xnew.current;
            const unit2 = xnew();
            expect(unit1.parent).toBe(null);
            expect(unit2.parent).toBe(unit1);
        })
    });
});