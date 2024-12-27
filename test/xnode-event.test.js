import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit event', () => {
    it('basic', () => {
        let state = 0;
        xnew(() => {
            const unit = xnew.current;
            unit.on('countup', () => state++);
            unit.emit('countup');
            xnew(() => xnew.current.emit('countup'));
        });
        xnew(() => xnew.current.emit('countup'));
        expect(state).toBe(1);
    });

    it('broadcast ~', () => {
        let state = 0;
        xnew(() => {
            const unit = xnew.current;
            unit.on('~myevent', () => state++);
            unit.emit('~myevent');
            xnew(() => xnew.current.emit('~myevent'));
        });
        expect(state).toBe(2);
    });
});