import { xnew } from '../core/xnew';

export function Modal(self: xnew.Unit, { duration = 200, easing = 'ease' } = {}) {
    const fixed = xnew.nest('<div style="position: fixed; inset: 0; opacity: 0;">') as HTMLElement;

    xnew().on('click', (event: Event) => {
        if (self.element === event.target) {
            self.close();
        }
    });
    xnew.timeout(() => self.open());
    return {
        open() {
            xnew.transition((x: number) => fixed.style.opacity = x.toString(), duration, easing);
        },
        close() {
            xnew.transition((x: number) => fixed.style.opacity = (1.0 - x).toString(), duration, easing).next(() => self.finalize());
        }
    }
}

export function Accordion(self: xnew.Unit, { open = false, duration = 200, easing = 'ease' } = {}) {
    const outer = xnew.nest('<div style="overflow: hidden">') as HTMLElement;
    const inner = xnew.nest('<div style="padding: 0; display: flex; flex-direction: column; box-sizing: border-box;">') as HTMLElement;

    let isOpen = open;
    let moving = false;

    outer.style.display = isOpen ? 'block' : 'none';

    return {
        open() {
            if (moving === false) {
                isOpen = true;
                moving = true;
                outer.style.display = 'block';
                xnew.transition((x: number) => {
                    outer.style.height = inner.offsetHeight * x + 'px';
                    outer.style.opacity = `${x}`;
                    if (x === 1.0) {
                        outer.style.height = 'auto';
                        moving = false;
                    }
                }, duration, easing);
            }
        },
        close() {
            if (moving === false) {
                moving = true;
                xnew.transition((x: number) => {
                    outer.style.height = inner.offsetHeight * (1.0 - x) + 'px';
                    outer.style.opacity = `${1.0 - x}`;
                    if (x === 1.0) {
                        isOpen = false;
                        outer.style.display = 'none';
                        outer.style.height = '0px';
                        moving = false;
                    }
                }, duration, easing);
            }
        },
        toggle() {
            isOpen ? self.close() : self.open();
        },
    };
}

export function Tab(self: xnew.Unit, { duration = 200, easing = 'ease' } = {}) {
    const tabs = new Map<string, xnew.Unit>();
    return {
        assign(name: string, component: Function) {
            const unit = xnew('<div>', component);
            tabs.set(name, unit);
            if (tabs.size > 1) {
                unit.element.style.display = 'none';
            }
        },
        select(name: string) {
            tabs.forEach((unit) => unit.element.style.display = 'none');
            const unit = tabs.get(name);
            unit!.element.style.display = 'block';
        }
    }
}
