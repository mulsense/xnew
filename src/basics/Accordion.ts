import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function AccordionFrame(frame: Unit, 
    { open = false, duration = 200, easing = 'ease'}: { open?: boolean, duration?: number, easing?: string } = {}
) {
    const internal = xnew((internal: Unit) => {
        return {
            frame, open, rate: 0.0,
            emit(type: string, ...args: any) { xnew.emit(type, ...args); }
        };
    });
    xnew.context('xnew.accordionframe', internal);
    
    internal.on('-transition', ({ rate }: { rate: number}) => internal.rate = rate);
    internal.emit('-transition', { rate: open ? 1.0 : 0.0});

    return {
        toggle() {
            if (internal.rate === 1.0) {
                frame.close();
            } else if (internal.rate === 0.0) {
                frame.open();
            }
        },
        open() {
            if (internal.rate === 0.0) {
                xnew.transition((x: number) => internal.emit('-transition', { rate: x }), duration, easing);
            }
        },
        close () {
            if (internal.rate === 1.0) {
                xnew.transition((x: number) => internal.emit('-transition', { rate: 1.0 - x }), duration, easing);
            }
        }
    }
}

export function AccordionHeader(header: Unit,
    {}: {} = {}
) {
    const internal = xnew.context('xnew.accordionframe');

    xnew.nest('<button style="display: flex; align-items: center; margin: 0; padding: 0; width: 100%; text-align: left; border: none; font: inherit; color: inherit; background: none; cursor: pointer;">');

    header.on('click', () => internal.frame.toggle());
}

export function AccordionBullet(bullet: Unit,
    { type = 'arrow' }: { type?: string } = {}
) {
    const internal = xnew.context('xnew.accordionframe');
    
    xnew.nest('<div style="display:inline-block; position: relative; width: 0.55em; margin: 0 0.3em;">');
    
    if (type === 'arrow') {
        const arrow = xnew(`<div style="width: 100%; height: 0.55em; border-right: 0.12em solid currentColor; border-bottom: 0.12em solid currentColor; box-sizing: border-box; transform-origin: center;">`);
        
        arrow.element.style.transform = `rotate(${internal.rate * 90 - 45}deg)`;
        internal.on('-transition', ({ rate }: { rate: number}) => {
            arrow.element.style.transform = `rotate(${rate * 90 - 45}deg)`;
        });
    } else if (type === 'plusminus') {
        const line1 = xnew(`<div style="position: absolute; width: 100%; border-top: 0.06em solid currentColor; border-bottom: 0.06em solid currentColor; box-sizing: border-box; transform-origin: center;">`);
        const line2 = xnew(`<div style="position: absolute; width: 100%; border-top: 0.06em solid currentColor; border-bottom: 0.06em solid currentColor; box-sizing: border-box; transform-origin: center;">`);

        line2.element.style.transform = `rotate(90deg)`;
        line2.element.style.opacity = `${1.0 - internal.rate}`;
        internal.on('-transition', ({ rate }: { rate: number}) => {
            line1.element.style.transform = `rotate(${90 + rate * 90}deg)`;
            line2.element.style.transform = `rotate(${rate * 180}deg)`;
        });
    }
}

export function AccordionContent(content: Unit,
    {}: {} = {}
) {
    const internal = xnew.context('xnew.accordionframe');
    xnew.nest(`<div style="display: ${internal.open ? 'block' : 'none'};">`) as HTMLElement;
    xnew.nest('<div style="padding: 0; display: flex; flex-direction: column; box-sizing: border-box;">') as HTMLElement;

    internal.on('-transition', ({ rate }: { rate: number }) => {
        content.transition({ element: content.element, rate });
    });
    
    return {
        transition({ element, rate }: { element: HTMLElement, rate: number }) {
            const wrapper = element.parentElement as HTMLElement;
            wrapper.style.display = 'block';
            if (rate === 0.0) {
                wrapper.style.display = 'none';
            } else if (rate < 1.0) {
                Object.assign(wrapper.style, { height: element.offsetHeight * rate + 'px', overflow: 'hidden', opacity: rate });
            } else {
                Object.assign(wrapper.style, { height: 'auto', overflow: 'visible', opacity: 1.0 });
            }
        }
    }
}
