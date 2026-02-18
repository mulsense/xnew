import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { OpenAndClose, Accordion } from '../basics/Transition';

interface GUIPanelOptions {
    name?: string;
    open?: boolean;
    params?: Record<string, any>;
}

export function GUIPanel(unit: Unit, { name = '', open, params }: GUIPanelOptions = {}) {
    const object = params ?? {} as Record<string, any>;
    xnew.extend(Group, { name, open });
    
    return {
        group(key: string, { name, open, params }: GUIPanelOptions, inner: Function) {
            const group = xnew((unit: Unit) => {
                xnew.extend(GUIPanel, { name: name ?? key, open, params: params ?? object });
                inner(unit);
            });
            group.on('-change', ({ event, key }: { event: PointerEvent, key: string }) => {
                xnew.emit('-change.' + key, { event, key });
                xnew.emit('-change', { event, key });
            });
            return group;
        },
        button(key: string) {
            const button = xnew(Button, { key });
            return button;
        },
        number(key: string, options: { min?: number, max?: number, step?: number } = {}) {
            object[key] = object[key] ?? 0;

            const number = xnew(Number, { key, value: object[key], ...options });
            number.on('input', ({ event }: { event: Event }) => {
                object[key] = parseFloat((event.target as HTMLInputElement).value);
                xnew.emit('-change.' + key, { event, key });
                xnew.emit('-change', { event, key });
            });
            return number;
        },
        checkbox(key: string) {
            object[key] = object[key] ?? false;

            const checkbox = xnew(Checkbox, { key, value: object[key] });
            checkbox.on('input', ({ event }: { event: Event }) => {
                object[key] = (event.target as HTMLInputElement).checked;
                xnew.emit('-change.' + key, { event, key });
                xnew.emit('-change', { event, key });
            });
            return checkbox;
        },
        border() {
            xnew(Border);
        }
    }
}

function Group(unit: Unit, { name = '', open }: { name?: string, open?: boolean } = {}) {
    if (open === undefined) {
        xnew('<div style="display: flex; align-items: center;">', (unit: Unit) => {
            xnew('<div>', name);
        });
    } else {
        const system = xnew(OpenAndClose, { open });
        xnew('<div style="display: flex; align-items: center; cursor: pointer;">', (unit: Unit) => {
            unit.on('click', () => system.toggle());
            xnew('<svg viewBox="0 0 12 12" style="width: 1rem; height: 1rem; margin-right: 0.25rem;" fill="none" stroke="currentColor">', (unit: Unit) => {
                xnew('<path d="M6 2 10 6 6 10" />');
                system.on('-transition', ({ state }: { state: number }) => unit.element.style.transform = `rotate(${state * 90}deg)`);
            });
            xnew('<div>', name);
        });
        xnew.extend(Accordion);
    }
}

function Button(unit: Unit, { key = '' }: { key?: string } = {}) {
    xnew.nest('<button style="margin: 0.125rem; border: 1px solid; border-radius: 0.25rem; cursor: pointer;">');
    unit.element.textContent = key;
    unit.on('mouseover', () => {
        unit.element.style.background = 'rgba(0, 0, 128, 0.1)';
        unit.element.style.borderColor = 'blue';
    });
    unit.on('mouseout', () => {
        unit.element.style.background = '';
        unit.element.style.borderColor = '';
    });
}

function Border(unit: Unit) {
    xnew.nest('<div style="margin: 0.5rem 0; border-top: 1px solid;">');
}

function Number(unit: Unit,
    { key = '', value, min = 0, max = 100, step = 1 }:
    { key?: string, value?: number, min?: number, max?: number, step?: number } = {}
) {
    const status = xnew('<div style="display: flex; justify-content: space-between;">', (unit: Unit) => {
        xnew('<div style="flex: 1;">', key);
        xnew('<div key="status" style="flex: none;">', value);
    });
    xnew.nest(`<input type="range" name="${key}" min="${min}" max="${max}" step="${step}" value="${value}" style="width: 100%; cursor: pointer;">`);
    unit.on('input', ({ event }: { event: Event }) => {
        status.element.querySelector('[key="status"]')!.textContent = (event.target as HTMLInputElement).value;
    });
}

function Checkbox(unit: Unit, { key = '', value }: { key?: string, value?: boolean } = {}) {
    xnew.nest(`<label style="display: flex; align-items: center; cursor: pointer;">`);
    
    xnew('<div style="flex: 1;">', key);
    xnew.nest(`<input type="checkbox" name="${key}" ${value ? 'checked' : ''} style="margin-right: 0.25rem;">`);
}