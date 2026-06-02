import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

//----------------------------------------------------------------------------------------------------
// xnew.protect — traced real semantics (see src/core/xnew.ts protect + src/core/unit.ts emit/find)
//
// xnew.protect() sets `Unit.currentUnit._.protected = true` (xnew.ts:349). The ONLY place that flag
// is read is Unit.emit's '+global' path (unit.ts:412-425):
//
//   - `current`   = Unit.currentUnit (the emitting unit)
//   - `ancestors` = every ancestor of `current` (walking `_.parent`)
//   - for each listener `unit` of `type`, walk up its own `_.parent` chain to the NEAREST protected
//     unit `find`. Deliver only when:
//         find === undefined            (no protected unit on the listener's chain), OR
//         ancestors.includes(find)      (the protected boundary is an ancestor of the emitter), OR
//         current === find              (the emitter IS the protected unit)
//
// Observable boundary: a protected unit blocks '+global' events from reaching listeners inside its
// subtree WHEN the event is emitted from OUTSIDE that subtree. If the emitter sits inside (or is)
// the protected subtree, delivery proceeds normally.
//
// Unit.find (unit.ts:356-358) returns component2units verbatim and NEVER reads `_.protected`, so
// protect does NOT affect xnew.find despite the JSDoc claim — covered by it.todo below.
//----------------------------------------------------------------------------------------------------

describe('xnew.protect', () => {
    beforeEach(() => {
        Unit.reset();
    });
    afterEach(() => {
        Unit.rootUnit?.finalize();
    });

    it('is idempotent when called multiple times', () => {
        expect(() => {
            xnew((unit: Unit) => {
                void unit;
                xnew.protect();
                xnew.protect();
            });
        }).not.toThrow();
    });

    describe('global emit boundary', () => {
        it('blocks a global event from reaching a protected subtree when emitted from outside', () => {
            const cb = jest.fn();
            xnew(() => {
                // protected branch: listener lives inside a protected parent
                xnew((protectedParent: Unit) => {
                    void protectedParent;
                    xnew.protect();
                    xnew((listenerUnit: Unit) => listenerUnit.on('+ping', cb));
                });
                // emitter in an unrelated branch, OUTSIDE the protected subtree
                xnew((emitterUnit: Unit) => {
                    void emitterUnit;
                    xnew.emit('+ping');
                });
            });
            expect(cb).not.toHaveBeenCalled();
        });

        it('still delivers a global event emitted from inside the protected subtree', () => {
            const cb = jest.fn();
            xnew(() => {
                xnew((protectedParent: Unit) => {
                    void protectedParent;
                    xnew.protect();
                    // both listener and emitter are inside the protected subtree
                    xnew((listenerUnit: Unit) => listenerUnit.on('+ping', cb));
                    xnew((emitterUnit: Unit) => {
                        void emitterUnit;
                        xnew.emit('+ping');
                    });
                });
            });
            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('does not affect delivery to unprotected listeners in other branches', () => {
            const protectedCb = jest.fn();
            const openCb = jest.fn();
            xnew(() => {
                // protected branch
                xnew(() => {
                    xnew.protect();
                    xnew((u: Unit) => u.on('+ping', protectedCb));
                });
                // unprotected branch — should still receive
                xnew((u: Unit) => u.on('+ping', openCb));
                // emitter outside both branches
                xnew((emitterUnit: Unit) => {
                    void emitterUnit;
                    xnew.emit('+ping');
                });
            });
            expect(protectedCb).not.toHaveBeenCalled();
            expect(openCb).toHaveBeenCalledTimes(1);
        });
    });

    // Unit.find ignores `_.protected` entirely (unit.ts:356-358 returns component2units verbatim),
    // so the JSDoc claim that protected units are "excluded from xnew.find searches" is NOT
    // implemented. Asserting exclusion here would fabricate a feature that does not exist.
    it.todo('protect does not affect xnew.find (confirmed in source: Unit.find unit.ts:356-358 never reads _.protected)');
});
