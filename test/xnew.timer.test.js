import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit timer', () => {
    it('basic', () => {
        return new Promise((resolve, reject) => {
            let state = 0;
            let start = Date.now();
            const margin = 100;
            xnew((self) => {
                xnew.timer(() => {
                    const d = Date.now() - start;
                    expect(d).toBeGreaterThan(500 - margin);
                    expect(d).toBeLessThan(500 + margin);
                    state++;
                }, 500);
                setTimeout(() => state === 1 ? resolve() : reject(), 500 + margin);
            })
        });
    });

});