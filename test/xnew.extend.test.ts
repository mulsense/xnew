import { Unit } from '../src/core/unit';
import { xnew } from '../src/core/xnew';

beforeEach(() => {
    Unit.reset();
});

describe('unit extend', () => {

    it('basic', () => {
        const unit = xnew(Derived);

        function Base(self: xnew.Unit) {
            return {
                test1() {
                    return 1;
                },
            }
        }

        function Derived(self: xnew.Unit) {
            xnew.extend(Base);
            return {
                test2() {
                    return self.test1() + 1;
                }
            }
        }
        expect(unit.test2()).toBe(2);
    });

    it('multiple extends', () => {
        function Base1(self: xnew.Unit) {
            return {
                getValue1() {
                    return 10;
                }
            }
        }

        function Base2(self: xnew.Unit) {
            return {
                getValue2() {
                    return 20;
                }
            }
        }

        function Derived(self: xnew.Unit) {
            xnew.extend(Base1);
            xnew.extend(Base2);
            return {
                getSum() {
                    return self.getValue1() + self.getValue2();
                }
            }
        }

        const unit = xnew(Derived);
        expect(unit.getValue1()).toBe(10);
        expect(unit.getValue2()).toBe(20);
        expect(unit.getSum()).toBe(30);
    });

    it('multi-level inheritance', () => {
        function Base(self: xnew.Unit) {
            return {
                baseMethod() {
                    return 'base';
                }
            }
        }

        function Middle(self: xnew.Unit) {
            xnew.extend(Base);
            return {
                middleMethod() {
                    return self.baseMethod() + '-middle';
                }
            }
        }

        function Derived(self: xnew.Unit) {
            xnew.extend(Middle);
            return {
                derivedMethod() {
                    return self.middleMethod() + '-derived';
                }
            }
        }

        const unit = xnew(Derived);
        expect(unit.baseMethod()).toBe('base');
        expect(unit.middleMethod()).toBe('base-middle');
        expect(unit.derivedMethod()).toBe('base-middle-derived');
    });

    it('method override', () => {
        function Base(self: xnew.Unit) {
            return {
                getValue() {
                    return 100;
                },
                getDouble() {
                    return self.getValue() * 2;
                }
            }
        }

        function Derived(self: xnew.Unit) {
            xnew.extend(Base);
            return {
                getValue() {
                    return 50;
                }
            }
        }

        const unit = xnew(Derived);
        expect(unit.getValue()).toBe(50);
        expect(unit.getDouble()).toBe(100); // getDoubleはDerivedのgetValueを使用
    });

    it('property inheritance', () => {
        function Base(self: xnew.Unit) {
            self.counter = 0;
            return {
                increment() {
                    self.counter++;
                },
                getCounter() {
                    return self.counter;
                }
            }
        }

        function Derived(self: xnew.Unit) {
            xnew.extend(Base);
            return {
                reset() {
                    self.counter = 0;
                },
                incrementBy(value: number) {
                    self.counter += value;
                }
            }
        }

        const unit = xnew(Derived);
        expect(unit.getCounter()).toBe(0);
        unit.increment();
        unit.increment();
        expect(unit.getCounter()).toBe(2);
        unit.incrementBy(5);
        expect(unit.getCounter()).toBe(7);
        unit.reset();
        expect(unit.getCounter()).toBe(0);
    });

    it('access to extended methods from same level', () => {
        function Base1(self: xnew.Unit) {
            return {
                add(a: number, b: number) {
                    return a + b;
                }
            }
        }

        function Base2(self: xnew.Unit) {
            return {
                multiply(a: number, b: number) {
                    return a * b;
                }
            }
        }

        function Derived(self: xnew.Unit) {
            xnew.extend(Base1);
            xnew.extend(Base2);
            return {
                calculate(a: number, b: number, c: number) {
                    return self.multiply(self.add(a, b), c);
                }
            }
        }

        const unit = xnew(Derived);
        expect(unit.calculate(2, 3, 4)).toBe(20); // (2+3)*4
    });

    it('initialization order', () => {
        const log: string[] = [];

        function Base(self: xnew.Unit) {
            log.push('base-init');
            return {
                baseMethod() {
                    log.push('base-method');
                }
            }
        }

        function Derived(self: xnew.Unit) {
            log.push('derived-init-start');
            xnew.extend(Base);
            log.push('derived-init-end');
            return {
                derivedMethod() {
                    log.push('derived-method');
                    self.baseMethod();
                }
            }
        }

        const unit = xnew(Derived);
        unit.derivedMethod();

        expect(log).toEqual([
            'derived-init-start',
            'base-init',
            'derived-init-end',
            'derived-method',
            'base-method'
        ]);
    });

    it('complex inheritance chain', () => {
        function Logger(self: xnew.Unit) {
            self.logs = [];
            return {
                log(message: string) {
                    self.logs.push(message);
                },
                getLogs() {
                    return self.logs;
                }
            }
        }

        function Counter(self: xnew.Unit) {
            self.count = 0;
            return {
                increment() {
                    self.count++;
                },
                getCount() {
                    return self.count;
                }
            }
        }

        function Component(self: xnew.Unit) {
            xnew.extend(Logger);
            xnew.extend(Counter);
            return {
                performAction() {
                    self.increment();
                    self.log(`Action performed, count: ${self.getCount()}`);
                }
            }
        }

        const unit = xnew(Component);
        unit.performAction();
        unit.performAction();
        unit.performAction();

        expect(unit.getCount()).toBe(3);
        expect(unit.getLogs()).toEqual([
            'Action performed, count: 1',
            'Action performed, count: 2',
            'Action performed, count: 3'
        ]);
    });

    it('extend with same method names from different bases', () => {
        function Base1(self: xnew.Unit) {
            return {
                getName() {
                    return 'Base1';
                }
            }
        }

        function Base2(self: xnew.Unit) {
            return {
                getName() {
                    return 'Base2';
                }
            }
        }

        function Derived(self: xnew.Unit) {
            xnew.extend(Base1);
            xnew.extend(Base2); // Base2のgetNameがBase1を上書き
            return {}
        }

        const unit = xnew(Derived);
        expect(unit.getName()).toBe('Base2');
    });

    it('extend with parameters passed to base', () => {
        function ConfigurableBase(self: xnew.Unit, options: { prefix: string }) {
            return {
                format(text: string) {
                    return `${options.prefix}: ${text}`;
                }
            }
        }

        function Derived(self: xnew.Unit) {
            xnew.extend(ConfigurableBase, { prefix: 'LOG' });
            return {
                logMessage(message: string) {
                    return self.format(message);
                }
            }
        }

        const unit = xnew(Derived);
        expect(unit.logMessage('test')).toBe('LOG: test');
    });

});