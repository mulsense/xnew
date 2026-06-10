//----------------------------------------------------------------------------------------------------
// xnew — public entry point of the library
//
// `xnew(...)` creates a new Unit as a child of the currently active Unit (auto-initializing the
// root Unit and render ticker on the first call). All the attached helpers operate on the implicit
// Unit.currentUnit, so they are meant to be called from inside a Component function.
//
// This file is intentionally thin: each helper forwards to a static method on Unit, wrapped in a
// try / catch that logs and re-throws so consumers see both a console message and the exception.
//
// - xnew(...)                            : create a child Unit
// - xnew.nest / extend                   : extend the current Unit during initialization
// - xnew.find                            : lookup (optionally by reserved `key` prop)
// - xnew.context                         : ancestor context lookup
// - xnew.promise / then / catch / finally / defer / collect
//                                          promises bound to the current Unit
// - xnew.scope                           : capture current Unit scope into a callback
// - xnew.emit                            : '+global' / '-local' custom events
// - xnew.timeout / interval / transition : UnitTimer-backed scheduling
// - xnew.protect                         : exclude current Unit from emit / find
// - xnew.server / client                 : run a block only on server / client (extend-like)
// - xnew.sync.state / register / capture / apply / emit / boot : server→client state sync (see core/sync.ts)
//   xnew.sync.boot(socket, ...) : create a root bound to socket; mode is derived from the socket
//   (server: transport.server / client: transport.connect()) + auto-wires the down-channel + dispatcher
//----------------------------------------------------------------------------------------------------

import { Unit, UnitPromise, UnitTimer, Mode, ComponentFn, DefinesOf, PropsOf } from './unit';
import { DomElement } from './element';
import { registerOnUnit, captureStateTree, applyStateTree, getRootSocket, wireSyncRoot } from './sync';
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
    /**
     * creates a new Unit component
     * xnew(Component?: Function | string, props?: Object): Unit;
     * xnew(target: HTMLElement | SVGElement | string, Component?: Function | string, props?: Object): Unit;
     * @param target - HTMLElement | SVGElement, or HTML tag for new element
     * @param Component - component function
     * @param props - properties for component function
     * @returns a new Unit instance
     * @example
     * const unit = xnew(MyComponent, { data: 0 })
     * const unit = xnew(element, MyComponent, { data: 0 })
     * const unit = xnew('<div>', MyComponent, { data: 0 })
     */
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
        /**
         * Creates a child HTML/SVG element inside the current component's element.
         * Must be called during component initialization (before setup completes).
         * @param target - An existing HTML/SVG element, or a tag string like `'<div>'`
         * @returns The provided element, or the newly created element
         * @throws Error if called after the component has finished initializing
         * @example
         * const div = xnew.nest('<div>')
         * div.textContent = 'Hello'
         */
        nest(target: DomElement | string): HTMLElement | SVGElement {
            try {
                if (Unit.currentUnit._.status !== 'invoked') {
                    throw new Error('xnew.nest can not be called after initialized.');
                }
                return Unit.nest(Unit.currentUnit, target);
            } catch (error: unknown) {
                console.error('xnew.nest(target: DomElement | string): ', error);
                throw error;
            }
        },

        /**
         * Extends the current component with another component's functionality
         * @param Component - component function to extend with
         * @param props - optional properties to pass to the extended component
         * @returns defines returned by the extended component
         * @throws Error if called after component initialization
         * @example
         * const api = xnew.extend(BaseComponent, { data: {} })
         */
        extend<C extends ComponentFn<any, any>>(Component: C, props?: PropsOf<C>): DefinesOf<C> {
            try {
                if (Unit.currentUnit._.status !== 'invoked') {
                    throw new Error('xnew.extend can not be called after initialized.');
                }
                if (Unit.currentUnit._.Components.includes(Component) === true) {
                    console.warn('Component is already extended in this unit:', Component);
                }
                const defines = Unit.extend(Unit.currentUnit, Component, props);
                return defines as DefinesOf<C>;
            } catch (error: unknown) {
                console.error('xnew.extend(component: Function, props?: Object): ', error);
                throw error;
            }
        },

        /**
         * Gets the Unit instance associated with the given component in the ancestor context chain
         * @param key - component function used as context key
         * @returns The Unit instance registered with the given component, or undefined if not found
         * @example
         * // Create parent unit with component A
         * const parent = xnew(A);
         *
         * // Inside a child component, get the parent unit
         * const parentUnit = xnew.context(A)
         */
        context(key: any): any {
            try {
                return Unit.getContext(Unit.currentUnit, key);
            } catch (error: unknown) {
                console.error('xnew.context(key: any): ', error);
                throw error;
            }
        },
            
        /**
         * Registers a promise with the current component for lifecycle management
         * @param promise - A Promise, async function, or Unit to register
         * @returns UnitPromise wrapper for chaining
         * @example
         * xnew.promise(fetchData()).then(data => console.log(data))
         */
        promise(promise: Function | Promise<any> | Unit): UnitPromise {
            try {
                let unitPromise: UnitPromise;
                if (promise instanceof Unit) {
                    unitPromise = UnitPromise.all(promise._.promises).then(() => promise._.results);
                } else if (promise instanceof Promise) {
                    unitPromise = new UnitPromise(promise)
                } else {
                    unitPromise = new UnitPromise(new Promise(xnew.scope(promise)))
                }
                Unit.currentUnit._.promises.push(unitPromise);
                return unitPromise;
            } catch (error: unknown) {
                console.error('xnew.promise(promise: Promise<any>): ', error);
                throw error;
            }
        },

        /**
         * Handles successful resolution of all registered promises in the current component
         * @param callback - Function to call when all promises resolve
         * @returns UnitPromise for chaining
         * @example
         * xnew.then(results => console.log('All promises resolved', results))
         */
        then(callback: Function): UnitPromise {
            try {
                const currentUnit = Unit.currentUnit;
                return UnitPromise.all(Unit.currentUnit._.promises).then(() => callback(currentUnit._.results));
            } catch (error: unknown) {
                console.error('xnew.then(callback: Function): ', error);
                throw error;
            }
        },

        /**
         * Handles rejection of any registered promise in the current component
         * @param callback - Function to call if any promise rejects
         * @returns UnitPromise for chaining
         * @example
         * xnew.catch(error => console.error('Promise failed', error))
         */
        catch(callback: Function): UnitPromise {
            try {
                return UnitPromise.all(Unit.currentUnit._.promises)
                .catch(callback);
            } catch (error: unknown) {
                console.error('xnew.catch(callback: Function): ', error);
                throw error;
            }
        },

        /**
         * Executes callback after all registered promises settle (resolve or reject)
         * @param callback - Function to call after promises settle
         * @returns UnitPromise for chaining
         * @example
         * xnew.finally(() => console.log('All promises settled'))
         */
        finally(callback: Function): UnitPromise {
            try {
                return UnitPromise.all(Unit.currentUnit._.promises).finally(callback);
            } catch (error: unknown) {
                console.error('xnew.finally(callback: Function): ', error);
                throw error;
            }
        },

        /**
         * Creates a deferred promise registered to the current unit, controllable from outside.
         * Returns `{ resolve, reject }` to settle the promise on demand.
         * Calls after the first settle are ignored.
         * @example
         * const { resolve } = xnew.defer();
         * button.addEventListener('click', () => resolve());
         * xnew.then(() => console.log('clicked'));
         */
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

        /**
         * Outputs a value to the current unit's promise results
         * @param object - object to output for the promise
         * @returns void
         * @example
         * xnew.collect({ data: 123});
         */
        collect(object?: Record<string, any>): void {
            try {
                Object.assign(Unit.currentUnit._.results, object);
            } catch (error: unknown) {
                console.error('xnew.collect(object?: Record<string, any>): ', error);
                throw error;
            }
        },

        /**
         * Creates a scoped callback that captures the current component context
         * @param callback - Function to wrap with current scope
         * @returns Function that executes callback in the captured scope
         * @example
         * setTimeout(xnew.scope(() => {
         *   console.log('This runs in the xnew component scope')
         * }), 1000)
         */
        scope(callback: any): any {
            const snapshot = Unit.snapshot(Unit.currentUnit);
            return (...args: any[]) => Unit.scope(snapshot, callback, ...args);
        },

        /**
         * Finds all instances of a component in the component tree
         * @param Component - Component function to search for
         * @returns Array of Unit instances matching the component
         * @throws Error if component parameter is invalid
         * @param Component - Component function to search for
         * @param opts - optional filter. `key` restricts results to units created with a matching
         *               reserved `key` prop (`xnew(Component, { key })`). key はグローバル一意の想定。
         * @example
         * const buttons = xnew.find(ButtonComponent)
         * const player = xnew.find(Player, { key: clientId })[0]
         */
        find(Component: Function, opts?: { key?: any }): Unit[] {
            try {
                return Unit.find(Component, opts?.key);
            } catch (error: unknown) {
                console.error('xnew.find(Component: Function, opts?): ', error);
                throw error;
            }
        },

        /**
         * Emits a custom event to components
         * @param type - Event type to emit (prefix with '+' for global events, '-' for local events)
         * @param props - Event properties object to pass to listeners
         * @returns void
         * @example
         * xnew.emit('+globalevent', { data: 123 }); // Global event
         * xnew.emit('-localevent', { data: 123 }); // Local event
         */
        emit(type: string, ...args: any[]): void {
            try {
                return Unit.emit(type, ...args);
            } catch (error: unknown) {
                console.error('xnew.emit(type: string, ...args: any[]): ', error);
                throw error;
            }
        },

        /**
         * Executes a callback once after a delay, managed by component lifecycle
         * @param callback - Function to execute after duration
         * @param duration - Duration in milliseconds
         * @returns Object with clear() method to cancel the timeout
         * @example
         * const timer = xnew.timeout(() => console.log('Delayed'), 1000)
         * // Cancel if needed: timer.clear()
         */
        timeout(callback: Function, duration: number = 0): UnitTimer {
            return new UnitTimer().timeout(callback, duration);
        },

        /**
         * Executes a callback repeatedly at specified intervals, managed by component lifecycle
         * @param callback - Function to execute at each duration
         * @param duration - Duration in milliseconds
         * @returns Object with clear() method to stop the interval
         * @example
         * const timer = xnew.interval(() => console.log('Tick'), 1000)
         * // Stop when needed: timer.clear()
         */
        interval(callback: Function, duration: number, iterations: number = 0): UnitTimer {
            return new UnitTimer().interval(callback, duration, iterations);
        },

        /**
         * Creates a transition animation with easing, executing callback with progress values
         * @param callback - Function called with progress value (0.0 to 1.0)
         * @param duration - Duration of transition in milliseconds
         * @param easing - Easing function: 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out' (default: 'linear')
         * @returns Object with clear() and next() methods for controlling transitions
         * @example
         * xnew.transition(p => {
         *   element.style.opacity = p
         * }, 500, 'ease-out').transition(p => {
         *   element.style.transform = `scale(${p})`
         * }, 300)
         */
        transition(transition: Function, duration: number = 0, easing: string = 'linear'): UnitTimer {
            return new UnitTimer().transition(transition, duration, easing);
        },

        /**
         * Call this method within a component function to mark the current unit as a protection boundary.
         * Its DESCENDANTS become a private subtree: '+global' events from xnew.emit and xnew.find lookups
         * made from OUTSIDE the subtree will not reach the descendants. The protected unit itself stays
         * visible, and code inside the subtree can still emit to / find its own descendants.
         * @example
         * function MyComponent(unit) {
         *   xnew.protect();
         *   // Component logic here
         * }
         */
        protect(): void {
            Unit.currentUnit._.protected = true;
        },

        /**
         * Runs `callback` (like xnew.extend) only when the current unit is NOT a client
         * (i.e. server or standalone/null). Place server-only logic here (update handlers,
         * spawning synced children). Skipped — and never invoked — on client units.
         * @returns defines returned by the callback, or {} when skipped
         */
        server<C extends ComponentFn<any, any>>(callback: C, props?: PropsOf<C>): DefinesOf<C> | {} {
            try {
                if (Unit.currentUnit._.status !== 'invoked') {
                    throw new Error('xnew.server can not be called after initialized.');
                }
                if (Unit.currentUnit._.mode === 'client') {
                    return {};
                }
                return Unit.extend(Unit.currentUnit, callback, props) as DefinesOf<C>;
            } catch (error: unknown) {
                console.error('xnew.server(callback: Function, props?: Object): ', error);
                throw error;
            }
        },

        /**
         * Runs `callback` (like xnew.extend) only when the current unit is NOT a server
         * (i.e. client or standalone/null). Place client-only setup here (DOM/sprite creation,
         * render handlers). Skipped — and never invoked — on server units.
         * @returns defines returned by the callback, or {} when skipped
         */
        client<C extends ComponentFn<any, any>>(callback: C, props?: PropsOf<C>): DefinesOf<C> | {} {
            try {
                if (Unit.currentUnit._.status !== 'invoked') {
                    throw new Error('xnew.client can not be called after initialized.');
                }
                if (Unit.currentUnit._.mode === 'server') {
                    return {};
                }
                return Unit.extend(Unit.currentUnit, callback, props) as DefinesOf<C>;
            } catch (error: unknown) {
                console.error('xnew.client(callback: Function, props?: Object): ', error);
                throw error;
            }
        },

        /**
         * State synchronization API (server→client state sync engine).
         * - state    : declare synced state on the current unit (server/standalone use `initial`;
         *              on the client, apply injects server state so `initial` is ignored)
         * - register : 現在のコンポーネントの「直接の同期子」を名前マップ `{ Name: Component }` で宣言（server/client 共通 body で呼ぶ）
         * - capture  : capture a server subtree as a state tree（boot の自動 mirror を使わず、手動・任意レートで配信/検査したいとき用）
         * - apply    : reconcile a state tree into a client subtree（同上）
         *
         * Event channel (client→server / server→client)。transport（loopback / socketio）と Transport 形は
         * アドオン `@mulsense/xnew/addons/xsocket` に分離した（boot に socket を渡す）:
         * - clientId : このルート(client)の自動発番された id（= socket.id）。server では undefined
         * - emit     : イベント送信（client→server / server→client）。payload はオブジェクト。送信ユニットの
         *              syncId を自動付与。プレフィックス **'+event'=全コンポーネント / '-event'=自身(同一 syncId 宛て)**
         *              （無印は '+' と同じく全体）。リスナ名は接頭辞込みで一致: on('+event') ⇄ emit('+event')
         *   受信は xnew.sync.on ではなく **unit.on(event, ({ id, ...payload }) => …)** に統一（受信 unit を明示）。
         *   handler が受ける object は xnew の慣習どおり { type, id, ...payload }（type=イベント名, id=送信元 clientId）。
         *   socket→unit.on の橋渡しは boot が wireSyncRoot で配線する（'-' は同一 syncId のリスナだけ発火）。
         * - boot     : その mode(server/client) でルートを生成する唯一の公開手段。transport を渡すと
         *              socket 自動バインド + 状態の下り(capture/apply)の自動配線も行う
         */
        sync: {
            state(initial: Record<string, any> = {}): Record<string, any> {
                const unit = Unit.currentUnit;
                if (unit._.sync.state === null) {
                    unit._.sync.state = {};
                }
                // 既に値があるキーは尊重し、無いキーだけ initial で埋める。これにより
                // (1) apply が options.state でプリシードしたサーバー状態、(2) 先行する宣言、
                // のどちらも後続の initial より優先される（base + extend 合成のマージ）。
                for (const key of Object.keys(initial)) {
                    if ((key in unit._.sync.state) === false) {
                        unit._.sync.state[key] = initial[key];
                    }
                }
                return unit._.sync.state;
            },
            register(components: Record<string, Function>): void {
                try {
                    if (Unit.currentUnit == null || Unit.currentUnit._.status !== 'invoked') {
                        throw new Error('xnew.sync.register can not be called outside a component.');
                    }
                    registerOnUnit(Unit.currentUnit, components);
                } catch (error: unknown) {
                    console.error('xnew.sync.register(components: Object): ', error);
                    throw error;
                }
            },
            capture(root: Unit): ReturnType<typeof captureStateTree> {
                return captureStateTree(root);
            },
            apply(root: Unit, tree: Parameters<typeof applyStateTree>[1]): void {
                applyStateTree(root, tree);
            },
            /** このルート(client)の自動発番された clientId（= socket.id）。server では undefined。 */
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
                // 接頭辞ルール: '+event' = 全コンポーネントへ / '-event' = 自身(同一 syncId)のみへ。
                // 送信ユニットの syncId を載せて送る（受信側の '-' ルーティング用。'+' では無視される）。
                // ペイロードは data に包む。id（送信元 clientId）は受信側の transport が付与する。
                getRootSocket(unit).emit(event, { syncId: unit._.sync.id, data: payload });
            },

            /**
             * Creates a root Unit bound to `socket`, deriving the engine mode from the socket itself
             * (a `ServerSocket` has `to()` → server / a `ClientSocket` has `disconnect()` → client).
             * This is the only public way to select server / client mode; the root adopts the mode and
             * its descendants inherit it. Resolve the socket from a transport per side — server uses
             * `transport.server`, client uses `transport.connect()`. The remaining arguments are
             * forwarded to `xnew(...)`:
             *   xnew.sync.boot(transport.server, Main)      // server: socket バインド + 下り自動配線
             *   xnew.sync.boot(transport.connect(), Main)   // client: socket バインド + 下り自動配線
             * Binding always auto-wires the down-channel (capture→broadcast / on→apply) and the
             * event dispatcher. transport（loopback / socketio）は addon `@mulsense/xnew/addons/xsocket` から。
             * @returns the Unit created by `xnew(...args)`
             */
            boot(socket: RootSocket, ...args: any[]): Unit {
                // boot ルートはエンジンルートの子として生成する。先にエンジンルートを確実に用意し、
                // それを親（= Unit.currentUnit）として root を直接構築する。
                if (Unit.engineRoot === undefined) { Unit.reset(); }
                // socket のメンバから mode を判定する: ServerSocket は to() を持ち（権威=server）、
                // ClientSocket は disconnect()/id を持つ（複製=client）。
                const mode: Mode = ('to' in socket) ? 'server' : 'client';
                // mode / socket を options で明示的に渡す。socket は unit には保持されず、構築時に
                // boot ルートとして syncRoots へ登録される（子孫は findSyncRoot で解決する）。
                const root = new Unit({ mode, socket }, Unit.currentUnit, ...args);
                // 状態の下り（mirror）と socket→unit.on の橋渡し（dispatcher）を一括で自動配線する（冪等）。
                wireSyncRoot(root);
                return root;
            },
        },

    }
);

