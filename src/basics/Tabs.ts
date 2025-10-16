import { xnew } from '../core/xnew';

export function Tabs(self: xnew.Unit, { duration = 200, easing = 'ease' } = {}) {
    const tabs = new Map<string, xnew.Unit>();
    return {
        content(name: string, component: Function, props?: any) {
            const unit = xnew('<div>', component, props);
            tabs.set(name, unit);
        },
        select(name: string) {
            xnew.timeout(() => {
                tabs.forEach((unit) => unit.element.style.display = 'none');
                const unit = tabs.get(name);
                unit!.element.style.display = 'block';
            });
        }
    }
}
