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
                content.deselect();
            } else if (content?.status === 0.0) {
                frame.emit('-open');
                content.select();
            }
        },
        open () {
            if (content?.status === 0.0) {
                frame.emit('-open');
                content.select();
            }
        },
        close () {
            if (content?.status === 1.0) {
                frame.emit('-close');
                content.deselect();
            }
        }
    }
}

export function AccordionButton(button: xnew.Unit,
    {}: {} = {}
) {
    const frame = xnew.context('xnew.accordionframe');
    xnew.nest('<div>');

    xnew().on('click', () => frame.toggle());
}

export function AccordionContent(content: xnew.Unit,
    { open = false, duration = 200, easing = 'ease'}: { open?: boolean, duration?: number, easing?: string } = {}
) {
    const frame = xnew.context('xnew.accordionframe');
    const outer = xnew.nest('<div>') as HTMLElement;
    const inner = xnew.nest('<div style="padding: 0; display: flex; flex-direction: column; box-sizing: border-box;">') as HTMLElement;

    let status = open ? 1.0 : 0.0;
    outer.style.display = status ? 'block' : 'none';
    
    return {
        get status() {
            return status;
        },
        select() {
            xnew.transition((x: number) => content.transition(x), duration, easing);
        },
        deselect() {
            xnew.transition((x: number) => content.transition(1.0 - x), duration, easing);
        },
        transition(x: number) {
            status = x;
            outer.style.display = 'block';
            if (x === 0.0) {
                outer.style.display = 'none';
            } else if (x < 1.0) {
                Object.assign(outer.style, { height: inner.offsetHeight * x + 'px', overflow: 'hidden', opacity: x });
            } else {
                Object.assign(outer.style, { height: 'auto', overflow: 'visible', opacity: 1.0 });
            }
        },
    };
}

