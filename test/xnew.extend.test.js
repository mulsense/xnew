import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit extend', () => {

    it('basic', () => {
        const unit = xnew(Derived);

        function Base(self) {
            return {
                test1() {
                    return 1;
                },
            }
        }

        function Derived(self) {
            const props = xnew.extend(Base);
            return {
                test1() {
                    return props.test1() + 1;
                }
            }
        }
        expect(unit.test1()).toBe(2);
    });

});