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
            xnew.emit('-countup');
            xnew((unit: Unit) => xnew.emit('-countup'));
        });
        xnew((unit: Unit) => xnew.emit('-countup'));
        expect(state).toBe(1);
    });

    it('broadcast +', () => {
        let state = 0;
        xnew((unit: Unit) => {
            unit.on('+myevent', () => state++);
            xnew.emit('+myevent');
            xnew((unit: Unit) => xnew.emit('+myevent'));
        });
        expect(state).toBe(2);
    });
});