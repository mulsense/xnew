import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

describe('xnew.server / xnew.browser', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); xnew.config.mode = null; });
    afterEach(() => { Unit.rootUnit?.finalize(); xnew.config.mode = null; jest.useRealTimers(); });

    it('authoritative runs server block, skips browser block', () => {
        const serverRan = jest.fn(); const browserRan = jest.fn();
        xnew.config.mode = 'authoritative';
        xnew((u: Unit) => {
            xnew.server(() => { serverRan(); });
            xnew.browser(() => { browserRan(); });
        });
        xnew.config.mode = null;
        expect(serverRan).toHaveBeenCalledTimes(1);
        expect(browserRan).not.toHaveBeenCalled();
    });

    it('replica runs browser block, skips server block', () => {
        const serverRan = jest.fn(); const browserRan = jest.fn();
        xnew.config.mode = 'replica';
        xnew((u: Unit) => {
            xnew.server(() => { serverRan(); });
            xnew.browser(() => { browserRan(); });
        });
        xnew.config.mode = null;
        expect(browserRan).toHaveBeenCalledTimes(1);
        expect(serverRan).not.toHaveBeenCalled();
    });

    it('null mode runs both blocks', () => {
        const serverRan = jest.fn(); const browserRan = jest.fn();
        xnew((u: Unit) => {
            xnew.server(() => { serverRan(); });
            xnew.browser(() => { browserRan(); });
        });
        expect(serverRan).toHaveBeenCalledTimes(1);
        expect(browserRan).toHaveBeenCalledTimes(1);
    });

    it('merges defines returned by the executed block onto the unit', () => {
        xnew.config.mode = 'authoritative';
        const unit = xnew((u: Unit) => {
            xnew.server(() => ({ greet: () => 'hi-from-server' }));
            xnew.browser(() => ({ draw: () => 'should-not-exist' }));
        });
        xnew.config.mode = null;
        expect(typeof (unit as any).greet).toBe('function');
        expect((unit as any).greet()).toBe('hi-from-server');
        expect((unit as any).draw).toBeUndefined();   // browser block skipped on authoritative
    });

    it('browser block builds real DOM on replica; not invoked on authoritative', () => {
        xnew.config.mode = 'replica';
        let el: any;
        xnew((u: Unit) => { xnew.browser(() => { el = xnew.nest('<div>'); }); });
        xnew.config.mode = null;
        expect(el.tagName).toBe('DIV');

        let el2: any = 'untouched';
        xnew.config.mode = 'authoritative';
        xnew((u: Unit) => { xnew.browser(() => { el2 = xnew.nest('<div>'); }); });
        xnew.config.mode = null;
        expect(el2).toBe('untouched');   // browser callback never ran, so nest never called
    });
});
