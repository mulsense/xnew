import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit event', () => {
    it('basic', () => {
        let state = 0;
        xnew((self) => {
            self.on('countup', () => state++);
            self.emit('countup');
            xnew((self) => self.emit('countup'));
        });
        xnew((self) => self.emit('countup'));
        expect(state).toBe(1);
    });

    it('broadcast ~', () => {
        let state = 0;
        xnew((self) => {
            self.on('~myevent', () => state++);
            self.emit('~myevent');
            xnew((self) => self.emit('~myevent'));
        });
        expect(state).toBe(2);
    });
});