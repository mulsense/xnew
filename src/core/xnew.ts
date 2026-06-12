//----------------------------------------------------------------------------------------------------
// xnew — public entry point of the library
//
// xnew(...) は現在アクティブな Unit の子として新しい Unit を生成する（初回呼び出しで root と
// ticker を自動初期化）。各ヘルパーは暗黙の Unit.currentUnit に作用するため、Component 関数の
// 中から呼ぶ。実装は Unit の static メソッドへの薄い転送のみ。
//
// - xnew.nest / extend                   : 初期化中の Unit を拡張
// - xnew.find / context                  : Component による検索 / 祖先コンテキスト解決
// - xnew.promise                         : Unit に promise を登録（集約は unit.promise で .then/.catch/.finally）
// - xnew.scope / emit / protect          : スコープ捕捉 / '+global' '-local' イベント / 可視性境界
// - xnew.timeout / interval / transition : UnitTimer によるスケジューリング
// - xnew.server / client                 : mode 限定の extend
//----------------------------------------------------------------------------------------------------

import { Unit, UnitPromise, UnitTimer, ComponentFn, DefinesOf, PropsOf } from './unit';
import { DomElement } from './dom';

// xnew(...) の呼び出しシグネチャ。Component を渡した形は戻り値に defines を合成する(Unit & DefinesOf<C>)。
export interface XnewBase {
    <C extends ComponentFn<any, any>>(Component: C, props?: PropsOf<C>): Unit & DefinesOf<C>;
    <C extends ComponentFn<any, any>>(target: DomElement | string, Component: C, props?: PropsOf<C>): Unit & DefinesOf<C>;
    (target: DomElement | string, content?: string | number): Unit;
    (content: string | number): Unit;
    (parent: Unit | null, ...args: any[]): Unit;
    (): Unit;
}

export const xnew = Object.assign(
    /** Creates a new Unit: xnew((target,) Component?, props?) — target は要素か '<div>' 等のタグ文字列。 */
    (function(...args: any[]): Unit {
        if (Unit.engineRoot === undefined) Unit.reset();

        if (args[0] instanceof Unit) {
            const parent = args.shift() as Unit;
            const snapshot = parent._.afterSnapshot ?? Unit.snapshot(parent);
            return Unit.scope(snapshot, () => new Unit(null, parent, ...args)) as Unit;
        } else {
            const parent = Unit.currentUnit ?? null;
            return new Unit(null, parent, ...args);
        }
    }) as unknown as XnewBase,
    {
        /** Nests a child element（既存要素 or '<div>' 等のタグ文字列）。初期化中のみ呼べる。 */
        nest(target: DomElement | string): HTMLElement | SVGElement {
            if (Unit.currentUnit._.status !== 'invoked') {
                throw new Error('xnew.nest can not be called after initialized.');
            }
            return Unit.nest(Unit.currentUnit, target);
        },

        /** Extends the current unit with another component. 初期化中のみ呼べる。defines を返す。 */
        extend<C extends ComponentFn<any, any>>(Component: C, props?: PropsOf<C>): DefinesOf<C> {
            if (Unit.currentUnit._.status !== 'invoked') {
                throw new Error('xnew.extend can not be called after initialized.');
            }
            if (Unit.currentUnit._.Components.includes(Component) === true) {
                console.warn('Component is already extended in this unit:', Component);
            }
            return Unit.extend(Unit.currentUnit, Component, props) as DefinesOf<C>;
        },

        /** Returns the nearest unit associated with the given component in the ancestor context chain. */
        context(key: any): any {
            return Unit.getContext(Unit.currentUnit, key);
        },
            
        /** Registers a promise to the current unit。第1引数が string ならキー。promise を渡さなければ deferred（{ resolve, reject }）。2 引数で promise が undefined は誤用として throw。 */
        promise: (function (keyOrPromise?: any, maybePromise?: any): any {
            const key = typeof keyOrPromise === 'string' ? keyOrPromise : undefined;
            const promise = typeof keyOrPromise === 'string' ? maybePromise : keyOrPromise;
            // 2 引数で呼ばれたのに promise が undefined → 登録のつもりで promise を渡し忘れた誤用。
            // deferred は xnew.promise() / xnew.promise(key)（1 引数以下）でのみ成立させる。
            if (arguments.length >= 2 && promise === undefined) {
                throw new Error('xnew.promise(key, promise): promise is required when a second argument is given');
            }
            if (promise === undefined) {
                let settled = false;
                let resolve!: (value?: unknown) => void;
                let reject!: (reason?: unknown) => void;
                const unitPromise = new UnitPromise(new Promise((res, rej) => { resolve = res; reject = rej; }));
                unitPromise.key = key;
                Unit.currentUnit._.promises.push(unitPromise);
                return {
                    resolve(value?: unknown) { if (settled) return; settled = true; resolve(value); },
                    reject(reason?: unknown) { if (settled) return; settled = true; reject(reason); },
                };
            }
            let unitPromise: UnitPromise;
            if (promise instanceof Unit) {
                unitPromise = UnitPromise.results(promise._.promises);
            } else if (promise instanceof Promise) {
                unitPromise = new UnitPromise(promise);
            } else {
                unitPromise = new UnitPromise(new Promise(xnew.scope(promise)));
            }
            unitPromise.key = key;
            Unit.currentUnit._.promises.push(unitPromise);
            return unitPromise;
        }) as {
            (): { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            (key: string): { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            (promise: Function | Promise<any> | Unit): UnitPromise;
            (key: string, promise: Function | Promise<any> | Unit): UnitPromise;
        },

        /** Wraps a callback so it later runs in the current unit scope（setTimeout 等の外部コールバック用）。 */
        scope(callback: any): any {
            const snapshot = Unit.snapshot(Unit.currentUnit);
            return (...args: any[]) => Unit.scope(snapshot, callback, ...args);
        },

        /** Finds units by component. opts.key で予約 prop `key` の一致に絞る（key はグローバル一意の想定）。 */
        find(Component: Function, opts?: { key?: any }): Unit[] {
            return Unit.find(Component, opts?.key);
        },

        /** Emits a custom event（'+event' = 全体へ / '-event' = 自 unit のみ）。 */
        emit(type: string, ...args: any[]): void {
            return Unit.emit(type, ...args);
        },

        /** Runs callback once after duration ms（unit のライフサイクルに従う。clear() で中止）。 */
        timeout(callback: Function, duration: number = 0): UnitTimer {
            return new UnitTimer().timeout(callback, duration);
        },

        /** Runs callback every duration ms（iterations 回。0 は無限。clear() で停止）。 */
        interval(callback: Function, duration: number, iterations: number = 0): UnitTimer {
            return new UnitTimer().interval(callback, duration, iterations);
        },

        /** Runs transition({ value: 0→1 }) over duration ms（easing: 'linear'|'ease'|'ease-in'|'ease-out'|'ease-in-out'。チェーン可）。 */
        transition(transition: Function, duration: number = 0, easing: string = 'linear'): UnitTimer {
            return new UnitTimer().transition(transition, duration, easing);
        },

        /**
         * Marks the current unit as a protection boundary: 子孫はサブツリー外からの '+event' emit /
         * find に映らなくなる（unit 自身は可視のまま。サブツリー内からの emit / find は通常どおり）。
         */
        protect(): void {
            Unit.currentUnit._.protected = true;
        },

        /** Extend 相当。ただし client では実行されない（server / standalone のみ。skip 時は {} を返す）。 */
        server<C extends ComponentFn<any, any>>(callback: C, props?: PropsOf<C>): DefinesOf<C> | {} {
            if (Unit.currentUnit._.status !== 'invoked') {
                throw new Error('xnew.server can not be called after initialized.');
            }
            if (Unit.currentUnit._.mode === 'client') {
                return {};
            }
            return Unit.extend(Unit.currentUnit, callback, props) as DefinesOf<C>;
        },

        /** Extend 相当。ただし server では実行されない（client / standalone のみ。skip 時は {} を返す）。 */
        client<C extends ComponentFn<any, any>>(callback: C, props?: PropsOf<C>): DefinesOf<C> | {} {
            if (Unit.currentUnit._.status !== 'invoked') {
                throw new Error('xnew.client can not be called after initialized.');
            }
            if (Unit.currentUnit._.mode === 'server') {
                return {};
            }
            return Unit.extend(Unit.currentUnit, callback, props) as DefinesOf<C>;
        },

    }
);

