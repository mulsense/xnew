import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { OpenAndClose, Accordion } from './Transition';

interface PanelOptions { name?: string; open?: boolean; params?: Record<string, any>; }

const currentColorA = 'color-mix(in srgb, currentColor 70%, transparent)';
const currentColorB = 'color-mix(in srgb, currentColor 10%, transparent)';

export function Panel(unit: Unit, { name, open = false, params }: PanelOptions) {
    const object = params ?? {} as Record<string, any>;
    xnew.extend(Group, { name, open });
    
    return {
        group({ name, open, params }: PanelOptions, inner: Function) {
            const group = xnew((unit: Unit) => {
                xnew.extend(Panel, { name, open, params: params ?? object });
                inner(unit);
            });
            return group;
        },
        button(key: string) {
            const button = xnew(Button, { key });
            return button;
        },
        select(key: string, { options = [] }: { options?: string[] } = {}) {
            object[key] = object[key] ?? options[0] ?? '';

            const select = xnew(Select, { key, value: object[key], options });
            select.on('input', ({ value }: { value: string }) => object[key] = value);
            return select;
        },
        range(key: string, options: { min?: number, max?: number, step?: number } = {}) {
            object[key] = object[key] ?? options.min ?? 0;

            const number = xnew(Range, { key, value: object[key], ...options });
            number.on('input', ({ value }: { value: number }) => object[key] = value);
            return number;
        },
        checkbox(key: string) {
            object[key] = object[key] ?? false;

            const checkbox = xnew(Checkbox, { key, value: object[key] });
            checkbox.on('input', ({ value }: { value: boolean }) => object[key] = value);
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
        xnew('<div style="height: 2rem; margin: 0.125rem 0; display: flex; align-items: center; cursor: pointer; user-select: none;">', (unit: Unit) => {
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
    xnew.nest('<button style="margin: 0.125rem 0; height: 2rem; border: 1px solid; border-radius: 0.25rem; cursor: pointer;">');
    
    unit.element.textContent = key;
    unit.on('pointerover', () => {
        unit.element.style.background = currentColorB;
        unit.element.style.borderColor = currentColorA;
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
    xnew.nest(`<div style="margin: 0.5rem 0; border-top: 1px solid ${currentColorA};">`);
}

function Range(unit: Unit,
    { key = '', value, min = 0, max = 100, step = 1 }:
    { key?: string, value?: number, min?: number, max?: number, step?: number }
) {
    value = value ?? min;

    xnew.nest(`<div style="position: relative; height: 2rem; margin: 0.125rem 0; cursor: pointer; user-select: none;">`);

    // fill bar
    const ratio = (value - min) / (max - min);
    const fill = xnew(`<div style="position: absolute; top: 0; left: 0; bottom: 0; width: ${ratio * 100}%; background: ${currentColorB}; border: 1px solid ${currentColorA}; border-radius: 0.25rem; transition: width 0.05s;">`);

    // overlay labels
    const status = xnew('<div style="position: absolute; inset: 0; padding: 0 0.5rem; display: flex; justify-content: space-between; align-items: center; pointer-events: none;">', (unit: Unit) => {
        xnew('<div>', key);
        xnew('<div key="status">', value);
    });

    // hidden native input for interaction
    xnew.nest(`<input type="range" name="${key}" min="${min}" max="${max}" step="${step}" value="${value}" style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; margin: 0;">`);

    unit.on('input', ({ event }: { event: Event }) => {
        const v = Number((event.target as HTMLInputElement).value);
        const r = (v - min) / (max - min);
        fill.element.style.width = `${r * 100}%`;
        status.element.querySelector('[key="status"]')!.textContent = String(v);
    });
}

function Checkbox(unit: Unit, { key = '', value }: { key?: string, value?: boolean } = {}) {
    xnew.nest(`<div style="position: relative; height: 2rem; margin: 0.125rem 0; padding: 0 0.5rem; display: flex; align-items: center; cursor: pointer; user-select: none;">`);

    xnew('<div style="flex: 1;">', key);

    const box = xnew(`<div style="width: 1.25rem; height: 1.25rem; border: 1px solid ${currentColorA}; border-radius: 0.25rem; display: flex; align-items: center; justify-content: center; transition: background 0.1s;">`, () => {
        xnew(`<svg viewBox="0 0 12 12" style="width: 1.25rem; height: 1.25rem; opacity: 0; transition: opacity 0.1s;" fill="none" stroke="${currentColorA}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`, () => {
            xnew('<path d="M2 6 5 9 10 3" />');
        });
    });
    const check = box.element.querySelector('svg') as SVGElement;

    const update = (checked: boolean) => {
        box.element.style.background = checked ? currentColorB : '';
        check.style.opacity = checked ? '1' : '0';
    };
    update(!!value);
    xnew.nest(`<input type="checkbox" name="${key}" ${value ? 'checked' : ''} style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; margin: 0;">`);
    unit.on('input', ({ event, value }: { event: Event, value: boolean }) => {
        update(value);
    });
}

function Select(_: Unit, { key = '', value, options = [] }: { key?: string, value?: string, options?: string[] } = {}) {
    const initial = value ?? options[0] ?? '';

    xnew.nest(`<div style="position: relative; height: 2rem; margin: 0.125rem 0; padding: 0 0.5rem; display: flex; align-items: center;">`);
    xnew('<div style="flex: 1;">', key);

    const native = xnew(`<select name="${key}" style="display: none;">`, () => {
        for (const option of options) {
            xnew(`<option value="${option}" ${option === initial ? 'selected' : ''}>`, option);
        }
    });

    const button = xnew(`<div style="height: 2rem; padding: 0 1.5rem 0 0.5rem; display: flex; align-items: center; border: 1px solid ${currentColorA}; border-radius: 0.25rem; cursor: pointer; user-select: none; min-width: 3rem; white-space: nowrap;">`, initial);

    xnew(`<svg viewBox="0 0 12 12" style="position: absolute; right: 1.0rem; width: 0.75rem; height: 0.75rem; pointer-events: none;" fill="none" stroke="${currentColorA}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`, () => {
        xnew('<path d="M2 4 6 8 10 4" />');
    });
    
    button.on('click', () => {
        xnew((list: Unit) => {
            
            xnew.nest(`<div style="position: fixed; border: 1px solid ${currentColorA}; border-radius: 0.25rem; overflow: hidden; z-index: 1000;">`);
            const updatePosition = () => {
                const rect = button.element.getBoundingClientRect();
                list.element.style.right = (window.innerWidth - rect.right) + 'px';
                list.element.style.top = rect.bottom + 'px';
                list.element.style.minWidth = rect.width + 'px';
            };
            updatePosition();
            list.element.style.background = getEffectiveBg(button.element);
            window.addEventListener('scroll', updatePosition, true);
            list.on('finalize', () => window.removeEventListener('scroll', updatePosition, true));

            for (const option of options) {
                const item = xnew(`<div style="height: 2rem; padding: 0 0.5rem; display: flex; align-items: center; cursor: pointer; user-select: none;">`, option);
                item.on('pointerover', () => item.element.style.background = currentColorB);
                item.on('pointerout', () => item.element.style.background = '');
                item.on('click', () => {
                    button.element.textContent = option;
                    (native.element as HTMLSelectElement).value = option;
                    native.element.dispatchEvent(new Event('input', { bubbles: false }));
                    list.finalize();
                });
            }
            list.on('click.outside', () => {
                list.finalize();
            });
        });
    });

    xnew.nest(native.element);
}

function getEffectiveBg(el: Element): string {
    let current: Element | null = el.parentElement;
    while (current) {
        const bg = getComputedStyle(current).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
        current = current.parentElement;
    }
    return 'Canvas';
}