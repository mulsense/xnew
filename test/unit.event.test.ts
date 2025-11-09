import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit event', () => {
    it('basic', () => {
        let state = 0;
        xnew((self: xnew.Unit) => {
            self.on('-countup', () => state++);
            self.emit('-countup');
            xnew((self: xnew.Unit) => self.emit('-countup'));
        });
        xnew((self: xnew.Unit) => self.emit('-countup'));
        expect(state).toBe(1);
    });

    it('broadcast +', () => {
        let state = 0;
        xnew((self: xnew.Unit) => {
            self.on('+myevent', () => state++);
            self.emit('+myevent');
            xnew((self: xnew.Unit) => self.emit('+myevent'));
        });
        expect(state).toBe(2);
    });
});