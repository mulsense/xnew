import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit relation', () => {
    it('basic', () => {
        xnew((self: xnew.Unit) => {
            const unit2 = xnew();
            expect(self._.parent).toBe(Unit.root);
            expect(unit2._.parent).toBe(self);
        })
    });

    it('delete', () => {
        xnew((self: xnew.Unit) => {
            const unit2 = xnew();
            expect(self._.parent).toBe(Unit.root);
            expect(unit2._.parent).toBe(self);
        })
    });
});