import { Timer } from './time';
import { Unit, UnitPromise, UnitElement } from './unit';

export namespace xnew {
    export type Unit = InstanceType<typeof Unit>;
}

export const xnew: any = function(...args: any[]): Unit {
    if (Unit.root === undefined) {
        Unit.reset();
    }
    
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
    return new Unit(Unit.current, target, ...args);
}

xnew.nest = (tag: string): UnitElement => {
    if (Unit.current?._.state === 'invoked') {
        return Unit.nest(Unit.current, tag);
    } else {
        throw new Error('xnew.nest: This function can not be called after initialized.');
    }
}

xnew.extend = (component: Function, props?: Object): any => {
    if (Unit.current?._.state === 'invoked') {
        return Unit.extend(Unit.current, component, props);
    } else {
        throw new Error('xnew.extend: This function can not be called after initialized.');
    }
}

xnew.context = (key: string, value: any = undefined): any => {
    try {
        return Unit.context(Unit.current, key, value);
    } catch (error: unknown) {
        console.error('xnew.context(key: string, value?: any): ', error);
        throw error;
    }
}
    
xnew.promise = (promise: Promise<any>): UnitPromise => {
    try {
        Unit.current._.promises.push(promise);
        return new UnitPromise(promise);
    } catch (error: unknown) {
        console.error('xnew.promise(promise: Promise<any>): ', error);
        throw error;
    }
}

xnew.then = (callback: Function): UnitPromise => {
    try {
        return new UnitPromise(Promise.all(Unit.current._.promises)).then(callback);
    } catch (error: unknown) {
        console.error('xnew.then(callback: Function): ', error);
        throw error;
    }
}

xnew.catch = (callback: Function): UnitPromise => {
    try {
        return new UnitPromise(Promise.all(Unit.current._.promises)).catch(callback);
    } catch (error: unknown) {
        console.error('xnew.catch(callback: Function): ', error);
        throw error;
    }
}

xnew.finally = (callback: Function): UnitPromise => {
    try {
        return new UnitPromise(Promise.all(Unit.current._.promises)).finally(callback);
    } catch (error: unknown) {
        console.error('xnew.finally(callback: Function): ', error);
        throw error;
    }
}   

xnew.fetch = (url: string, options?: object): UnitPromise => {
    try {
        const promise = fetch(url, options);
        Unit.current._.promises.push(promise);
        return new UnitPromise(promise);
    } catch (error: unknown) {
        console.error('xnew.promise(url: string, options?: object): ', error);
        throw error;
    }
}

xnew.scope = (callback: any): any => {
    const snapshot = Unit.snapshot(Unit.current);
    return (...args: any[]) => Unit.scope(snapshot, callback, ...args);
}

xnew.find = (component: Function): Unit[] => {
    if (typeof component === 'function') {
        return Unit.find(component);
    } else {
        throw new Error('xnew.find(component: Function): [component] is invalid.');
    }
}

xnew.append = (anchor: Function | Unit, ...args: any[]): void => {
    if (typeof anchor === 'function') {
        for (let unit of Unit.find(anchor)) {
            Unit.scope(Unit.snapshot(unit), xnew, ...args);
        }
    } else if (anchor instanceof Unit) {
        Unit.scope(Unit.snapshot(anchor), xnew, ...args);
    } else {
        throw new Error('xnew.append(anchor: Function | Unit, xnew arguments): [anchor] is invalid.');
    }
}

xnew.timeout = (callback: Function, delay: number): any => {
    const snapshot = Unit.snapshot(Unit.current);
    const unit = xnew((self: Unit) => {
        const timer = new Timer(() => {
            Unit.scope(snapshot, callback);
            self.finalize();
        }, null, delay, false);
        self.on('finalize', () => timer.clear());
    });
    return { clear: () => unit.finalize() };
}

xnew.interval = (callback: Function, delay: number): any => {
    const snapshot = Unit.snapshot(Unit.current);
    const unit = xnew((self: Unit) => {
        const timer = new Timer(() => {
            Unit.scope(snapshot, callback);
        }, null, delay, true);
        self.on('finalize', () => timer.clear());
    });
    return { clear: () => unit.finalize() };
}

xnew.transition = (callback: Function, interval: number, easing: string = 'linear'): any => {
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

    function next(callback: Function, interval: number, easing: string = 'linear'): any {
        stacks.push({ callback, interval, easing });
        execute();
        return timer;
    }

    function Local(self: Unit, { callback, interval, easing }: { callback: Function, interval: number, easing: string }) {
        const timer = new Timer(() => {
            Unit.scope(snapshot, callback, 1.0);
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
                Unit.scope(snapshot, callback, progress);
            }
        }, interval);
        self.on('finalize', () => {
            timer.clear();
            isRunning = false;
            execute();
        });
    }
}

xnew.listener = function (target: UnitElement | Window | Document) {
    return {
        on(type: string, listener: Function, options?: boolean | AddEventListenerOptions) {
            Unit.subon(Unit.current, target, type, listener, options);
        },
        off(type?: string, listener?: Function) {
            Unit.suboff(Unit.current, target, type, listener);
        }
    }
}

xnew.capture = function (checker: (unit: xnew.Unit) => boolean, execute: (unit: xnew.Unit) => void) {
    Unit.current._.captures.push({ checker, execute: Unit.wrap(Unit.current, (unit: xnew.Unit) => execute(unit)) });
}
