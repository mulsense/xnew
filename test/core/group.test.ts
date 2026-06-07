import { Unit } from '../../src/core/unit';
import { xnew } from '../../src/core/xnew';

// xnew.group: 現ユニットが所有するキー付き子コレクション。
// 生成/破棄は update 走査中(Unit.duringUpdate)だけ即時、走査外からは次 update へ遅延される。
// tick() = start + update（遅延キューの flush もここで走る）。

describe('xnew.group', () => {
    let finalized: string[];

    // 単純な子コンポーネント。finalize されたら id を記録する。
    function Child(unit: Unit, props: { id?: string } = {}) {
        unit.on('finalize', () => finalized.push(props.id ?? ''));
    }

    // group を外へ取り出すための所有者コンポーネント。
    let group: ReturnType<typeof xnew.group>;
    function Owner() {
        group = xnew.group(Child);
    }

    const tick = (): void => { Unit.start(Unit.rootUnit); Unit.update(Unit.rootUnit); };

    beforeEach(() => {
        jest.useFakeTimers({ now: 0 });
        Unit.reset();
        finalized = [];
        xnew(Owner);   // root の子として Owner を生成し、group を束縛
    });
    afterEach(() => { Unit.rootUnit?.finalize(); jest.useRealTimers(); });

    describe('deferred apply (called outside the update tick)', () => {
        it('defers spawn until the next update, then exposes it via get/has/size', () => {
            const ret = group.spawn('a', { id: 'a' });
            expect(ret).toBeUndefined();          // 遅延時は undefined
            expect(group.has('a')).toBe(false);   // まだ反映されない
            expect(group.size).toBe(0);

            tick();                               // flush
            expect(group.has('a')).toBe(true);
            expect(group.get('a')).toBeInstanceOf(Unit);
            expect(group.size).toBe(1);
        });

        it('defers delete until the next update and finalizes the child', () => {
            group.spawn('a', { id: 'a' });
            tick();
            expect(group.has('a')).toBe(true);

            const ret = group.delete('a');
            expect(ret).toBe(false);              // 遅延時は false
            expect(group.has('a')).toBe(true);    // まだ消えない

            tick();
            expect(group.has('a')).toBe(false);
            expect(finalized).toContain('a');
        });
    });

    describe('immediate apply (called inside the update tick)', () => {
        it('spawn returns the created Unit and is idempotent on the same key', () => {
            let first: Unit | undefined;
            let second: Unit | undefined;
            Unit.rootUnit._.children[0].on('update', () => {
                first = group.spawn('x', { id: 'x' });
                second = group.spawn('x', { id: 'x-again' });   // 冪等: 作り直さない
            });
            tick();

            expect(first).toBeInstanceOf(Unit);
            expect(second).toBe(first);
            expect(group.size).toBe(1);
            expect(group.get('x')).toBe(first);
        });

        it('delete returns true and removes the child immediately', () => {
            const owner = Unit.rootUnit._.children[0];
            owner.on('update', () => group.spawn('x', { id: 'x' }));
            tick();   // spawn 'x'

            let ret: boolean | undefined;
            owner.off('update');
            owner.on('update', () => { ret = group.delete('x'); });
            tick();

            expect(ret).toBe(true);
            expect(group.has('x')).toBe(false);
            expect(finalized).toContain('x');
        });
    });

    describe('reconcile', () => {
        it('spawns missing keys and despawns extra ones to match the target set', () => {
            group.reconcile(['a', 'b'], (id) => ({ id }));
            tick();
            expect([...group.keys()].sort()).toEqual(['a', 'b']);

            group.reconcile(['b', 'c'], (id) => ({ id }));   // a を消し c を足す
            tick();
            expect([...group.keys()].sort()).toEqual(['b', 'c']);
            expect(finalized).toContain('a');
        });

        it('snapshots the keys at call time (later mutation of the source has no effect)', () => {
            const want = new Set(['a']);
            group.reconcile(want, (id) => ({ id }));
            want.add('b');   // 呼び出し後に変えても反映されない
            tick();
            expect([...group.keys()]).toEqual(['a']);
        });

        it('clear() despawns everything', () => {
            group.reconcile(['a', 'b'], (id) => ({ id }));
            tick();
            group.clear();
            tick();
            expect(group.size).toBe(0);
        });
    });

    describe('lifecycle', () => {
        it('auto-prunes the index when a child is finalized externally', () => {
            group.spawn('a', { id: 'a' });
            tick();
            const child = group.get('a')!;

            child.finalize();   // 外部から直接 finalize
            expect(group.has('a')).toBe(false);
            expect(group.size).toBe(0);
        });

        it('cascades: finalizing the owner finalizes its grouped children', () => {
            group.spawn('a', { id: 'a' });
            group.spawn('b', { id: 'b' });
            tick();
            expect(group.size).toBe(2);

            Unit.rootUnit._.children[0].finalize();   // owner を finalize
            expect(finalized.sort()).toEqual(['a', 'b']);
        });

        it('grouped children are real children of the owner', () => {
            group.spawn('a', { id: 'a' });
            tick();
            const owner = Unit.rootUnit._.children[0];
            expect(owner._.children).toContain(group.get('a'));
        });
    });
});
