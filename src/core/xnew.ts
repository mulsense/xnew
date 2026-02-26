import { Unit, UnitPromise, UnitTimer, UnitElement } from './unit';

export interface CreateUnit {
    /**
     * creates a new Unit component
     * @param Component - component function
     * @param props - properties for component function
     * @returns a new Unit instance
     * @example
     * const unit = xnew(MyComponent, { data: 0 })
     */
    (Component?: Function | string, props?: Object): Unit;

    /**
     * creates a new Unit component
     * @param target - HTMLElement | SVGElement, or HTML tag for new element
     * @param Component - component function
     * @param props - properties for component function
     * @returns a new Unit instance
     * @example
     * const unit = xnew(element, MyComponent, { data: 0 })
     * const unit = xnew('<div>', MyComponent, { data: 0 })
     */
    (target: HTMLElement | SVGElement | string, Component?: Function | string, props?: Object): Unit;
}

export const xnew = Object.assign(
    function(...args: any[]): Unit {
        if (Unit.rootUnit === undefined) Unit.reset();

        let target: UnitElement | string | null;
        if (args[0] instanceof HTMLElement || args[0] instanceof SVGElement) {
            target = args.shift(); // an existing html element
        } else if (typeof args[0] === 'string' && args[0].match(/<((\w+)[^>]*?)\/?>/)) {
            target = args.shift();
        } else {
            target = null;
        }

        const Component: Function | string | undefined = args.shift();
        const props: Object | undefined = args.shift();
        
        return new Unit(Unit.currentUnit, target, Component, props);
    } as CreateUnit,
    {
        /**
         * Creates a nested HTML/SVG element within the current component
         * @param target - HTML or SVG tag string (e.g., '<div class="my-class">', '<span style="color:red">', '<svg viewBox="0 0 24 24">')
         * @returns The created HTML/SVG element
         * @throws Error if called after component initialization
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
                console.error('xnew.nest(target: HTMLElement | SVGElement | string): ', error);
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
                return Unit.extend(Unit.currentUnit, Component, props);
            } catch (error: unknown) {
                console.error('xnew.extend(component: Function, props?: Object): ', error);
                throw error;
            }
        },

        /**
         * Gets a context value that can be accessed in follow context
         * @param component - component function
         * @returns The context value
         * @example
         * // Create unit
         * const a = xnew(A);
         * ------------------------------
         * 
         * // Get context in child
         * const a = xnew.context(A)
         */
        context(component: Function): any {
            try {
                return Unit.context(Unit.currentUnit, component);
            } catch (error: unknown) {
                console.error('xnew.context(component: Function): ', error);
                throw error;
            }
        },
            
        /**
         * Registers a promise with the current component for lifecycle management
         * @param promise - Promise to register
         * @returns UnitPromise wrapper for chaining
         * @example
         * xnew.promise(fetchData()).then(data => console.log(data))
         */
        promise(promise: Function | Promise<any> | Unit): UnitPromise {
            try {
                const component = Unit.currentUnit._.currentComponent;
                let unitPromise: UnitPromise;
                if (promise instanceof Unit) {
                    unitPromise = new UnitPromise(promise._.done.promise, component)
                } else if (promise instanceof Promise) {
                    unitPromise = new UnitPromise(promise, component)
                } else {
                    unitPromise = new UnitPromise(new Promise(xnew.scope(promise)), component)
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
                const Component = Unit.currentUnit._.currentComponent;
                const promises = Unit.currentUnit._.promises;
                return new UnitPromise(Promise.all(promises.map(p => p.promise)), null)
                .then((results: any[]) => {
                    callback(results.filter((_, index) => promises[index].Component !== null && promises[index].Component === Component));
                });
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
                const promises = Unit.currentUnit._.promises;
                return new UnitPromise(Promise.all(promises.map(p => p.promise)), null)
                .catch(callback);
            } catch (error: unknown) {
                console.error('xnew.catch(callback: Function): ', error);
                throw error;
            }
        },

        /**
         * Resolves the current unit's promise with the given value
         * @param value - Value to resolve the promise with
         * @returns void
         * @example
         * xnew.resolve('data');
         */
        resolve(value?: any): void {
            try {
                const done = Unit.currentUnit._.done;
                done.resolve(value);
            } catch (error: unknown) {
                console.error('xnew.resolve(value?: any): ', error);
                throw error;
            }
        },

        /**
         * Rejects the current unit's promise with the given reason
         * @param reason - Reason to reject the promise
         * @returns void
         * @example
         * xnew.reject(new Error('Something went wrong'));
         */
        reject(reason?: any): void {
            try {
                const done = Unit.currentUnit._.done;
                done.reject(reason);
            } catch (error: unknown) {
                console.error('xnew.reject(reason?: any): ', error);
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
                const promises = Unit.currentUnit._.promises;
                return new UnitPromise(Promise.all(promises.map(p => p.promise)), null)
                .finally(callback);
            } catch (error: unknown) {
                console.error('xnew.finally(callback: Function): ', error);
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
         * @param component - Component function to search for
         * @returns Array of Unit instances matching the component
         * @throws Error if component parameter is invalid
         * @example
         * const buttons = xnew.find(ButtonComponent)
         * buttons.forEach(btn => btn.finalize())
         */
        find(component: Function): Unit[] {
            try {
                return Unit.find(component);
            } catch (error: unknown) {
                console.error('xnew.find(component: Function): ', error);
                throw error;
            }
        },

        /**
         * Emits a custom event to components
         * @param type - Event type to emit (prefix with '+' for global events, '-' for local events)
         * @param args - Additional arguments to pass to event listeners
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
         * @param callback - Function to execute after Duration
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

