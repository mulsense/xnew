import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit system', () => {
    it('basic', () => {
        return new Promise((resolve, reject) => {
            let state = 0;
            let start = Date.now();
            const margin = 100;
            xnew((self) => {
                return {
                    promise: new Promise((resolve, reject) => {
                        setTimeout(() => {
                            resolve();
                        }, 500);
                    }),
                    start() {
                        const d = Date.now() - start;
                        expect(d).toBeGreaterThan(500 - margin);
                        expect(d).toBeLessThan(500 + margin);
                        state++;
                    }
                }
            });
            
            setTimeout(() => state === 1 ? resolve() : reject(), 500 + margin);
        });
    });

});