import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { PointerEvent } from './Event';

function SpeakerIcon(unit: Unit, { icon = 0 }: { icon?: number | string } = {}) {
    xnew.nest(`<div style="position: relative; cursor: pointer; pointer-events: auto; width: ${icon}; height: ${icon};">`);
    xnew.nest('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">');
    let path: Unit;
    change(xnew.audio.volume > 0);
    return { change };

    function change(isOn: boolean) {
        path?.finalize();
        if (isOn) {
            path = xnew('<path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />');
        } else {
            path = xnew('<path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />');
        }
    }
}

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
    const button = xnew(SpeakerIcon, { icon });
    button.on('click', () => {
        slider.element.style.display = slider.element.style.display !== 'none' ? 'none' : 'block';
        console.log('click', slider.element.style.display);
    });
    //   slider.on('input', (event: any) => {
    //     button.change(event.target.value !== '0');
    //     xnew.audio.volume = parseFloat(event.target.value) / 100;
    //   });
}
