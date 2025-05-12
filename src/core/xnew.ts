import { MapSet } from './map';
import { Timer } from './timer';
import { Unit } from './unit';
import { UnitScope, UnitComponent, UnitElement, UnitPromise, UnitEvent } from './unitex';

//----------------------------------------------------------------------------------------------------
// xnew main
//----------------------------------------------------------------------------------------------------

export const xnew: any = Object.assign(function(...args: any[]): Unit | undefined {
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
            console.error(`xnew: '${key}' can not be found.`);
        }
    } else if (typeof args[0] !== null && typeof args[0] === 'object') {
        // an attributes for a new html element
        target = args.shift();
    } else if (args[0] === null || args[0] === undefined) {
        args.shift();
    }
    // if (!(parent === null || parent instanceof Unit)) {
    //     throw new Error(`The argument [parent] is invalid.`);
    // }
    // if (!(target === null || (target !== null && typeof target === 'object') || target instanceof Element || target instanceof Window || target instanceof Document)) {
    //     throw new Error(`The argument [target] is invalid.`);
    // }
    // if (!(component === undefined || typeof component === 'function' || ((target !== null && typeof target === 'object') && typeof component === 'string'))) {
    //     throw new Error(`The argument [component] is invalid.`);
    // }
    try {
        return new Unit(parent, target, ...args);
    } catch (error) {
        if (error instanceof Error) {
            console.error('xnew: ', error.message);
        }
    }
}, {
    get root() {
        return UnitScope.current?._.root
    },
    get parent() {
        return UnitScope.current?._.root;
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
                promise = promises.size > 0 ? Promise.all([...promises]) : Promise.resolve();
            } else {
                throw new Error(`The argument [mix] is invalid.`);
            }
            return UnitPromise.execute(promise);
        } catch (error) {
            if (error instanceof Error) {
                console.error('xnew.promise(mix): ', error.message);
            }
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
            if (error instanceof Error) {
                console.error('xnew.emit(type, ...args): ', error.message);
            }
        }
    },
    
    scope(callback: any): any {
        const snapshot = UnitScope.snapshot();
        return (...args: any[]) => UnitScope.execute(snapshot, callback, ...args);
    },
    
});

export namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}

//----------------------------------------------------------------------------------------------------
// members
//----------------------------------------------------------------------------------------------------


// Object.defineProperty(xnew, 'event', { get: () => UnitEvent.event });
// Object.defineProperty(xnew, 'scope', { value: scope });

// Object.defineProperty(xnew, 'timer', { value: timer });
// Object.defineProperty(xnew, 'interval', { value: interval });
// Object.defineProperty(xnew, 'transition', { value: transition });


// function find(component) {
//     if (isFunction(component) === false) {
//         console.error(`xnew.find: The argument [component] is invalid.`);
//     } else if (isFunction(component) === true) {
//         return UnitComponent.find(component);
//     }
// }


// function timer(callback, delay) {
//     const snapshot = UnitScope.snapshot();
//     const unit = xnew((self) => {
//         const timer = new Timer(() => {
//             UnitScope.execute(snapshot, callback);
//             self.finalize();
//         }, delay);
//         return {
//             finalize() {
//                 timer.clear();
//             }
//         };
//     });
//     return { clear: () => unit.finalize() };
// }

// function interval(callback, delay) {
//     const snapshot = UnitScope.snapshot();
//     const unit = xnew((self) => {
//         const timer = new Timer(() => {
//             UnitScope.execute(snapshot, callback);
//         }, delay, true);
//         return {
//             finalize() {
//                 timer.clear();
//             }
//         };
//     });
//     return { clear: () => unit.finalize() };
// }

// function transition(callback, interval) {
//     const snapshot = UnitScope.snapshot();
//     const unit = xnew((self) => {
//         const timer = new Timer(() => {
//             UnitScope.execute(snapshot, callback, 1.0);
//             self.finalize();
//         }, interval);

//         UnitScope.execute(snapshot, callback, 0.0);

//         const updater = xnew(null, (self) => {
//             return {
//                 update() {
//                     const progress = timer.elapsed() / interval;
//                     if (progress < 1.0) {
//                         UnitScope.execute(snapshot, callback, progress);
//                     }
//                 },
//             }
//         });
//         return {
//             finalize() {
//                 timer.clear();
//                 updater.finalize();
//             }
//         };
//     });

//     return { clear: () => unit.finalize() };
// }
