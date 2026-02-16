import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

type ScreenFit = 'contain' | 'cover';

export function Screen(unit: Unit, { aspect, fit = 'contain' }: { aspect?: number, fit?: ScreenFit } = {}) {
    xnew.nest('<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; container-type: size; overflow: hidden;">');
    xnew.nest(`<div style="position: relative; aspect-ratio: ${aspect}; container-type: size; overflow: hidden;">`);

    if (fit === 'contain') {
        unit.element.style.width = `min(100cqw, calc(100cqh * ${aspect}))`;
    } else {
        unit.element.style.flexShrink = '0';
        unit.element.style.width = `max(100cqw, calc(100cqh * ${aspect}))`;
    }

}
