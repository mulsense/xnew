import { Timer, TimerOptions } from '../src/core/time';

describe('timer', () => {
    it('timer loop = false', () => {
        return new Promise<void>((resolve, reject) => {
            let count = 0;
            let start = Date.now();
            const margin = 100;
            const timer = new Timer({ timeout: () => {
                count++;
                const d = Date.now() - start;
                expect(d).toBeGreaterThan(500 - margin);
                expect(d).toBeLessThan(500 + margin);
            }, duration: 500, iterations: 1 });
            setTimeout(() => count === 1 ? resolve() : reject(), 500 + margin);
        });
    });

    it('timer loop = true', () => {
        return new Promise<void>((resolve, reject) => {
            let count = 0;
            let start = Date.now();
            const margin = 100;
            const timer = new Timer({ timeout: () => {
                count++;
                const d = Date.now() - start;
                expect(d).toBeGreaterThan(500 * count - margin);
                expect(d).toBeLessThan(500 * count + margin);
            }, duration: 500, iterations: 0 });
            setTimeout(() => count === 2 ? resolve() : reject(), 1000 + margin);
        });
    });
});