import { UnitComponent, UnitElement, UnitEvent, UnitScope, UnitPromise } from './unitex';

export class Unit {
    public _: { [key: string]: any } = {};

    static autoincrement: number = 0; // auto increment id
 
    constructor(parent: Unit | null, target: Element | Window | Document | null, component?: Function | string, ...args: any[]) {
        try {
            const id = Unit.autoincrement++;
            const root = parent?._.root ?? this;

            let baseElement: Element | Window | Document | null = null;

            if (target instanceof Element || target instanceof Window || target instanceof Document) {
                baseElement = target;
            } else if (parent !== null) {
                baseElement = parent.element;
            } else if (document instanceof Document) {
                baseElement = document.currentScript?.parentElement ?? document.body;
            }

            const baseContext = UnitScope.get(parent);

            this._ = Object.assign(this._, {
                id,             // unit id
                root,           // root unit
                parent,         // parent unit
                target,         // target info
                component,      // component function
                args,           // component arguments
                baseElement,    // base element
                baseContext,    // base context
            });

            (parent?._.children ?? Unit.roots).add(this);
            Unit.initialize(this, component, ...args);

        } catch (error) {
            if (error instanceof Error) {
                console.error('unit constructor: ', error.message);
            }
        }
    }

    //----------------------------------------------------------------------------------------------------
    // base system 
    //----------------------------------------------------------------------------------------------------

    get element(): Element | null {
        return UnitElement.get(this);
    }

    start(): void {
        this._.tostart = true;
    }

    stop(): void {
        this._.tostart = false;
        Unit.stop(this);
    }

    finalize(): void {
        Unit.stop(this);
        Unit.finalize(this);
        (this._.parent?._.children ?? Unit.roots).delete(this);
    }

    reboot(): void {
        Unit.stop(this);
        Unit.finalize(this);
        Unit.initialize(this, this._.component, ...this._.args);
    }

    on(type: string, listener: EventListener, options?: boolean | AddEventListenerOptions): void {
        try {
            UnitEvent.on(this, type, listener, options);
        } catch (error) {
            if (error instanceof Error) {
                console.error('unit.on(type, listener, option?): ', error.message);
            }
        }
    }

    off(type?: string, listener?: EventListener): void {
        try {
            UnitEvent.off(this, type, listener);
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('unit.off(type, listener): ', error.message);
            }
        }
    }

    
    static roots = new Set<Unit>();   // root units

    static initialize(unit: Unit, component?: Function | string, ...args: any[]): void {
        unit._ = Object.assign(unit._, {
            children: new Set<Unit>(),       // children units
            state: 'pending',                // [pending -> running <-> stopped -> finalized]
            tostart: false,                  // flag for start
            upcount: 0,                      // update count    
            resolved: false,                 // promise check
            props: {},                       // properties in the component function
        });

        UnitElement.initialize(unit, unit._.baseElement);
        UnitScope.set(unit, unit._.baseContext);

        if (unit._.parent !== null && ['finalized'].includes(unit._.parent._.state ?? '')) {
            unit._.state = 'finalized';
        } else {
            unit._.tostart = true;

            // nest html element
            if ((unit._.target !== null && typeof unit._.target === 'object') && unit.element instanceof Element) {
                UnitElement.nest(unit, unit._.target);
            }

            // setup component
            if (typeof component === 'function') {
                UnitScope.execute({ unit }, () => Unit.extend(unit, component, ...args));
            } else if ((unit._.target !== null && typeof unit._.target === 'object') && typeof component === 'string') {
                unit.element!.innerHTML = component;
            }
            unit._.resolved = true;
            // whether the unit promise was resolved
            // UnitPromise.execute(unit).then(() => { unit._.resolved = true; });
        }
    }

    static extend(unit: Unit, component: Function | any, ...args: any[]): void {
        if (typeof component !== 'function') {
            throw new Error(`The argument [component] is invalid.`);
        } 
        UnitComponent.add(unit, component);

        const props = component(unit, ...args) ?? {};

        Object.keys(props).forEach((key) => {
            const descripter = Object.getOwnPropertyDescriptor(props, key);
            if (['start', 'update', 'stop', 'finalize'].includes(key)) {
                if (typeof descripter?.value === 'function') {
                    const previous = unit._.props[key];
                    if (previous !== undefined) {
                        unit._.props[key] = (...args: any[]) => { previous(...args); descripter.value(...args); };
                    } else {
                        unit._.props[key] = (...args: any[]) => { descripter.value(...args); };
                    }
                } else {
                    console.error(`unit.extend: The property [${key}] is invalid.`);
                }
            } else if (unit[key as keyof Unit] === undefined) {
                const dest: PropertyDescriptor = { configurable: true, enumerable: true };
                const snapshot = UnitScope.snapshot(unit);
                if (typeof descripter?.get === 'function') {
                    dest.get = (...args: any[]) => UnitScope.execute(snapshot, descripter.get!, ...args);
                } else if (typeof descripter?.set === 'function') {
                    dest.set = (...args: any[]) => UnitScope.execute(snapshot, descripter.set!, ...args);
                } else if (typeof descripter?.value === 'function') {
                    dest.value = (...args: any[]) => UnitScope.execute(snapshot, descripter.value!, ...args);
                } else if (descripter?.value !== undefined) {
                    dest.writable = true;
                    dest.value = descripter.value;
                }
                Object.defineProperty(unit._.props, key, dest);
                Object.defineProperty(unit, key, dest);
            } else {
                console.error(`unit.extend: The property [${key}] already exists.`);
            }
        });
    }

    static start(unit: Unit, time: number): void {
        if (unit._.resolved === false || unit._.tostart === false) {
        } else if (['pending', 'stopped'].includes(unit._.state) === true) {
            unit._.state = 'running';
            unit._.children.forEach((unit: Unit) => Unit.start(unit, time));
            if (typeof unit._.props.start === 'function') {
                UnitScope.execute(UnitScope.snapshot(unit), unit._.props.start);
            }
        } else if (['running'].includes(unit._.state) === true) {
            unit._.children.forEach((unit: Unit) => Unit.start(unit, time));
        }
    }

    static stop(unit: Unit): void {
        if (['running'].includes(unit._.state) === true) {
            unit._.state = 'stopped';
            unit._.children.forEach((unit: Unit) => Unit.stop(unit));

            if (typeof unit._.props.stop === 'function') {
                UnitScope.execute(UnitScope.snapshot(unit), unit._.props.stop);
            }
        }
    }

    static update(unit: Unit, time: number): void {
        if (['running'].includes(unit._.state) === true) {
            unit._.children.forEach((unit: Unit) => Unit.update(unit, time));

            if (['running'].includes(unit._.state) && typeof unit._.props.update === 'function') {
                UnitScope.execute(UnitScope.snapshot(unit), unit._.props.update, unit._.upcount++);
            }
        }
    }

    static finalize(unit: Unit): void {
        if (['finalized'].includes(unit._.state) === false) {
            unit._.state = 'finalized';

            [...unit._.children].forEach((unit: Unit) => unit.finalize());
            unit._.children.clear();

            if (typeof unit._.props.finalize === 'function') {
                UnitScope.execute(UnitScope.snapshot(unit), unit._.props.finalize);
            }

            unit.off();
            UnitElement.clear(unit);
            UnitComponent.clear(unit);

            // reset props
            Object.keys(unit._.props).forEach((key) => {
                if (['start', 'update', 'stop', 'finalize'].includes(key) === false) {
                    delete unit[key as keyof Unit];
                }
            });
            unit._.props = {};

            UnitScope.clear(unit)
        }
    }

    static animation: number | null = null;
    static ticker: (() => void) | null = null;
    static previous: number = 0.0;

    static reset(): void {
        Unit.roots.forEach((unit) => unit.finalize());
        Unit.roots.clear();
       
        if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
            if (Unit.animation !== null) {
                cancelAnimationFrame(Unit.animation);
                Unit.animation = null;
            }
            console.log('test');
            Unit.previous = Date.now();

            Unit.ticker = function () {
                const interval = 1000 / 60;
                const time = Date.now();
                if (time - Unit.previous > interval * 0.8) {
                    Unit.roots.forEach((unit) => {
                        Unit.start(unit, time);
                        Unit.update(unit, time);
                    });
                    Unit.previous = time;
                }
                Unit.animation = requestAnimationFrame(Unit.ticker!);
            }

            Unit.animation = requestAnimationFrame(Unit.ticker);
        }
    }

}

Unit.reset();
