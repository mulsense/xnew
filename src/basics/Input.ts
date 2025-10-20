import { xnew } from '../core/xnew';

export function InputUnit(self: xnew.Unit,
    {}: {} = {}
) {
    xnew.nest('<div>');

    const status = xnew('<div style="font-size: 0.8em; margin-bottom: -0.2em; display: flex; flex-direction: row; justify-content: space-between;">', (self: xnew.Unit) => {
        const div1 = xnew('<div style="flex: auto">');
        const div2 = xnew('<div style="flex: none">');
        return {
            set name(name: string) {
                div1.element.textContent = name;
            },
            set value(value: string) {
                div2.element.textContent = value;
            }
        }
    });
    self.on('append', (unit: xnew.Unit) => {
        if (unit.element.tagName.toLowerCase() === 'input') {
            const element = unit.element as HTMLInputElement;
            status.name = element.name ?? '';
            if (element.type === 'range') {
                status.value = element.value;
                xnew.listener(element).on('input change', (event: Event) => {
                    status.value = element.value;
                });
            }
        }
    });
}
