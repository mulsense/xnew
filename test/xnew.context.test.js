import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('xnew.context', () => {
    it('basic', () => {
        xnew(() => {
            // expect(xnew.context('hoge', 1)).toBe(undefined);
            xnew.context('hoge', 1);
            expect(xnew.context('hoge')).toBe(1);
            xnew(() => {
                expect(xnew.context('hoge')).toBe(1);
                xnew(() => {
                    // expect(xnew.context('hoge', 2)).toBe(1);
                    xnew.context('hoge', 2);
                    expect(xnew.context('hoge')).toBe(2);
                    xnew(() => {
                        expect(xnew.context('hoge')).toBe(2);
                    });
                });
                expect(xnew.context('hoge')).toBe(1);
            });
        });
    });

});

