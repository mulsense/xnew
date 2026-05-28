import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

afterEach(() => {
    Unit.rootUnit?.finalize();
});

describe('xnew.context', () => {
    it('exposes a value defined by an ancestor via xnew.extend', () => {
        function Theme(_: Unit) {
            return {
                get name() { return 'dark'; },
            };
        }

        xnew(() => {
            xnew.extend(Theme);
            xnew(() => {
                expect(xnew.context(Theme)?.name).toBe('dark');
            });
        });
    });

    it('returns undefined when no ancestor exposes the requested component', () => {
        function Absent(_: Unit) {}

        xnew(() => {
            xnew(() => {
                expect(xnew.context(Absent)).toBeUndefined();
            });
        });
    });
});
