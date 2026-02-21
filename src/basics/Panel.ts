import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { OpenAndClose, Accordion } from './Transition';

interface PanelOptions { name?: string; open?: boolean; params?: Record<string, any>; }

export function Panel(unit: Unit, { name, open = false, params }: PanelOptions) {
    const object = params ?? {} as Record<string, any>;
    xnew.extend(Group, { name, open });
    
    return {
        group({ name, open, params }: PanelOptions, inner: Function) {
            const group = xnew((unit: Unit) => {
                xnew.extend(Panel, { name, open, params: params ?? object });
                inner(unit);
            });
            group.on('-eventcapture', ({ event, key, value }: { event: Event, key: string, value: any }) => {
                xnew.emit('-eventcapture', { event, key, value });
            });
            return group;
        },
        button(key: string) {
            const button = xnew(Button, { key });
            button.on('click', ({ event }: { event: Event }) => {
                xnew.emit('-eventcapture', { event, key });
            });
            return button;
        },
        select(key: string, { options = [] }: { options?: string[] } = {}) {
            object[key] = object[key] ?? options[0] ?? '';
            const select = xnew(Select, { key, value: object[key], options });
            select.on('input', ({ event, value }: { event: Event, value: string }) => {
                xnew.emit('-eventcapture', { event, key, value });
            });
            return select;
        },
        range(key: string, options: { min?: number, max?: number, step?: number } = {}) {
            object[key] = object[key] ?? 0;

            const number = xnew(Range, { key, value: object[key], ...options });
            number.on('input', ({ event, value }: { event: Event, value: number }) => {
                object[key] = value;
                xnew.emit('-eventcapture', { event, key, value });
            });
            return number;
        },
        checkbox(key: string) {
            object[key] = object[key] ?? false;

            const checkbox = xnew(Checkbox, { key, value: object[key] });
            checkbox.on('input', ({ event, value }: { event: Event, value: boolean }) => {
                object[key] = value;
                xnew.emit('-eventcapture', { event, key, value });
            });
            return checkbox;
        },
        separator() {
            xnew(Separator);
        }
    }
}

function Group(group: Unit, { name, open = false }: { name?: string, open?: boolean }) {
    xnew.extend(OpenAndClose, { open });
    if (name) {
        xnew('<div style="display: flex; align-items: center; cursor: pointer;">', (unit: Unit) => {
            unit.on('click', () => group.toggle());
            xnew('<svg viewBox="0 0 12 12" style="width: 1rem; height: 1rem; margin-right: 0.25rem;" fill="none" stroke="currentColor">', (unit: Unit) => {
                xnew('<path d="M6 2 10 6 6 10" />');
                group.on('-transition', ({ state }: { state: number }) => unit.element.style.transform = `rotate(${state * 90}deg)`);
            });
            xnew('<div>', name);
        });
    }
    xnew.extend(Accordion);
}

function Button(unit: Unit, { key = '' }: { key?: string }) {
    xnew.nest('<button style="margin: 0.125rem; padding: 0.125rem; border: 1px solid; border-radius: 0.25rem; cursor: pointer;">');
    unit.element.textContent = key;
    unit.on('pointerover', () => {
        unit.element.style.background = 'rgba(0, 0, 128, 0.1)';
        unit.element.style.borderColor = 'blue';
    });
    unit.on('pointerout', () => {
        unit.element.style.background = '';
        unit.element.style.borderColor = '';
    });
    unit.on('pointerdown', () => {
        unit.element.style.filter = 'brightness(0.5)';
    });
    unit.on('pointerup', () => {
        unit.element.style.filter = '';
    });
}

function Separator(unit: Unit) {
    xnew.nest('<div style="margin: 0.5rem 0; border-top: 1px solid;">');
}

function Range(unit: Unit,
    { key = '', value, min = 0, max = 100, step = 1 }:
    { key?: string, value?: number, min?: number, max?: number, step?: number }
) {
    xnew.nest(`<div style="margin: 0.125rem;">`);
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
    xnew.nest(`<label style="margin: 0.125rem; display: flex; align-items: center; cursor: pointer;">`);
    
    xnew('<div style="flex: 1;">', key);
    xnew.nest(`<input type="checkbox" name="${key}" ${value ? 'checked' : ''} style="margin-right: 0.25rem;">`);
}

function Select(unit: Unit, { key = '', value, options = [] }: { key?: string, value?: string, options?: string[] } = {}) {
    xnew.nest(`<div style="margin: 0.125rem; display: flex; align-items: center;">`);
    xnew('<div style="flex: 1;">', key);
    xnew.nest(`<select name="${key}" style="padding: 0.125rem; border: 1px solid; border-radius: 0.25rem; cursor: pointer;">`);
    for (const option of options) {
        xnew(`<option value="${option}" ${option === value ? 'selected' : ''}>`, option);
    }
}