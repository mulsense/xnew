import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function Aspect(unit: Unit,
    { aspect = 1.0, fit = 'contain' }:
    { aspect?: number, fit?: 'contain' | 'cover' } = {}
) {
    xnew.nest('<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; container-type: size;">');
    xnew.nest(`<div style="position: relative; aspect-ratio: ${aspect}; container-type: size;">`);

    if (fit === 'contain') {
        unit.element.style.width = `min(100cqw, calc(100cqh * ${aspect}))`;
    } else {
        unit.element.style.flexShrink = '0';
        unit.element.style.width = `max(100cqw, calc(100cqh * ${aspect}))`;
    }
}