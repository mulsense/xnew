import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { PointerEvent } from './Event';

export function VolumeController(unit: Unit, { range = '10cqw', icon = 0 }: { range?: number | string, icon?: number | string } = {}) {
    xnew.nest(`<div class="flex items-center">`);
    xnew.extend(PointerEvent);
    unit.on('pointerdown', (event: any) => event.stopPropagation());

    //   const slider = xnew(`<input
    //     type="range" min="0" max="100" value="${xnew.audio.volume * 100}"
    //     style="display: none; width: 15cqw; cursor: pointer; accent-color: rgb(134, 94, 197);"
    //   >`);
    let cursor;
    const slider = xnew(`<div style="width: ${range}; container-type: size; display: block;">`, () => {
        xnew(`<div style="width: 100%; margin-top: -4cqw; height: 8cqw; border-radius: 4cqw; box-shadow: 0 0 2cqw currentColor;">`, () => {
            cursor = xnew('<div style="background-color: currentColor;">')
        });
    });

    //   unit.on('-click:outside', () => slider.element.style.display = 'none');
    // const button = xnew(SpeakerIcon, { icon });
    // button.on('click', () => {
    //     slider.element.style.display = slider.element.style.display !== 'none' ? 'none' : 'block';
    //     console.log('click', slider.element.style.display);
    // });
    //   slider.on('input', (event: any) => {
    //     button.change(event.target.value !== '0');
    //     xnew.audio.volume = parseFloat(event.target.value) / 100;
    //   });
}
