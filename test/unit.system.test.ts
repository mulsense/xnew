import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

describe('Unit lifecycle', () => {
    beforeEach(() => {
        jest.useFakeTimers({ now: 0 });
        Unit.reset();
    });

    afterEach(() => {
        Unit.rootUnit?.finalize();
        jest.useRealTimers();
    });

    it('emits start when the unit is started explicitly after a stop()', async () => {
        const onStart = jest.fn();
        let target!: Unit;

        xnew((unit: Unit) => {
            target = unit;
            unit.stop();
            unit.on('start', onStart);
        });

        setTimeout(() => target.start(), 500);

        await jest.advanceTimersByTimeAsync(499);
        expect(onStart).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(50);
        expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('emits stop when transitioning from started to stopped', async () => {
        const onStop = jest.fn();
        const unit = xnew((u: Unit) => u.on('stop', onStop));

        await jest.advanceTimersByTimeAsync(20);

        unit.stop();
        expect(onStop).toHaveBeenCalledTimes(1);
    });

    it('emits finalize exactly once when the unit is finalized', () => {
        const onFinalize = jest.fn();
        const unit = xnew((u: Unit) => u.on('finalize', onFinalize));

        unit.finalize();
        unit.finalize();

        expect(onFinalize).toHaveBeenCalledTimes(1);
    });
});
