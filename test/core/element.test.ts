import { isDomElement } from '../../src/core/element';

describe('isDomElement', () => {
    describe('returns true for DOM elements', () => {
        it('accepts an HTMLElement', () => {
            expect(isDomElement(document.createElement('div'))).toBe(true);
        });
        it('accepts HTML subclasses', () => {
            expect(isDomElement(document.createElement('span'))).toBe(true);
            expect(isDomElement(document.createElement('button'))).toBe(true);
        });
        it('accepts an SVGElement', () => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            expect(isDomElement(svg)).toBe(true);
        });
        it('accepts SVG subclasses', () => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            expect(isDomElement(circle)).toBe(true);
        });
    });

    describe('returns false for non-elements', () => {
        it('rejects plain objects', () => {
            expect(isDomElement({})).toBe(false);
        });
        it('rejects null and undefined', () => {
            expect(isDomElement(null)).toBe(false);
            expect(isDomElement(undefined)).toBe(false);
        });
        it('rejects primitives', () => {
            expect(isDomElement('div')).toBe(false);
            expect(isDomElement(123)).toBe(false);
            expect(isDomElement(true)).toBe(false);
        });
        it('rejects arrays', () => {
            expect(isDomElement([document.createElement('div')])).toBe(false);
        });
    });

    describe('SSR safety', () => {
        it('returns false (no throw) when HTMLElement is undefined', () => {
            const original = (globalThis as any).HTMLElement;
            (globalThis as any).HTMLElement = undefined;
            try {
                expect(isDomElement({})).toBe(false);
                expect(isDomElement(null)).toBe(false);
            } finally {
                (globalThis as any).HTMLElement = original;
            }
        });
        it('returns false (no throw) when SVGElement is undefined', () => {
            const original = (globalThis as any).SVGElement;
            (globalThis as any).SVGElement = undefined;
            try {
                expect(isDomElement({})).toBe(false);
            } finally {
                (globalThis as any).SVGElement = original;
            }
        });
    });
});
