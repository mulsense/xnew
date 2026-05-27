import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { master } from '../utils/audio';
import { SVG } from './SVG';
import { Aspect } from './Aspect';
import { OpenAndClose } from './Transition';

const paleColor = 'color-mix(in srgb, currentColor 20%, transparent)';

function SpeakerIcon(unit: Unit, { muted = false } = {}) {
    xnew.extend(SVG, { viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.5 });
    const path = muted
        ? 'M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9 9 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25z'
        : 'M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9 9 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25z';
    xnew(`<path d="${path}" />`);
}

export function VolumeController(unit: Unit, { anchor = 'left' } = {}) {
    xnew.extend(Aspect, { aspect: 1.0, fit: 'contain' });
    unit.on('pointerdown', ({ event }: { event: Event }) => event.stopPropagation());

    const system = xnew(OpenAndClose, { open: false, transition: { duration: 250, easing: 'ease' } });

    const button = xnew((unit: Unit) => {
        xnew.nest('<div style="width: 100%; height: 100%; cursor: pointer;">');
        unit.on('click', () => system.toggle());
        let icon = xnew(SpeakerIcon, { muted: master.gain.value === 0 });
        return {
            update() {
                icon?.finalize();
                icon = xnew(SpeakerIcon, { muted: master.gain.value === 0 });
            }
        };
    });

    xnew(() => {
        const isHoriz = anchor === 'left' || anchor === 'right';
        const unit = isHoriz ? 'cqw' : 'cqh';
        const fillProp = isHoriz ? 'width' : 'height';
        const pct = master.gain.value * 100;

        const outerSize = isHoriz ? `top: 20%; bottom: 20%; width: 0${unit}` : `left: 20%; right: 20%; height: 0${unit}`;
        const fillSize = isHoriz ? `top: 0; left: 0; bottom: 0; width: ${pct}%; height: 100%` : `bottom: 0; left: 0; right: 0; width: 100%; height: ${pct}%`;

        const outer = xnew.nest(`<div style="position: absolute; ${outerSize};">`);
        xnew.nest(`<div style="position: relative; width: 100%; height: 100%; border: 1px solid currentColor; border-radius: 0.25em; box-sizing: border-box;">`);

        const fill = xnew(`<div style="position: absolute; ${fillSize}; background: ${paleColor};">`);
        const input = xnew(`<input type="range" min="0" max="100" value="${pct}" style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; margin: 0;${isHoriz ? '' : ' writing-mode: vertical-lr; direction: rtl;'}">`);

        const css = (el: { style: CSSStyleDeclaration }) => el.style as unknown as Record<string, string>;

        input.on('input', ({ event }: { event: Event }) => {
            const v = Number((event.target as HTMLInputElement).value);
            css(fill.element)[fillProp] = `${v}%`;
            master.gain.value = v / 100;
            button.update();
        });

        system.on('-transition', ({ value }: { value: number }) => {
            css(outer)[anchor] = `-${value * 400 + 20}${unit}`;
            css(outer)[fillProp] = `${value * 400}${unit}`;
            outer.style.opacity = value.toString();
            outer.style.pointerEvents = value < 0.9 ? 'none' : 'auto';
        });
    });

    unit.on('click.outside', () => system.close());
}
