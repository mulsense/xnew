import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

afterEach(() => {
    Unit.rootUnit?.finalize();
});

describe('Unit element', () => {
    it('defaults to document.body when no target is given', () => {
        xnew((unit: Unit) => {
            expect(unit.element).toBe(document.body);
        });
    });

    it('inherits the parent unit element', () => {
        xnew((parent: Unit) => {
            const child = xnew();
            expect(child.element).toBe(parent.element);
        });
    });

    it('creates a new element from a tag string at construction', () => {
        xnew('<div id="x1">', (unit: Unit) => {
            expect(unit.element).toBe(document.getElementById('x1'));
        });
    });

    it('xnew.nest creates a nested element accessible to children', () => {
        xnew(() => {
            const nested = xnew.nest('<div id="x2">');
            const child = xnew();

            expect(nested).toBe(document.getElementById('x2'));
            expect(child.element).toBe(nested);
        });
    });

    it('removes owned nested elements when the unit finalizes', () => {
        const unit = xnew(() => {
            xnew.nest('<div id="x3">');
        });
        expect(document.getElementById('x3')).not.toBeNull();

        unit.finalize();
        expect(document.getElementById('x3')).toBeNull();
    });

    it('does not remove externally provided elements on finalize', () => {
        const external = document.createElement('div');
        external.id = 'x4';
        document.body.appendChild(external);

        const unit = xnew(() => {
            xnew.nest(external);
        });

        unit.finalize();
        expect(document.getElementById('x4')).toBe(external);

        external.remove();
    });
});
