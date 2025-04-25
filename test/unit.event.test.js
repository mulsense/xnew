import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit event', () => {
    it('basic', () => {
        let state = 0;
        xnew((self) => {
            self.on('-countup', () => state++);
            xnew.emit('-countup');
            xnew((self) => xnew.emit('-countup'));
        });
        xnew((self) => xnew.emit('-countup'));
        expect(state).toBe(1);
    });

    it('broadcast +', () => {
        let state = 0;
        xnew((self) => {
            self.on('+myevent', () => state++);
            xnew.emit('+myevent');
            xnew((self) => xnew.emit('+myevent'));
        });
        expect(state).toBe(2);
    });
});