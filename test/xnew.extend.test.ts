import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

afterEach(() => {
    Unit.rootUnit?.finalize();
});

describe('xnew.extend', () => {
    describe('basic inheritance', () => {
        it('makes a base component method callable from the derived unit', () => {
            function Base(_: Unit) {
                return {
                    test1() { return 1; },
                };
            }

            function Derived(unit: Unit) {
                xnew.extend(Base);
                return {
                    test2() { return unit.test1() + 1; },
                };
            }

            const unit = xnew(Derived);
            expect(unit.test2()).toBe(2);
        });

        it('combines methods from multiple base components on the same unit', () => {
            function Base1(_: Unit) {
                return { getValue1() { return 10; } };
            }
            function Base2(_: Unit) {
                return { getValue2() { return 20; } };
            }
            function Derived(unit: Unit) {
                xnew.extend(Base1);
                xnew.extend(Base2);
                return {
                    getSum() { return unit.getValue1() + unit.getValue2(); },
                };
            }

            const unit = xnew(Derived);
            expect(unit.getValue1()).toBe(10);
            expect(unit.getValue2()).toBe(20);
            expect(unit.getSum()).toBe(30);
        });

        it('supports multi-level inheritance chains', () => {
            function Base(_: Unit) {
                return { baseMethod() { return 'base'; } };
            }
            function Middle(unit: Unit) {
                xnew.extend(Base);
                return { middleMethod() { return unit.baseMethod() + '-middle'; } };
            }
            function Derived(unit: Unit) {
                xnew.extend(Middle);
                return { derivedMethod() { return unit.middleMethod() + '-derived'; } };
            }

            const unit = xnew(Derived);
            expect(unit.baseMethod()).toBe('base');
            expect(unit.middleMethod()).toBe('base-middle');
            expect(unit.derivedMethod()).toBe('base-middle-derived');
        });
    });

    describe('method overriding', () => {
        it('the derived definition overrides a base method', () => {
            function Base(unit: Unit) {
                return {
                    getValue() { return 100; },
                    getDouble() { return unit.getValue() * 2; },
                };
            }
            function Derived(_: Unit) {
                xnew.extend(Base);
                return { getValue() { return 50; } };
            }

            const unit = xnew(Derived);
            expect(unit.getValue()).toBe(50);
            // base.getDouble uses the unit-level getValue, which has been overridden
            expect(unit.getDouble()).toBe(100);
        });

        it('the last extended base wins on name collision', () => {
            function Base1(_: Unit) {
                return { getName() { return 'Base1'; } };
            }
            function Base2(_: Unit) {
                return { getName() { return 'Base2'; } };
            }
            function Derived(_: Unit) {
                xnew.extend(Base1);
                xnew.extend(Base2);
                return {};
            }

            expect(xnew(Derived).getName()).toBe('Base2');
        });
    });

    describe('shared state via unit properties', () => {
        it('the unit instance is shared between base and derived methods', () => {
            function Base(unit: Unit) {
                unit.counter = 0;
                return {
                    increment() { unit.counter++; },
                    getCounter() { return unit.counter; },
                };
            }
            function Derived(unit: Unit) {
                xnew.extend(Base);
                return {
                    reset() { unit.counter = 0; },
                    incrementBy(value: number) { unit.counter += value; },
                };
            }

            const unit = xnew(Derived);
            unit.increment();
            unit.increment();
            expect(unit.getCounter()).toBe(2);

            unit.incrementBy(5);
            expect(unit.getCounter()).toBe(7);

            unit.reset();
            expect(unit.getCounter()).toBe(0);
        });

        it('methods from sibling bases compose through the unit', () => {
            function Base1(_: Unit) {
                return { add(a: number, b: number) { return a + b; } };
            }
            function Base2(_: Unit) {
                return { multiply(a: number, b: number) { return a * b; } };
            }
            function Derived(unit: Unit) {
                xnew.extend(Base1);
                xnew.extend(Base2);
                return {
                    calculate(a: number, b: number, c: number) {
                        return unit.multiply(unit.add(a, b), c);
                    },
                };
            }

            expect(xnew(Derived).calculate(2, 3, 4)).toBe(20);
        });
    });

    describe('initialization', () => {
        it('initializes the base component at the xnew.extend call site', () => {
            const log: string[] = [];

            function Base(_: Unit) {
                log.push('base-init');
                return { baseMethod() { log.push('base-method'); } };
            }
            function Derived(unit: Unit) {
                log.push('derived-init-start');
                xnew.extend(Base);
                log.push('derived-init-end');
                return {
                    derivedMethod() {
                        log.push('derived-method');
                        unit.baseMethod();
                    },
                };
            }

            const unit = xnew(Derived);
            unit.derivedMethod();

            expect(log).toEqual([
                'derived-init-start',
                'base-init',
                'derived-init-end',
                'derived-method',
                'base-method',
            ]);
        });

        it('passes props through to the extended component', () => {
            function ConfigurableBase(_: Unit, options: { prefix: string }) {
                return {
                    format(text: string) { return `${options.prefix}: ${text}`; },
                };
            }
            function Derived(unit: Unit) {
                xnew.extend(ConfigurableBase, { prefix: 'LOG' });
                return { logMessage(message: string) { return unit.format(message); } };
            }

            expect(xnew(Derived).logMessage('test')).toBe('LOG: test');
        });
    });

    describe('composition example', () => {
        it('Logger + Counter mixins coordinate via the shared unit', () => {
            function Logger(unit: Unit) {
                unit.logs = [];
                return {
                    log(message: string) { unit.logs.push(message); },
                    getLogs() { return unit.logs; },
                };
            }
            function Counter(unit: Unit) {
                unit.count = 0;
                return {
                    increment() { unit.count++; },
                    getCount() { return unit.count; },
                };
            }
            function Component(unit: Unit) {
                xnew.extend(Logger);
                xnew.extend(Counter);
                return {
                    performAction() {
                        unit.increment();
                        unit.log(`Action performed, count: ${unit.getCount()}`);
                    },
                };
            }

            const unit = xnew(Component);
            unit.performAction();
            unit.performAction();
            unit.performAction();

            expect(unit.getCount()).toBe(3);
            expect(unit.getLogs()).toEqual([
                'Action performed, count: 1',
                'Action performed, count: 2',
                'Action performed, count: 3',
            ]);
        });
    });
});
