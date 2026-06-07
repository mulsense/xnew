//----------------------------------------------------------------------------------------------------
// group — keyed collection of child units owned by one unit
//
// 「キーで識別される子ユニット群を、外部状態に合わせて spawn / despawn する」パターン
// （例: World が clientId ごとに Player を持つ）を 1 つのマネージャに畳む。xnew.find と違い、
// キー検索でき・スコープはこのグループの子だけ・ライフサイクル（生成/破棄/自動 prune）も担う。
//
// ツリー変更（生成/破棄）は update 走査中(Unit.duringUpdate)だけ即時適用し、走査外（socket の on
// ハンドラ等）からの呼び出しは所有者の次 update へ遅延して安全に適用する。
//
// - Group<K>       : マネージャのインターフェース（get/has/size/keys/values/spawn/delete/reconcile/clear）
// - createGroup    : owner と spawnChild(props)→子Unit を受け、Group を生成（xnew.group が配線する）
//
// 索引除去は各子の 'finalize' に一元化する（delete 経由でも外部 finalize でも索引から自動的に外れる）。
//----------------------------------------------------------------------------------------------------

import { Unit } from './unit';

export interface Group<K = any> {
    readonly size: number;
    get(key: K): Unit | undefined;
    has(key: K): boolean;
    keys(): IterableIterator<K>;
    values(): IterableIterator<Unit>;
    [Symbol.iterator](): IterableIterator<[K, Unit]>;
    /** 居なければ生成して key で索引（冪等）。即時適用時は生成した Unit、遅延時は undefined を返す。 */
    spawn(key: K, props?: object): Unit | undefined;
    /** 子を finalize して索引から除去。即時に削除したら true。遅延適用時・不在時は false。 */
    delete(key: K): boolean;
    /** 目標キー集合へ突き合わせる（missing=spawn / extra=despawn）。 */
    reconcile(keys: Iterable<K>, propsFn?: (key: K) => object | undefined): void;
    /** 全件 despawn。 */
    clear(): void;
}

/**
 * @param owner - このグループを所有するユニット（生成される子の親）
 * @param spawnChild - props を受けて owner の子を 1 つ生成して返す（xnew(owner, Component, props) 相当）
 */
export function createGroup<K = any>(owner: Unit, spawnChild: (props?: object) => Unit): Group<K> {
    const index: Map<K, Unit> = new Map();
    const queue: Array<() => void> = [];
    let flushRegistered = false;

    // update 走査外からの変更は所有者の次 update で flush する（その時 duringUpdate=true なので安全）。
    const enqueue = (op: () => void): void => {
        queue.push(op);
        if (flushRegistered === false) {
            flushRegistered = true;
            owner.on('update', () => {
                const ops = queue.splice(0);
                ops.forEach((op) => op());
            });
        }
    };

    const create = (key: K, props?: object): Unit => {
        const existing = index.get(key);
        if (existing !== undefined) {
            return existing;   // 冪等: 既存なら作り直さない（props は無視）
        }
        const unit = spawnChild(props);
        index.set(key, unit);
        // 索引除去は finalize に一元化（delete 経由でも外部 finalize でも外れる）。
        unit.on('finalize', () => {
            if (index.get(key) === unit) {
                index.delete(key);
            }
        });
        return unit;
    };

    const remove = (key: K): boolean => {
        const unit = index.get(key);
        if (unit === undefined) {
            return false;
        }
        unit.finalize();   // finalize ハンドラが索引から外す
        return true;
    };

    const reconcileNow = (want: Set<K>, propsFn?: (key: K) => object | undefined): void => {
        for (const key of want) {
            if (index.has(key) === false) {
                create(key, propsFn ? propsFn(key) : undefined);
            }
        }
        for (const key of [...index.keys()]) {
            if (want.has(key) === false) {
                remove(key);
            }
        }
    };

    return {
        get size(): number {
            return index.size;
        },
        get(key: K): Unit | undefined {
            return index.get(key);
        },
        has(key: K): boolean {
            return index.has(key);
        },
        keys(): IterableIterator<K> {
            return index.keys();
        },
        values(): IterableIterator<Unit> {
            return index.values();
        },
        [Symbol.iterator](): IterableIterator<[K, Unit]> {
            return index.entries();
        },
        spawn(key: K, props?: object): Unit | undefined {
            if (Unit.duringUpdate === true) {
                return create(key, props);
            }
            enqueue(() => create(key, props));
            return undefined;
        },
        delete(key: K): boolean {
            if (Unit.duringUpdate === true) {
                return remove(key);
            }
            enqueue(() => remove(key));
            return false;
        },
        reconcile(keys: Iterable<K>, propsFn?: (key: K) => object | undefined): void {
            const want = new Set(keys);   // 呼び出し時点のキーを確定（後から呼び元が変えても影響しない）
            if (Unit.duringUpdate === true) {
                reconcileNow(want, propsFn);
            } else {
                enqueue(() => reconcileNow(want, propsFn));
            }
        },
        clear(): void {
            this.reconcile([]);
        },
    };
}
