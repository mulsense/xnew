import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit relation', () => {
    it('basic', () => {
        const unit1 = xnew();
        const unit2 = xnew(unit1);
        expect(unit1._.parent).toBe(null);
        expect(unit2._.parent).toBe(unit1);
    });

    it('nest', () => {
        xnew((self: xnew.Unit) => {
            const unit2 = xnew();
            expect(self._.parent).toBe(null);
            expect(unit2._.parent).toBe(self);
        })
    });

    it('delete', () => {
        xnew((self: xnew.Unit) => {
            const unit2 = xnew();
            expect(self._.parent).toBe(null);
            expect(unit2._.parent).toBe(self);
        })
    });
});