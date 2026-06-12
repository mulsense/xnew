import { Unit } from '../../../src/core/unit';
import xnew from '../../../src/index';

describe('xnew.server / xnew.client', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    it('server mode runs server block, skips client block', () => {
        const serverRan = jest.fn(); const clientRan = jest.fn();
        xnew.sync.boot({ mode: 'server' }, (u: Unit) => {
            xnew.server(() => { serverRan(); });
            xnew.client(() => { clientRan(); });
        });
        expect(serverRan).toHaveBeenCalledTimes(1);
        expect(clientRan).not.toHaveBeenCalled();
    });

    it('client mode runs client block, skips server block', () => {
        const serverRan = jest.fn(); const clientRan = jest.fn();
        xnew.sync.boot({ mode: 'client' }, (u: Unit) => {
            xnew.server(() => { serverRan(); });
            xnew.client(() => { clientRan(); });
        });
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
        const unit = xnew.sync.boot({ mode: 'server' }, (u: Unit) => {
            xnew.server(() => ({ greet: () => 'hi-from-server' }));
            xnew.client(() => ({ draw: () => 'should-not-exist' }));
        });
        expect(typeof (unit as any).greet).toBe('function');
        expect((unit as any).greet()).toBe('hi-from-server');
        expect((unit as any).draw).toBeUndefined();   // client block skipped on server
    });

    it('client block builds real DOM on client; not invoked on server', () => {
        let el: any;
        xnew.sync.boot({ mode: 'client' }, (u: Unit) => { xnew.client(() => { el = xnew.nest('<div>'); }); });
        expect(el.tagName).toBe('DIV');

        let el2: any = 'untouched';
        xnew.sync.boot({ mode: 'server' }, (u: Unit) => { xnew.client(() => { el2 = xnew.nest('<div>'); }); });
        expect(el2).toBe('untouched');   // client callback never ran, so nest never called
    });
});
