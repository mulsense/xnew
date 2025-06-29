import { Timer } from './time';
import { Unit } from './unit';
import { UnitScope, UnitComponent, UnitElement, UnitPromise, UnitEvent } from './unit';

export interface xnewtype extends Function {
    [key: string]: any;
}

export namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}

export const xnew: xnewtype = function (...args: any[]): Unit | undefined {
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
        if (args[0] instanceof Element || args[0] instanceof Window || args[0] instanceof Document) {
            target = args.shift(); // an existing html element
        } else if (typeof args[0] === 'string') {
            const selector = args.shift(); // a selector for an existing html element
            target = document.querySelector(selector); 
            if (target == null) {
                throw new Error(`'${selector}' can not be found.`);
            }
        } else if (typeof args[0] !== null && typeof args[0] === 'object') {
            target = args.shift(); // an attributes for a new html element
        } else if (args[0] === null || args[0] === undefined) {
            args.shift();
            target = null;
        } else {
            target = null;
        }

        if (!(args[0] === undefined || typeof args[0] === 'function' || ((target !== null && typeof target === 'object') && typeof args[0] === 'string'))) {
            throw new Error('The argument [parent, target, component] is invalid.');
        }
        return new Unit(parent, target, ...args);
    } catch (error: unknown) {
        console.error('xnew: ', error);
    }
}

Object.defineProperty(xnew, 'nest', { enumerable: true, value: nest });
function nest(attributes: object, text?: string): UnitElement | undefined {
    try {
        return UnitElement.nest(attributes, text);
    } catch (error: unknown) {
        console.error('xnew.nest(attributes): ', error);
    }
}

Object.defineProperty(xnew, 'extend', { enumerable: true, value: extend });
function extend(component: Function, ...args: any[]) {
    try {
        const current = UnitScope.current;
        if (current?._.state === 'pending') {
            return Unit.extend(current, component, ...args);
        } else {
            throw new Error('This function can not be called after initialized.');
        }
    } catch (error: unknown) {
        console.error('xnew.extend(component, ...args): ', error);
    }
}

Object.defineProperty(xnew, 'context', { enumerable: true, value: context });
function context(key: string, value: any = undefined): any{
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
        
Object.defineProperty(xnew, 'promise', { enumerable: true, value: promise });
function promise(mix: Promise<any> | ((resolve: (value: any) => void, reject: (reason?: any) => void) => void) | Unit): UnitPromise {
    try {
        return UnitPromise.execute(UnitScope.current, mix);
    } catch (error: unknown) {
        console.error('xnew.promise(mix): ', error);
        throw error;
    }
}

Object.defineProperty(xnew, 'emit', { enumerable: true, value: emit });
function emit(type: string, ...args: any[]) {
    try {
        UnitEvent.emit(type, ...args);
    } catch (error: unknown) {
        console.error('xnew.emit(type, ...args): ', error);
    }
}
    
Object.defineProperty(xnew, 'scope', { enumerable: true, value: scope });
function scope(callback: any): any {
    const snapshot = UnitScope.snapshot();
    return (...args: any[]) => UnitScope.execute(snapshot, callback, ...args);
}

Object.defineProperty(xnew, 'find', { enumerable: true, value: find });
function find(component: Function): Unit[] | undefined {
    try {
        if (typeof component !== 'function') {
            throw new Error(`The argument [component] is invalid.`);
        } else {
            return UnitComponent.find(component);
        }
    } catch (error: unknown) {
        console.error('xnew.find(component): ', error);
    }
}

Object.defineProperty(xnew, 'timer', { enumerable: true, value: timer });
function timer(callback: Function, delay: number): { clear: () => void } {
    const snapshot = UnitScope.snapshot();
    const unit = xnew((self: Unit) => {
        const timer = new Timer(() => {
            UnitScope.execute(snapshot, callback);
            self.finalize();
        }, null, delay);
        return {
            finalize() {
                timer.clear();
            }
        };
    });
    return { clear: () => unit.finalize() };
}

Object.defineProperty(xnew, 'interval', { enumerable: true, value: interval });
function interval(callback: Function, delay: number): { clear: () => void } {
    const snapshot = UnitScope.snapshot();
    const unit = xnew((self: Unit) => {
        const timer = new Timer(() => {
            UnitScope.execute(snapshot, callback);
        }, null, delay, true);
        return {
            finalize() {
                timer.clear();
            }
        };
    });
    return { clear: () => unit.finalize() };
}

Object.defineProperty(xnew, 'transition', { enumerable: true, value: transition });
function transition(callback: Function, interval: number, easing: string = 'linear'): { clear: () => void } {
    const snapshot = UnitScope.snapshot();
    const unit = xnew((self: Unit) => {
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

        return {
            finalize() {
                timer.clear();
            }
        };
    });

    return { clear: () => unit.finalize() };
}

// Object.defineProperty(xnew, 'css', { 
//     enumerable: true, 
//     value: function (label: string, style: { [key: string]: any }): void {
//         xnew((self: xnew.Unit) => {
//             const element = document.createElement('style');

//             let text = '';
//             Object.keys(style).forEach((key) => {
//                 const value = style[key];
//                 const snake = key.replace(/([A-Z])/g, '-$1').toLowerCase();
//                 text += `${snake}: ${value};`;
//             });
//             element.textContent = `${label}{ ${text} }`;
//             document.head.appendChild(element);
//             return {
//                 finalize() {
//                     document.head.removeChild(element);
//                 }
//             }
//         });
//     }
// });