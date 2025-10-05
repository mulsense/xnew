import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit element', () => {

    it('basic', () => {
        xnew((self: xnew.Unit) => {
            const unit2 = xnew();
            expect(self.element).toBe(document.body);
            expect(unit2.element).toBe(document.body);
        })
    });

    it('create', () => {
        xnew((self: xnew.Unit) => {
            xnew.nest('<div id="A">');
            expect(self.element).toBe(document.querySelector('div[id=A]'));
        })
        xnew('<div id="B">', (self: xnew.Unit) => {
            expect(self.element).toBe(document.querySelector('div[id=B]'));
        })
    });

    it('nest', () => {
        const unit1 = xnew((self: xnew.Unit) => {
            xnew.nest('<div id="C">');
            const unit2 = xnew();
            expect(unit2.element).toBe(document.querySelector('div[id=C]'));
        });
        unit1.finalize();
    });

    it('delete', () => {
        const unit1 = xnew((self: xnew.Unit) => {
            xnew.nest('<div id="D">');
        });
 
        unit1.finalize();
        expect(document.querySelector('div[id=D]')).toBe(null);
    });
});