import { Timer } from './time';
import { Unit, UnitPromise } from './unit';

interface CreateUnit {
    /**
     * Creates a new Unit component  
     * @param Component - component function
     * @param props - properties for component function
     * @returns A new Unit instance
     * @example
     * const unit = xnew(MyComponent, { data: 0 })
     */
    (Component?: Function | string, props?: Object): Unit;

    /**
     * Creates a new Unit component
     * @param target - HTMLElement, SVGElement, selector string, or HTML tag for new element
     * @param Component - component function
     * @param props - properties for component function
     * @returns A new Unit instance
     * @example
     * const unit = xnew(element, MyComponent, { data: 0 })
     * const unit = xnew('#selector', MyComponent, { data: 0 })
     * const unit = xnew('<div>', MyComponent, { data: 0 })
     */
    (target: HTMLElement | SVGElement, Component?: Function | string, props?: Object): Unit;
}

export const xnew = Object.assign(
    function(...args: any[]): Unit {
        if (Unit.root === undefined) {
            Unit.reset();
        }        
        return new Unit(Unit.current, ...args);
    } as CreateUnit,
    {
        /**
         * Creates a nested HTML/SVG element within the current component
         * @param tag - HTML or SVG tag name (e.g., '<div>', '<span>', '<svg>')
         * @returns The created HTML/SVG element
         * @throws Error if called after component initialization
         * @example
         * const div = xnew.nest('<div>')
         * div.textContent = 'Hello'
         */
        nest(tag: string): HTMLElement | SVGElement {
            if (Unit.current?._.state === 'invoked') {
                return Unit.nest(Unit.current, tag);
            } else {
                throw new Error('xnew.nest: This function can not be called after initialized.');
            }
        },

        /**
         * Extends the current component with another component's functionality
         * @param component - Component function to extend with
         * @param props - Optional properties to pass to the extended component
         * @returns The extended component's return value
         * @throws Error if called after component initialization
         * @example
         * const api = xnew.extend(BaseComponent, { data: {} })
         */
        extend(component: Function, props?: Object): { [key: string]: any } {
            if (Unit.current?._.state === 'invoked') {
                return Unit.extend(Unit.current, component, props);
            } else {
                throw new Error('xnew.extend: This function can not be called after initialized.');
            }
        },

        /**
         * Gets or sets a context value that can be accessed by child components
         * @param key - Context key
         * @param value - Optional value to set (if undefined, gets the value)
         * @returns The context value if getting, undefined if setting
         * @example
         * // Set context in parent
         * xnew.context('theme', 'dark')
         *
         * // Get context in child
         * const theme = xnew.context('theme')
         */
        context(key: string, value: any = undefined): any {
            try {
                return Unit.context(Unit.current, key, value);
            } catch (error: unknown) {
                console.error('xnew.context(key: string, value?: any): ', error);
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
        promise(promise: Promise<any>): UnitPromise {
            try {
                Unit.current._.promises.push(promise);
                return new UnitPromise(promise);
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
                return new UnitPromise(Promise.all(Unit.current._.promises)).then(callback);
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
                return new UnitPromise(Promise.all(Unit.current._.promises)).catch(callback);
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
                return new UnitPromise(Promise.all(Unit.current._.promises)).finally(callback);
            } catch (error: unknown) {
                console.error('xnew.finally(callback: Function): ', error);
                throw error;
            }
        },

        /**
         * Fetches a resource and registers the promise with the current component
         * @param url - URL to fetch
         * @param options - Optional fetch options (method, headers, body, etc.)
         * @returns UnitPromise wrapping the fetch promise
         * @example
         * xnew.fetch('/api/users').then(res => res.json()).then(data => console.log(data))
         */
        fetch(url: string, options?: object): UnitPromise {
            try {
                const promise = fetch(url, options);
                Unit.current._.promises.push(promise);
                return new UnitPromise(promise);
            } catch (error: unknown) {
                console.error('xnew.promise(url: string, options?: object): ', error);
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
            const snapshot = Unit.snapshot(Unit.current);
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
            if (typeof component === 'function') {
                return Unit.find(component);
            } else {
                throw new Error('xnew.find(component: Function): [component] is invalid.');
            }
        },

        /**
         * Appends new components to existing component(s) in the tree
         * @param anchor - Component function or Unit instance to append to
         * @param args - Arguments to pass to xnew for creating child components
         * @throws Error if anchor parameter is invalid
         * @example
         * xnew.append(MyContainer, ChildComponent, { prop: 'value' })
         * xnew.append(unitInstance, AnotherComponent)
         */
        append(anchor: Unit, ...args: any[]): void {
            if (typeof anchor === 'function') {
                const units = Unit.find(anchor);
                Unit.scope(Unit.snapshot(units[0]), xnew, ...args);
            } else if (anchor instanceof Unit) {
                Unit.scope(Unit.snapshot(anchor), xnew, ...args);
            } else {
                throw new Error('xnew.append(anchor: Function | Unit, xnew arguments): [anchor] is invalid.');
            }
        },

        /**
         * Executes a callback once after a delay, managed by component lifecycle
         * @param callback - Function to execute after delay
         * @param delay - Delay in milliseconds
         * @returns Object with clear() method to cancel the timeout
         * @example
         * const timer = xnew.timeout(() => console.log('Delayed'), 1000)
         * // Cancel if needed: timer.clear()
         */
        timeout(callback: Function, delay: number = 0): any {
            const snapshot = Unit.snapshot(Unit.current);
            const unit = xnew((self: Unit) => {
                const timer = new Timer(() => {
                    Unit.scope(snapshot, callback);
                    self.finalize();
                }, null, delay, false);
                self.on('finalize', () => timer.clear());
            });
            return { clear: () => unit.finalize() };
        },

        /**
         * Executes a callback repeatedly at specified intervals, managed by component lifecycle
         * @param callback - Function to execute at each interval
         * @param delay - Interval duration in milliseconds
         * @returns Object with clear() method to stop the interval
         * @example
         * const timer = xnew.interval(() => console.log('Tick'), 1000)
         * // Stop when needed: timer.clear()
         */
        interval(callback: Function, delay: number): any {
            const snapshot = Unit.snapshot(Unit.current);
            const unit = xnew((self: Unit) => {
                const timer = new Timer(() => {
                    Unit.scope(snapshot, callback);
                }, null, delay, true);
                self.on('finalize', () => timer.clear());
            });
            return { clear: () => unit.finalize() };
        },

        /**
         * Creates a transition animation with easing, executing callback with progress values
         * @param callback - Function called with progress value (0.0 to 1.0)
         * @param interval - Duration of transition in milliseconds
         * @param easing - Easing function: 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out' (default: 'linear')
         * @returns Object with clear() and next() methods for controlling transitions
         * @example
         * xnew.transition(progress => {
         *   element.style.opacity = progress
         * }, 500, 'ease-out').next(progress => {
         *   element.style.transform = `scale(${progress})`
         * }, 300)
         */
        transition(callback: Function, interval: number, easing: string = 'linear'): any {
            const snapshot = Unit.snapshot(Unit.current);

            let stacks: any = [];
            let unit = xnew(Local, { callback, interval, easing });
            let isRunning = true;

            const timer = { clear, next };
            return timer;

            function execute() {
                if (isRunning === false && stacks.length > 0) {
                    unit = xnew(Local, stacks.shift());
                    isRunning = true;
                }
            }

            function clear() {
                stacks = [];
                unit.finalize();
            }

            function next(callback: Function, interval: number = 0, easing: string = 'linear'): any {
                stacks.push({ callback, interval, easing });
                execute();
                return timer;
            }

            function Local(self: Unit, { callback, interval, easing }: { callback: Function, interval: number, easing: string }) {
                const timer = new Timer(() => {
                    Unit.scope(snapshot, callback, 1.0);
                    self.finalize();
                }, (x: number) => {
                    if (x < 1.0) {
                        if (easing === 'ease-out') {
                            x = Math.pow((1.0 - Math.pow((1.0 - x), 2.0)), 0.5);
                        } else if (easing === 'ease-in') {
                            x = Math.pow((1.0 - Math.pow((1.0 - x), 0.5)), 2.0);
                        } else if (easing === 'ease') {
                            x = (1.0 - Math.cos(x * Math.PI)) / 2.0;
                        } else if (easing === 'ease-in-out') {
                            x = (1.0 - Math.cos(x * Math.PI)) / 2.0;
                        }
                        Unit.scope(snapshot, callback, x);
                    }
                }, interval);
                self.on('finalize', () => {
                    timer.clear();
                    isRunning = false;
                    execute();
                });
            }
        },

        /**
         * Creates an event listener manager for a target element with automatic cleanup
         * @param target - Element, Window, or Document to attach listeners to
         * @returns Object with on() and off() methods for managing event listeners
         * @example
         * const mouse = xnew.listener(window)
         * mouse.on('mousemove', (e) => console.log(e.clientX, e.clientY))
         * // Automatically cleaned up when component finalizes
         */
        listener(target: HTMLElement | SVGElement | Window | Document) {
            return {
                on(type: string, listener: Function, options?: boolean | AddEventListenerOptions) {
                    Unit.subon(Unit.current, target, type, listener, options);
                },
                off(type?: string, listener?: Function) {
                    Unit.suboff(Unit.current, target, type, listener);
                }
            }
        },

        /**
         * Registers a capture function that can intercept and handle child component events
         * @param execute - Function that receives child unit and returns boolean (true to stop propagation)
         * @example
         * xnew.capture((childUnit) => {
         *   console.log('Child component created:', childUnit)
         *   return false // Continue propagation
         * })
         */
        capture(execute: (unit: Unit) => boolean | void) {
            Unit.current._.captures.push(Unit.wrap(Unit.current, (unit: Unit) => execute(unit)));
        },
    }
);

