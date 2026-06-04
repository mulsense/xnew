import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';

describe('xnew.server / xnew.client', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); Unit.config.mode = null; });
    afterEach(() => { Unit.rootUnit?.finalize(); Unit.config.mode = null; jest.useRealTimers(); });

    it('server mode runs server block, skips client block', () => {
        const serverRan = jest.fn(); const clientRan = jest.fn();
        Unit.config.mode = 'server';
        xnew((u: Unit) => {
            xnew.server(() => { serverRan(); });
            xnew.client(() => { clientRan(); });
        });
        Unit.config.mode = null;
        expect(serverRan).toHaveBeenCalledTimes(1);
        expect(clientRan).not.toHaveBeenCalled();
    });

    it('client mode runs client block, skips server block', () => {
        const serverRan = jest.fn(); const clientRan = jest.fn();
        Unit.config.mode = 'client';
        xnew((u: Unit) => {
            xnew.server(() => { serverRan(); });
            xnew.client(() => { clientRan(); });
        });
        Unit.config.mode = null;
        expect(clientRan).toHaveBeenCalledTimes(1);
        expect(serverRan).not.toHaveBeenCalled();
    });

    it('null mode runs both blocks', () => {
        const serverRan = jest.fn(); const clientRan = jest.fn();
        xnew((u: Unit) => {
            xnew.server(() => { serverRan(); });
            xnew.client(() => { clientRan(); });
        });
        expect(serverRan).toHaveBeenCalledTimes(1);
        expect(clientRan).toHaveBeenCalledTimes(1);
    });

    it('merges defines returned by the executed block onto the unit', () => {
        Unit.config.mode = 'server';
        const unit = xnew((u: Unit) => {
            xnew.server(() => ({ greet: () => 'hi-from-server' }));
            xnew.client(() => ({ draw: () => 'should-not-exist' }));
        });
        Unit.config.mode = null;
        expect(typeof (unit as any).greet).toBe('function');
        expect((unit as any).greet()).toBe('hi-from-server');
        expect((unit as any).draw).toBeUndefined();   // client block skipped on server
    });

    it('client block builds real DOM on client; not invoked on server', () => {
        Unit.config.mode = 'client';
        let el: any;
        xnew((u: Unit) => { xnew.client(() => { el = xnew.nest('<div>'); }); });
        Unit.config.mode = null;
        expect(el.tagName).toBe('DIV');

        let el2: any = 'untouched';
        Unit.config.mode = 'server';
        xnew((u: Unit) => { xnew.client(() => { el2 = xnew.nest('<div>'); }); });
        Unit.config.mode = null;
        expect(el2).toBe('untouched');   // client callback never ran, so nest never called
    });
});
