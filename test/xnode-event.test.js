import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit event', () => {
    it('basic', () => {
        let state = 0;
        xnew(() => {
            xthis.on('countup', () => state++);
            xthis.emit('countup');
            xnew(() => xthis.emit('countup'));
        });
        xnew(() => xthis.emit('countup'));
        expect(state).toBe(1);
    });

    it('broadcast ~', () => {
        let state = 0;
        xnew(() => {
            xthis.on('~myevent', () => state++);
            xthis.emit('~myevent');
            xnew(() => xthis.emit('~myevent'));
        });
        expect(state).toBe(2);
    });
});