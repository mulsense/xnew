//----------------------------------------------------------------------------------------------------
// Selectable — click-to-select behavior (a `selected` flag raised/lowered by inside/outside clicks)
//
// Extend onto (or instantiate on) a unit that owns a DOM element. Clicking the element raises the
// `selected` flag and emits '-select'; clicking anywhere outside lowers it and emits '-deselect'.
// Lets a parent react via `item.on('-select' / '-deselect', ...)` or read `item.selected`, without
// wiring click / click.outside DOM events itself. Re-clicking the element keeps it selected (not a toggle).
//
// - Selectable(unit, { selected? }) : adds the behavior. defines `selected`(getter) / `select()` / `deselect()`
//
// Example:
//   const item = xnew('<div>', Selectable);
//   item.on('-select', () => console.log('selected!', item.selected));
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function Selectable(unit: Unit, { selected = false }: { selected?: boolean } = {}) {
    let current = selected;

    const change = (next: boolean): void => {
        if (current === next) { return; }
        current = next;
        xnew.emit(current ? '-select' : '-deselect');   // 親は item.on('-select'/'-deselect') で受け取る
    };

    unit.on('click', () => change(true));            // 自分がクリックされたら選択
    unit.on('click.outside', () => change(false));   // 外側がクリックされたら解除

    return {
        get selected(): boolean { return current; },
        select(): void { change(true); },
        deselect(): void { change(false); },
    };
}
