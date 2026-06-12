//----------------------------------------------------------------------------------------------------
// xnew — public entry point of the library
//
// xnew(...) は現在アクティブな Unit の子として新しい Unit を生成する（初回呼び出しで root と
// ticker を自動初期化）。各ヘルパーは暗黙の Unit.currentUnit に作用するため、Component 関数の
// 中から呼ぶ。実装は Unit の static メソッドへの薄い転送のみ。
//
// - xnew.nest / extend                   : 初期化中の Unit を拡張
// - xnew.find / context                  : Component による検索 / 祖先コンテキスト解決
// - xnew.promise / then / catch / finally / defer : Unit に紐づく promise 管理
// - xnew.scope / emit / protect          : スコープ捕捉 / '+global' '-local' イベント / 可視性境界
// - xnew.timeout / interval / transition : UnitTimer によるスケジューリング
// - xnew.server / client                 : mode 限定の extend
// - xnew.sync.*                          : server→client 状態同期（core/sync.ts）
//----------------------------------------------------------------------------------------------------

import { Unit, UnitPromise, UnitTimer, ComponentFn, DefinesOf, PropsOf } from './unit';
import { DomElement } from './dom';
import { syncOf, registerOnUnit, captureStateTree, applyStateTree, getRootSocket, bootSyncRoot, loopback, socketio, serveRooms } from './sync';
import type { RootSocket } from './sync';

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
            
        /** Registers a promise（Promise / async 関数 / Unit）to the current unit。第1引数が string ならキー。 */
        promise(keyOrPromise: string | Function | Promise<any> | Unit, maybePromise?: Function | Promise<any> | Unit): UnitPromise {
            const key = typeof keyOrPromise === 'string' ? keyOrPromise : undefined;
            const promise = (typeof keyOrPromise === 'string' ? maybePromise : keyOrPromise)!;
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
        },

        /** Runs callback(results) after all registered promises resolve（results はキー付き promise の最終値）。 */
        then(callback: Function): UnitPromise {
            return UnitPromise.results(Unit.currentUnit._.promises).then(callback);
        },

        /** Runs callback if any registered promise rejects. */
        catch(callback: Function): UnitPromise {
            return UnitPromise.all(Unit.currentUnit._.promises).catch(callback);
        },

        /** Runs callback after all registered promises settle. */
        finally(callback: Function): UnitPromise {
            return UnitPromise.all(Unit.currentUnit._.promises).finally(callback);
        },

        /** Registers a deferred promise; 返り値の { resolve, reject } で外から settle する（2 回目以降は無視）。 */
        defer(): { resolve: () => void; reject: () => void } {
            let settled = false;
            let resolve!: (value?: unknown) => void;
            let reject!: (reason?: unknown) => void;

            const unitPromise = new UnitPromise(new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            }));
            Unit.currentUnit._.promises.push(unitPromise);

            return {
                resolve() {
                    if (settled) return;
                    settled = true;
                    resolve();
                },
                reject() {
                    if (settled) return;
                    settled = true;
                    reject();
                },
            };
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

        /**
         * State synchronization API（server→client 状態同期。詳細は core/sync.ts）。
         * - state / register : 同期 state の宣言 / 直接の同期子 {Name: Component} の登録
         * - capture / apply  : 手動同期用（boot の自動 mirror を使わない場合）
         * - emit / clientId  : イベント送信（'+event'=全体 / '-event'=同一 syncId のみ。受信は unit.on）/ 自 client id
         * - boot             : socket をバインドしたルート生成（mode は socket から判定。下り mirror + dispatcher を自動配線）
         */
        sync: {
            state(initial: Record<string, any> = {}): Record<string, any> {
                const data = syncOf(Unit.currentUnit);
                if (data.state === null) {
                    data.state = {};
                }
                // 既存キーは尊重し、無いキーだけ initial で埋める（apply のプリシードや先行宣言を優先）。
                for (const key of Object.keys(initial)) {
                    if ((key in data.state) === false) {
                        data.state[key] = initial[key];
                    }
                }
                return data.state;
            },
            register(components: Record<string, Function>): void {
                if (Unit.currentUnit == null || Unit.currentUnit._.status !== 'invoked') {
                    throw new Error('xnew.sync.register can not be called outside a component.');
                }
                registerOnUnit(Unit.currentUnit, components);
            },
            capture(root: Unit): ReturnType<typeof captureStateTree> {
                return captureStateTree(root);
            },
            apply(root: Unit, tree: Parameters<typeof applyStateTree>[1]): void {
                applyStateTree(root, tree);
            },
            /** この client の id（= socket.id）。server では undefined。 */
            get clientId(): string | undefined {
                const unit = Unit.currentUnit;
                if (unit === null) {
                    throw new Error('xnew.sync.clientId can not be read outside a component.');
                }
                return (getRootSocket(unit) as any).id;
            },
            emit(event: string, payload: Record<string, any> = {}): void {
                const unit = Unit.currentUnit;
                if (unit === null) {
                    throw new Error('xnew.sync.emit can not be called outside a component or its handlers.');
                }
                // 送信ユニットの syncId を載せる（受信側の '-event' ルーティング用）。
                getRootSocket(unit).emit(event, { syncId: syncOf(unit).id, data: payload });
            },

            /**
             * Creates a root Unit bound to `socket`（server: transport.server / client: transport.connect()。
             * mode は socket の形から判定し子孫へ継承）。残りの引数は xnew(...) へ転送。
             * 下り mirror（capture→broadcast / on→apply）と dispatcher の配線は bootSyncRoot が行う。
             */
            boot(socket: RootSocket, ...args: any[]): Unit {
                if (Unit.engineRoot === undefined) { Unit.reset(); }
                return bootSyncRoot(socket, Unit.currentUnit, ...args);
            },

            // transport（boot に渡す socket の供給元）
            loopback,    // in-memory ハブ（同一プロセスで server↔client。テスト/擬似用）
            socketio,    // socket.io を Transport 形へ橋渡し
            serveRooms,  // ロビー + 動的ルームのサーバー配線（ルームごとに boot）
        },

    }
);

