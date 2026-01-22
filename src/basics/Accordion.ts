import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function Accordion(unit: Unit, 
    { open = false, duration = 200, easing = 'ease'}: { open?: boolean, duration?: number, easing?: string } = {}
) {
    xnew.context('xnew.accordion', unit);
    
    unit.on('-transition', ({ state }: { state: number }) => {
        unit.state = state;
    });
    xnew.timeout(() => {
        xnew.emit('-transition', { state: open ? 1.0 : 0.0 });
    });

    return {
        state: open ? 1.0 : 0.0,
        toggle() {
            if (unit.state === 1.0) {
                unit.close();
            } else if (unit.state === 0.0) {
                unit.open();
            }
        },
        open() {
            if (unit.state === 0.0) {
                xnew.transition((x: number) => xnew.emit('-transition', { state: x }), duration, easing);
            }
        },
        close () {
            if (unit.state === 1.0) {
                xnew.transition((x: number) => xnew.emit('-transition', { state: 1.0 - x }), duration, easing);
            }
        }
    }
}
