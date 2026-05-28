import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

afterEach(() => {
    Unit.rootUnit?.finalize();
});

describe('Unit events', () => {
    describe('local events (- prefix)', () => {
        it('fires only on the listening unit when emitted from its own scope', () => {
            const listener = jest.fn();
            xnew((unit: Unit) => {
                unit.on('-ping', listener);
                xnew.emit('-ping');
            });
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('does not fire when emitted from a different unit scope', () => {
            const listener = jest.fn();
            xnew((unit: Unit) => {
                unit.on('-ping', listener);
            });
            xnew(() => {
                xnew.emit('-ping');
            });
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('broadcast events (+ prefix)', () => {
        it('reaches matching listeners across the tree', () => {
            const listener = jest.fn();
            xnew((unit: Unit) => {
                unit.on('+ping', listener);
                xnew(() => xnew.emit('+ping'));
            });
            xnew(() => xnew.emit('+ping'));

            expect(listener).toHaveBeenCalledTimes(2);
        });

        it('forwards props with the type to listeners', () => {
            const listener = jest.fn();
            xnew((unit: Unit) => {
                unit.on('+ping', listener);
                xnew.emit('+ping', { value: 42 });
            });
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({ type: '+ping', value: 42 })
            );
        });
    });

    describe('off', () => {
        it('removes a specific listener', () => {
            const listener = jest.fn();
            xnew((unit: Unit) => {
                unit.on('-ping', listener);
                unit.off('-ping', listener);
                xnew.emit('-ping');
            });
            expect(listener).not.toHaveBeenCalled();
        });

        it('removes every listener for a type when no listener is given', () => {
            const a = jest.fn();
            const b = jest.fn();
            xnew((unit: Unit) => {
                unit.on('-ping', a);
                unit.on('-ping', b);
                unit.off('-ping');
                xnew.emit('-ping');
            });
            expect(a).not.toHaveBeenCalled();
            expect(b).not.toHaveBeenCalled();
        });
    });
});
