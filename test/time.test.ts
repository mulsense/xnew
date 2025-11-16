import { Timer } from '../src/core/time';

describe('timer', () => {
    it('timer loop = false', () => {
        return new Promise<void>((resolve, reject) => {
            let count = 0;
            let start = Date.now();
            const margin = 100;
            const timer = new Timer(null, () => {
                count++;
                const d = Date.now() - start;
                expect(d).toBeGreaterThan(500 - margin);
                expect(d).toBeLessThan(500 + margin);
            }, 500);
            setTimeout(() => count === 1 ? resolve() : reject(), 500 + margin);
        });
    });

    it('timer loop = true', () => {
        return new Promise<void>((resolve, reject) => {
            let count = 0;
            let start = Date.now();
            const margin = 100;
            const timer = new Timer(null, () => {
                count++;
                const d = Date.now() - start;
                expect(d).toBeGreaterThan(500 * count - margin);
                expect(d).toBeLessThan(500 * count + margin);
            }, 500, { loop: true });
            setTimeout(() => count === 2 ? resolve() : reject(), 1000 + margin);
        });
    });
});