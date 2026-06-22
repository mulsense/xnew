import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/index';
import { ioMock, bootServer, bootClient } from './io-mock';

// mode（server/client）は実行環境で決まる（Node=server / browser=client、core/env）。
// xnew.server / xnew.client は現在の環境を見て、その環境のブロックだけを実行する。

describe('xnew.server / xnew.client by environment', () => {
    let hub: ReturnType<typeof ioMock>;
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); hub = ioMock(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    it('server environment runs server blocks for the root and nested units', () => {
        const ran: string[] = [];
        bootServer({ io: hub.io }, (_: Unit) => {
            xnew.server(() => { ran.push('root-server'); });
            xnew.client(() => { ran.push('root-client'); });
            xnew((_c: Unit) => {
                xnew.server(() => { ran.push('child-server'); });
                xnew.client(() => { ran.push('child-client'); });
            });
        });
        expect(ran).toEqual(['root-server', 'child-server']);   // 環境はサブツリー全体に効く
    });

    it('client environment runs client blocks', () => {
        const ran: string[] = [];
        bootClient({ socket: hub.connect() }, (_: Unit) => {
            xnew.server(() => { ran.push('server'); });
            xnew.client(() => { ran.push('client'); });
        });
        expect(ran).toEqual(['client']);
    });
});

describe('xnew.sync.boot', () => {
    let hub: ReturnType<typeof ioMock>;
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); hub = ioMock(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    it('creates and returns the root unit', () => {
        const unit = bootServer({ io: hub.io }, (_: Unit) => {});
        expect(unit).toBeInstanceOf(Unit);
    });

    it('forwards extra args to the unit (target, Component)', () => {
        const el = document.createElement('div');
        const unit = bootClient({ socket: hub.connect() }, el, (_: Unit) => {});
        expect(unit.element).toBe(el);
    });

    it('propagates a throw from the component', () => {
        expect(() => bootServer({ io: hub.io }, () => { throw new Error('boom'); })).toThrow('boom');
    });
});
