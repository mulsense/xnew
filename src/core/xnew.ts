import { Unit, UnitArgs, UnitPromise, UnitTimer, UnitElement } from './unit';

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
    function(...args: UnitArgs): Unit {
        if (Unit.rootUnit === undefined) Unit.reset();
        return new Unit(Unit.currentUnit, ...args);
    },
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
        nest(target: UnitElement | string): HTMLElement | SVGElement {
            try {
                if (Unit.currentUnit._.state !== 'invoked') {
                    throw new Error('xnew.nest can not be called after initialized.');
                } 
                return Unit.nest(Unit.currentUnit, target);
            } catch (error: unknown) {
                console.error('xnew.nest(target: UnitElement | string): ', error);
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
        extend(Component: Function, props?: Object): { [key: string]: any } {
            try {
                if (Unit.currentUnit._.state !== 'invoked') {
                    throw new Error('xnew.extend can not be called after initialized.');
                }
                if (Unit.currentUnit._.Components.includes(Component) === true) {
                    console.warn('Component is already extended in this unit:', Component);
                }
                const defines = Unit.extend(Unit.currentUnit, Component, props);
                return defines;
            } catch (error: unknown) {
                console.error('xnew.extend(component: Function, props?: Object): ', error);
                throw error;
            }
        },

        append(parent: Unit, ...args: UnitArgs): void {
            try {
                const snapshot = parent._.afterSnapshot ?? Unit.snapshot(parent);
                Unit.scope(snapshot, () => {
                    new Unit(parent, ...args);
                });
            } catch (error: unknown) {
                console.error('xnew.append(parent: Unit, ...args: UnitArgs): ', error);
                throw error;
            }
        },

        next(unit: Unit, ...args: UnitArgs): void {
            try {
                const parent = unit._.parent as Unit;
                const snapshot = parent._.afterSnapshot ?? Unit.snapshot(parent);
                Unit.scope(snapshot, () => {
                    new Unit(parent, ...args);
                });
            } catch (error: unknown) {      
                console.error('xnew.next(unit: Unit, ...args: UnitArgs): ', error);
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

        resolvers() {
            let state: 'pending' | 'resolved' | 'rejected' | null = null;
            let resolve: Function | null = null;
            let reject: Function | null = null;

            const unitPromise = new UnitPromise(new Promise((res, rej) => {
                if (state === 'resolved') {
                    res(null);
                } else if (state === 'rejected') {
                    rej();
                } else {
                    resolve = res;
                    reject = rej;
                    state = 'pending';
                }
            }))
            Unit.currentUnit._.promises.push(unitPromise);

            return {
                resolve() {
                    if (state === 'pending') {
                        resolve?.(null);
                    } 
                    state = 'resolved';
                },
                reject() {
                    if (state === 'pending') {
                        reject?.();
                    }
                    state = 'rejected';
                }
            };
        },

        /**
         * Outputs a value to the current unit's promise results
         * @param object - object to output for the promise
         * @returns void
         * @example
         * xnew.output({ data: 123});
         */
        output(object?: Record<string, any>): void {
            try {
                Object.assign(Unit.currentUnit._.results, object);
            } catch (error: unknown) {
                console.error('xnew.output(object?: Record<string, any>): ', error);
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
         * @example
         * const buttons = xnew.find(ButtonComponent)
         * buttons.forEach(btn => btn.finalize())
         */
        find(Component: Function): Unit[] {
            try {
                return Unit.find(Component);
            } catch (error: unknown) {
                console.error('xnew.find(Component: Function): ', error);
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
         * Call this method within a component function to enable protection.
         * Protected components will not respond to global events emitted via xnew.emit,
         * and will be excluded from xnew.find searches.
         * @example
         * function MyComponent(unit) {
         *   xnew.protect();
         *   // Component logic here
         * }
         */
        protect(): void {
            Unit.currentUnit._.protected = true;
        },

    }
);

