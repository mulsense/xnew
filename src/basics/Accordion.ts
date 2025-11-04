import { xnew } from '../core/xnew';

export function AccordionFrame(frame: xnew.Unit, 
    {}: {} = {}
) {
    xnew.context('xnew.accordionframe', frame);

    let content: xnew.Unit | null = null;
    xnew.capture((unit: xnew.Unit) => unit.components.includes(AccordionContent), (unit: xnew.Unit) => {
        content = unit;
    });

    return {
        toggle() {
            if (content?.status === 1.0) {
                frame.emit('-close');
            } else if (content?.status === 0.0) {
                frame.emit('-open');
            }
        },
        open() {
            if (content?.status === 0.0) {
                frame.emit('-open');
            }
        },
        close () {
            if (content?.status === 1.0) {
                frame.emit('-close');
            }
        }
    }
}

export function AccordionHeader(header: xnew.Unit,
    {}: {} = {}
) {
    const frame = xnew.context('xnew.accordionframe');
    xnew.nest('<button style="display: flex; align-items: center; margin: 0; padding: 0; width: 100%; text-align: left; border: none; font: inherit; color: inherit; background: none; cursor: pointer;">');

    header.on('click', () => frame.toggle());
}

export function AccordionBullet(bullet: xnew.Unit,
    { type = 'arrow' }: { type?: string } = {}
) {
    const frame = xnew.context('xnew.accordionframe');

    xnew.nest('<div style="display:inline-block; position: relative; width: 0.5em; margin: 0 0.3em;">');
    frame.on('-transition', ({ status }: { status: number}) => bullet.transition?.(status));
    
    if (type === 'arrow') {
        const arrow = xnew(`<div style="width: 100%; height: 0.5em; border-right: 0.12em solid currentColor; border-bottom: 0.12em solid currentColor; box-sizing: border-box; transform-origin: center center;">`);
        return {
            transition(status: number) {
                arrow.element.style.transform = `rotate(${status * 90 - 45}deg)`;
            }
        }
    } else if (type === 'plusminus') {
        const line1 = xnew(`<div style="position: absolute; width: 100%; border-top: 0.06em solid currentColor; border-bottom: 0.06em solid currentColor; box-sizing: border-box; transform-origin: center center;">`);
        const line2 = xnew(`<div style="position: absolute; width: 100%; border-top: 0.06em solid currentColor; border-bottom: 0.06em solid currentColor; box-sizing: border-box; transform-origin: center center;">`);
        line2.element.style.transform = `rotate(90deg)`;

        return {
            transition(status: number) {
                line2.element.style.opacity = `${1.0 - status}`;
            }
        }
    }
}

export function AccordionContent(content: xnew.Unit,
    { open = false, duration = 200, easing = 'ease'}: { open?: boolean, duration?: number, easing?: string } = {}
) {
    const frame = xnew.context('xnew.accordionframe');
    const outer = xnew.nest('<div>') as HTMLElement;
    const inner = xnew.nest('<div style="padding: 0; display: flex; flex-direction: column; box-sizing: border-box;">') as HTMLElement;

    let status = open ? 1.0 : 0.0;
    outer.style.display = status ? 'block' : 'none';
    frame.emit('-transition', { status });

    frame.on('-open', () => {
        xnew.transition((x: number) => {
            status = x;
            frame.emit('-transition', { status });
            content.transition(status);
        }, duration, easing);
    });
    frame.on('-close', () => {
        xnew.transition((x: number) => {
            status = 1.0 - x;
            frame.emit('-transition', { status });
            content.transition(status);
        }, duration, easing);
    });
    return {
        get status() {
            return status;
        },
        transition(status: number) {
            outer.style.display = 'block';
            if (status === 0.0) {
                outer.style.display = 'none';
            } else if (status < 1.0) {
                Object.assign(outer.style, { height: inner.offsetHeight * status + 'px', overflow: 'hidden', opacity: status });
            } else {
                Object.assign(outer.style, { height: 'auto', overflow: 'visible', opacity: 1.0 });
            }
        },
    };
}
