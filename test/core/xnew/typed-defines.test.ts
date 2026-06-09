import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

//----------------------------------------------------------------------------------------------------
// Typed defines (theme 2)
//
// xnew(Component) returns `Unit & DefinesOf<Component>`, and xnew.extend(Component) returns
// `DefinesOf<Component>`. The `[key: string]: any` index signature was removed from Unit, so
// accessing an undeclared / un-inferred property is now a compile error (asserted via @ts-expect-error).
// These checks run under ts-jest, so a type regression fails the build, and the runtime expectations
// confirm the defines are actually wired onto the unit.
//----------------------------------------------------------------------------------------------------

function Counter(_unit: Unit, props: { start?: number }) {
    let n = props.start ?? 0;
    return {
        inc() { n++; },
        get value() { return n; },
    };
}

describe('typed defines', () => {
    beforeEach(() => {
        Unit.reset();
    });
    afterEach(() => {
        Unit.engineRoot?.finalize();
    });

    it('xnew(Component) merges typed defines onto the returned unit', () => {
        xnew(() => {
            const counter = xnew(Counter, { start: 10 });
            counter.inc();                          // typed method
            expect(counter.value).toBe(11);         // typed getter
            expect(typeof counter.on).toBe('function'); // still a Unit
            // @ts-expect-error — undeclared define is a type error (index signature removed)
            counter.nope;
        });
    });

    it('xnew.extend(Component) returns typed defines', () => {
        xnew(() => {
            const api = xnew.extend(Counter, { start: 5 });
            api.inc();
            expect(api.value).toBe(6);
            // @ts-expect-error — undeclared define is a type error
            api.nope;
        });
    });

    it('a component returning nothing yields a bare Unit', () => {
        xnew(() => {
            const plain = xnew((_unit: Unit) => { /* no defines */ });
            expect(typeof plain.finalize).toBe('function');
            // @ts-expect-error — no defines to access
            plain.anything;
        });
    });
});
