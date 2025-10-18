import { xnew } from '../core/xnew';

export function BulletArrow(self: xnew.Unit,
    { rotate = 0, color = '#000' }: { rotate?: number; color?: string } = {}
) {
    const arrow = xnew(`<div style="display:inline-block; width: 0.5em; height: 0.5em; border-right: 0.15em solid ${color}; border-bottom: 0.15em solid ${color}; box-sizing: border-box; transform-origin: center center;">`);

    arrow.element.style.transform = `rotate(${rotate - 45}deg)`;

    return {
        rotate(rotate: number, transition: number = 200, easing: string = 'ease') {
            arrow.element.style.transition = `transform ${transition}ms ${easing}`;
            arrow.element.style.transform = `rotate(${rotate - 45}deg)`;
        }
    }
}
