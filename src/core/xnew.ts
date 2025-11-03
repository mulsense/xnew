import { Timer } from './time';
import { Unit, UnitScope, UnitPromise, UnitElement } from './unit';

export namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}

export interface xnewtype {
    (...args: any[]): Unit;
    // nest(html: string): UnitElement;
    [key: string]: any;
}

export const xnew: xnewtype = (() => {
    const fn = function (...args: any[]): Unit {
        let target;
        if (args[0] instanceof HTMLElement || args[0] instanceof SVGElement) {
            target = args.shift(); // an existing html element
        } else if (typeof args[0] === 'string') {
            const str = args.shift(); // a selector for an existing html element
            if (str.match(/<([^>]*)\/?>/)) {
                target = str;
            } else {
                target = document.querySelector(str); 
                if (target == null) {
                    throw new Error(`'${str}' can not be found.`);
                }
            }
        } else {
            target = null;
        }

        const unit = new Unit(target, ...args);
        return unit;
    }

    fn.nest = (tag: string): UnitElement => {
        const current = UnitScope.current;
        if (current?._.state === 'invoked') {
            const element = Unit.nest(current, tag);
            if (element instanceof HTMLElement || element instanceof SVGElement) {
                return element;
            } else {
                throw new Error('');
            }
        } else {
            throw new Error('This function can not be called after initialized.');
        }
    }

    fn.extend = (component: Function, props?: Object): any => {
        const current = UnitScope.current;
        if (current?._.state === 'invoked') {
            return Unit.extend(current, component, props);
        } else {
            throw new Error('This function can not be called after initialized.');
        }
    }

    fn.context = (key: string, value: any = undefined): any => {
        try {
            const unit = UnitScope.current;
            if (typeof key !== 'string') {
                throw new Error('The argument [key] is invalid.');
            } else if (unit !== null) {
                if (value !== undefined) {
                    UnitScope.stack(unit, key, value);
                } else {
                    return UnitScope.trace(unit, key);
                }
            } else {
                return undefined;
            }
        } catch (error: unknown) {
            console.error('xnew.context(key, value?): ', error);
        }
    }
        
    fn.promise = (promise: Promise<any>): UnitPromise => {
        try {
            if (UnitScope.current !== null) {
                return UnitPromise.execute(UnitScope.current, promise);
            } else {
                throw new Error('No current unit.');
            }
        } catch (error: unknown) {
            console.error('xnew.promise(mix): ', error);
            throw error;
        }
    }

    fn.then = (callback: Function): UnitPromise => {
        try {
            if (UnitScope.current !== null) {
                return UnitPromise.execute(UnitScope.current).then(callback);
            } else {
                throw new Error('No current unit.');
            }
        } catch (error: unknown) {
            console.error('xnew.then(mix): ', error);
            throw error;
        }
    }

    fn.catch = (callback: Function): UnitPromise => {
        try {
            if (UnitScope.current !== null) {
                return UnitPromise.execute(UnitScope.current).catch(callback);
            } else {
                throw new Error('No current unit.');
            }
        } catch (error: unknown) {
            console.error('xnew.catch(mix): ', error);
            throw error;
        }
    }

    fn.finally = (callback: Function): UnitPromise => {
        try {
            if (UnitScope.current !== null) {
                return UnitPromise.execute(UnitScope.current).finally(callback);
            } else {
                throw new Error('No current unit.');
            }
        } catch (error: unknown) {
            console.error('xnew.finally(mix): ', error);
            throw error;
        }
    }   

    fn.fetch = (url: string, options?: object): UnitPromise => {
        try {
            const promise = fetch(url, options);
            if (UnitScope.current !== null) {
                return UnitPromise.execute(UnitScope.current, promise);
            } else {
                throw new Error('No current unit.');
            }
        } catch (error: unknown) {
            console.error('xnew.promise(mix): ', error);
            throw error;
        }
    }

    fn.scope = (callback: any): any => {
        const snapshot = UnitScope.snapshot();
        return (...args: any[]) => UnitScope.execute(snapshot, callback, ...args);
    }

    fn.find = (component: Function): Unit[] => {
        if (typeof component === 'function') {
            return Unit.find(component);
        } else {
            throw new Error(`The argument [component] is invalid.`);
        }
    }

    fn.append = (base: Function | Unit, ...args: any[]): void => {
        if (typeof base === 'function') {
            for (let unit of Unit.find(base)) {
                UnitScope.execute(UnitScope.snapshot(unit), xnew, ...args);
            }
        } else if (base instanceof Unit) {
            UnitScope.execute(UnitScope.snapshot(base), xnew, ...args);
        } else {
            throw new Error(`The argument [component] is invalid.`);
        }
    }

    fn.timeout = (callback: Function, delay: number): any => {
        const snapshot = UnitScope.snapshot();
        const unit = xnew((self: Unit) => {
            const timer = new Timer(() => {
                UnitScope.execute(snapshot, callback);
                self.finalize();
            }, null, delay);
            self.on('finalize', () => {
                timer.clear();
            });
        });
        return { clear: () => unit.finalize() };
    }

    fn.interval = (callback: Function, delay: number): any => {
        const snapshot = UnitScope.snapshot();
        const unit = xnew((self: Unit) => {
            const timer = new Timer(() => {
                UnitScope.execute(snapshot, callback);
            }, null, delay, true);
            self.on('finalize', () => {
                timer.clear();
            });
        });
        return { clear: () => unit.finalize() };
    }

    fn.transition = (callback: Function, interval: number, easing: string = 'linear'): any => {
        const snapshot = UnitScope.snapshot();

        let stacks: any = [];
        let unit = xnew(Local, { callback, interval, easing });
        let isRunning = true;

        function Local(self: Unit, { callback, interval, easing }: { callback: Function, interval: number, easing: string }) {
            const timer = new Timer(() => {
                UnitScope.execute(snapshot, callback, 1.0);
                self.finalize();
            }, (progress: number) => {
                if (progress < 1.0) {
                    if (easing === 'ease-out') {
                        progress = Math.pow((1.0 - Math.pow((1.0 - progress), 2.0)), 0.5);
                    } else if (easing === 'ease-in') {
                        progress = Math.pow((1.0 - Math.pow((1.0 - progress), 0.5)), 2.0);
                    } else if (easing === 'ease') {
                        progress = (1.0 - Math.cos(progress * Math.PI)) / 2.0;
                    } else if (easing === 'ease-in-out') {
                        progress = (1.0 - Math.cos(progress * Math.PI)) / 2.0;
                    }
                    UnitScope.execute(snapshot, callback, progress);
                }
            }, interval);
            self.on('finalize', () => {
                timer.clear();
                isRunning = false;
                execute();
            });
        }
        
        let timer: any = null;

        function execute() {
            if (isRunning === false && stacks.length > 0) {
                const props: any = stacks.shift();
                unit = xnew(Local, props);
                isRunning = true;
            }
        }

        function clear() {
            stacks = [];
            unit.finalize();
        }

        function next(callback: Function, interval: number, easing: string = 'linear'): any {
            stacks.push({ callback, interval, easing });
            execute();
            return timer;
        }
        timer = { clear, next };
        return timer;
    }

    fn.listener = function (target: UnitElement | Window | Document) {
        return {
            on(type: string, listener: Function, options?: boolean | AddEventListenerOptions) {
                Unit.subon(UnitScope.current, target, type, listener, options);
            },
            off(type?: string, listener?: Function) {
                Unit.suboff(UnitScope.current, target, type, listener);
            }
        }
    }

    fn.capture = function (checker: (unit: xnew.Unit) => boolean, execute: (unit: xnew.Unit) => void) {
        const current = UnitScope.current as xnew.Unit;
        const snapshot = UnitScope.snapshot();
        current._.captures.push({ checker, execute: (unit: xnew.Unit) => UnitScope.execute(snapshot, execute, unit) });
    }

    return fn;
})();

