import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { DirectEvent } from './Event';
import { master } from '../audio/audio';
import { icons } from '../icons/icons';

export function VolumeController(unit: Unit, {}: { } = {}) {
    xnew.nest(`<div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: flex-end; pointer-events: none; container-type: size;">`);
    xnew.extend(DirectEvent);
    unit.on('-pointerdown', ({ event }: { event: PointerEvent }) => event.stopPropagation());
    
    const slider = xnew(`<input type="range" min="0" max="100" value="${master.gain.value * 100}"
    style="display: none; width: calc(96cqw - 100cqh); margin: 0 2cqw; cursor: pointer; pointer-events: auto;"
    >`);

    unit.on('-click:outside', () => slider.element.style.display = 'none');
    const button = xnew((button: Unit) => {
    xnew.nest('<div style="position: relative; width: 100cqh; height: 100cqh; cursor: pointer; pointer-events: auto;">');
    let icon = xnew(master.gain.value > 0 ? icons.SpeakerWave : icons.SpeakerXMark);
    return {
        update() {
        icon?.finalize();
        icon = xnew(master.gain.value > 0 ? icons.SpeakerWave : icons.SpeakerXMark);
        }
    };
    });

    button.on('click', () => slider.element.style.display = slider.element.style.display !== 'none' ? 'none' : 'flex');
    slider.on('input', (event: any) => {
        master.gain.value = parseFloat(event.target.value) / 100;
        button.update();
    });
}
