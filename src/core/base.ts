import { Timer } from './timer';
import { Unit } from './unit';
import { UnitScope, UnitComponent, UnitElement, UnitPromise, UnitEvent } from './unitex';

export interface xnewtype extends Function {
    [key: string]: any;
    readonly root: HTMLElement | null;
}

export namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}

export const xnew: xnewtype = Object.assign(function(...args: any[]): Unit | undefined {
    try {
        let parent = UnitScope.current;
        if (typeof args[0] !== 'function' && args[0] instanceof Unit) {
            parent = args.shift();
        } else if (args[0] === null) {
            parent = args.shift();
        } else if (args[0] === undefined) {
            args.shift();
        }

        let target = null;
        if (args[0] instanceof Element || args[0] instanceof Window || args[0] instanceof Document) {
            // an existing html element
            target = args.shift();
        } else if (typeof args[0] === 'string') {
            // a string for an existing html element
            const key = args.shift();
            target = document.querySelector(key);
            if (target == null) {
                throw new Error(`'${key}' can not be found.`);
            }
        } else if (typeof args[0] !== null && typeof args[0] === 'object') {
            // an attributes for a new html element
            target = args.shift();
        } else if (args[0] === null || args[0] === undefined) {
            args.shift();
        }

        if (!(args[0] === undefined || typeof args[0] === 'function' || ((target !== null && typeof target === 'object') && typeof args[0] === 'string'))) {
            throw new Error('The argument [parent, target, component] is invalid.');
        }
        return new Unit(parent, target, ...args);
    } catch (error) {
        console.error('xnew: ', error);
    }
}, {
    get root() {
        return UnitScope.current?._.root
    },
    get parent() {
        return UnitScope.current?._.parent;
    },
    get current() {
        return UnitScope.current;
    },

    nest(attributes: object) {
        try {
            const current = UnitScope.current;
            if (current?._.state === 'pending') {
                return UnitElement.nest(current, attributes);
            } else {
                throw new Error(`This function can not be called after initialized.`);
            }
        } catch (error) {
            if (error instanceof Error) {
                console.error('xnew.nest(attributes): ', error.message);
            }
        }
    },
    extend(component: Function, ...args: any[]) {
        try {
            const current = UnitScope.current;
            if (current?._.state === 'pending') {
                return Unit.extend(current, component, ...args);
            } else {
                throw new Error('This function can not be called after initialized.');
            }
        } catch (error) {
            if (error instanceof Error) {
                console.error('xnew.extend(component, ...args): ', error.message);
            }
        }
    },
    context(key: string, value: any = undefined): any {
        try {
            const unit = UnitScope.current;
            if (typeof key !== 'string') {
                throw new Error('The argument [key] is invalid.');
            } else if (unit !== null) {
                if (value !== undefined) {
                    UnitScope.push(unit, key, value);
                } else {
                    return UnitScope.trace(unit, key);
                }
            } else {
                return undefined;
            }
        } catch (error) {
            if (error instanceof Error) {
                console.error('xnew.context(key, value?): ', error.message);
            }
        }
    },
    promise(mix: any) {
        try {
            let promise: Promise<any> | null = null;
            if (mix instanceof Promise) {
                promise = mix;
            } else if (typeof mix === 'function') {
                promise = new Promise(mix);
            } else if (mix instanceof Unit) {
                const promises: any = UnitPromise.unitToPromises.get(mix);
                promise = promises?.size > 0 ? Promise.all([...promises]) : Promise.resolve();
            } else {
                throw new Error(`The argument [mix] is invalid.`);
            }
            return UnitPromise.execute(promise);
        } catch (error) {
            console.error('xnew.promise(mix): ', error);
        }
    },

    emit(type: string, ...args: any[]) {
        try {
            const unit = UnitScope.current;
            if (typeof type !== 'string') {
                throw new Error('The argument [type] is invalid.');
            } else if (unit?._.state === 'finalized') {
                throw new Error('This function can not be called after finalized.');
            } else {
                UnitEvent.emit(unit, type, ...args);
            }
        } catch (error) {
            console.error('xnew.emit(type, ...args): ', error);
        }
    },
    
    scope(callback: any): any {
        const snapshot = UnitScope.snapshot();
        return (...args: any[]) => UnitScope.execute(snapshot, callback, ...args);
    },

    find(component: Function): Unit[] | undefined {
        try {
            if (typeof component !== 'function') {
                throw new Error(`The argument [component] is invalid.`);
            } else {
                return UnitComponent.find(component);
            }
        } catch (error) {
            console.error('xnew.find(component): ', error);
        }
    },


    timer(callback: Function, delay: number): { clear: () => void } {
        const snapshot = UnitScope.snapshot();
        const unit = xnew((self: Unit) => {
            const timer = new Timer(() => {
                UnitScope.execute(snapshot, callback);
                self.finalize();
            }, delay);
            return {
                finalize() {
                    timer.clear();
                }
            };
        });
        return { clear: () => unit.finalize() };
    },

    interval(callback: Function, delay: number): { clear: () => void } {
        const snapshot = UnitScope.snapshot();
        const unit = xnew((self: Unit) => {
            const timer = new Timer(() => {
                UnitScope.execute(snapshot, callback);
            }, delay, true);
            return {
                finalize() {
                    timer.clear();
                }
            };
        });
        return { clear: () => unit.finalize() };
    },

    transition(callback: Function, interval: number): { clear: () => void } {
        const snapshot = UnitScope.snapshot();
        const unit = xnew((self: Unit) => {
            const timer = new Timer(() => {
                UnitScope.execute(snapshot, callback, 1.0);
                self.finalize();
            }, interval);

            UnitScope.execute(snapshot, callback, 0.0);

            const updater = xnew(null, (self: Unit) => {
                return {
                    update() {
                        const progress = timer.elapsed() / interval;
                        if (progress < 1.0) {
                            UnitScope.execute(snapshot, callback, progress);
                        }
                    },
                }
            });
            return {
                finalize() {
                    timer.clear();
                    updater.finalize();
                }
            };
        });

        return { clear: () => unit.finalize() };
    }

});