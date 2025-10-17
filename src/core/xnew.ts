import { Timer } from './time';
import { Unit, UnitScope, UnitComponent, UnitPromise, UnitEvent, UnitSubEvent } from './unit';

export namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}

export interface xnewtype {
    (...args: any[]): Unit;
    nest(html: string, innerHTML?: string): HTMLElement | SVGElement;
    [key: string]: any;
}

export const xnew: xnewtype = (() => {
    const fn = function (...args: any[]): Unit {
        try {
            let parent;
            if (args[0] instanceof Unit) {
                parent = args.shift();
            } else if (args[0] === null) {
                parent = args.shift();
            } else if (args[0] === undefined) {
                args.shift();
                parent = UnitScope.current
            } else {
                parent = UnitScope.current
            }

            let target;
            if (args[0] instanceof HTMLElement || args[0] instanceof SVGElement) {
                target = args.shift(); // an existing html element
            } else if (typeof args[0] === 'string') {
                const str = args.shift(); // a selector for an existing html element
                const match = str.match(/<([^>]*)\/?>/);
                if (match) {
                    target = str;
                } else {
                    target = document.querySelector(str); 
                    if (target == null) {
                        throw new Error(`'${str}' can not be found.`);
                    }
                }
            } else if (typeof args[0] !== null && typeof args[0] === 'object') {
                target = args.shift(); // an attributes for a new html element
            } else if (args[0] === null || args[0] === undefined) {
                args.shift();
                target = null;
            } else {
                target = null;
            }

            if (!(args[0] === undefined || typeof args[0] === 'function' || ((target !== null && (typeof target === 'object' || typeof target === 'string')) && typeof args[0] === 'string'))) {
                throw new Error('The argument [parent, target, component] is invalid.');
            }
            const unit = new Unit(parent, target, ...args);
            if (unit === undefined) {
                throw '';
            }
            return unit;
        } catch (error: unknown) {
            console.error('xnew: ', error);
            throw '';
        }
    }
  

    fn.nest = (html: string, innerHTML?: string): HTMLElement | SVGElement => {
        try {
            const current = UnitScope.current;
            if (current?._.state === 'invoked') {
                const element = Unit.nest(current, html, innerHTML);
                if (element instanceof HTMLElement || element instanceof SVGElement) {
                    return element;
                } else {
                    throw new Error('');
                }
            } else {
                throw new Error('This function can not be called after initialized.');
            }
        } catch (error: unknown) {
            console.error('xnew.nest(attributes): ', error);
            throw new Error('');
        }
    }

    fn.extend = (component: Function, props?: Object): any => {
        try {
            const current = UnitScope.current;
            if (current?._.state === 'invoked') {
                return Unit.extend(current, component, props);
            } else {
                throw new Error('This function can not be called after initialized.');
            }
        } catch (error: unknown) {
            console.error('xnew.extend(component, props): ', error);
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
        
    fn.promise = (mix: Promise<any> | ((resolve: (value: any) => void, reject: (reason?: any) => void) => void) | Unit): UnitPromise => {
        try {
            return UnitPromise.execute(UnitScope.current, mix);
        } catch (error: unknown) {
            console.error('xnew.promise(mix): ', error);
            throw error;
        }
    }

    fn.fetch = (url: string, options?: object): UnitPromise => {
        try {
            const promise = fetch(url, options);
            return UnitPromise.execute(UnitScope.current, promise);
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
        try {
            if (typeof component !== 'function') {
                throw new Error(`The argument [component] is invalid.`);
            } else {
                let units = UnitComponent.find(component);
                return units;
            }
        } catch (error: unknown) {
            console.error('xnew.find(component): ', error);
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

    fn.emit = (type: string, ...args: any[]) => {
        try {
            UnitEvent.emit(type, ...args);
        } catch (error: unknown) {
            console.error('xnew.emit(type, ...args): ', error);
        }
    }

    fn.listener = function (target: HTMLElement | SVGElement | Window | Document) {
        return {
            on(type: string, listener: Function, options?: boolean | AddEventListenerOptions) {
                UnitSubEvent.on(UnitScope.current, target, type, listener, options);
            },
            off(type?: string, listener?: Function) {
                UnitSubEvent.off(UnitScope.current, target, type, listener);
            }  
        }
    }

    return fn;
})();

