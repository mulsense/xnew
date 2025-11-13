import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit event', () => {
    it('basic', () => {
        let state = 0;
        xnew((unit: Unit) => {
            unit.on('-countup', () => state++);
            unit.emit('-countup');
            xnew((unit: Unit) => unit.emit('-countup'));
        });
        xnew((unit: Unit) => unit.emit('-countup'));
        expect(state).toBe(1);
    });

    it('broadcast +', () => {
        let state = 0;
        xnew((unit: Unit) => {
            unit.on('+myevent', () => state++);
            unit.emit('+myevent');
            xnew((unit: Unit) => unit.emit('+myevent'));
        });
        expect(state).toBe(2);
    });
});