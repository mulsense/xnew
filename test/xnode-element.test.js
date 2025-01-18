import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit element', () => {

    it('basic', () => {
        xnew(() => {
            const unit2 = xnew();
            expect(xthis.element).toBe(document.body);
            expect(unit2.element).toBe(document.body);
        })
    });

    it('create', () => {
        xnew(() => {
            xnew.nest({ tagName: 'div', name: 'A' });
            expect(xthis.element).toBe(document.querySelector('div[name=A]'));
        })
        xnew({ tagName: 'div', name: 'B' }, () => {
            expect(xthis.element).toBe(document.querySelector('div[name=B]'));
        })
    });

    it('nest', () => {
        const unit1 = xnew(() => {
            xnew.nest({ tagName: 'div', name: 'test' });
            const unit2 = xnew();
            expect(xthis.element).toBe(document.querySelector('div[name=test]'));
            expect(unit2.element).toBe(document.querySelector('div[name=test]'));
        });
        unit1.finalize();
    });

    it('delete', () => {
        const unit1 = xnew(() => {
            xnew.nest({ tagName: 'div', name: 'test' });
        });
 
        expect(unit1.element).toBe(document.querySelector('div[name=test]'));
        unit1.finalize();
        expect(document.querySelector('div[name=test]')).toBe(null);
    });
});