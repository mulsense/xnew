import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('xnew.context', () => {
    it('basic', () => {
        function A(unit: Unit) {
            return {
                get value() { return 'A'; },
            }
        }
        xnew((unit: Unit) => {
            xnew.extend(A);
            expect(xnew.context(A)?.value).toBe('A');
        });
    });
});

