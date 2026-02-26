import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit system', () => {
    it('basic', () => {
        return new Promise<void>((resolve, reject) => {
            let state = 0;
            let start = Date.now();
            const margin = 100;
          
            xnew((unit: Unit) => {
                xnew.promise(new Promise<void>((resolve, reject) => {
                    setTimeout(() => {
                        resolve();
                        unit.start();
                    }, 500);
                }));
                unit.stop();
                unit.on('start', () => {
                    const d = Date.now() - start;
                    expect(d).toBeGreaterThan(500 - margin);
                    expect(d).toBeLessThan(500 + margin);
                    state++;
                });
            });
            
            setTimeout(() => state === 1 ? resolve() : reject(), 500 + margin);
        });
    });

});