import { xnew } from '../core/xnew';

export function AccordionFrame(frame: xnew.Unit, 
    {}: {} = {}
) {
    xnew.context('xnew.accordionframe', { frame });

    let content: xnew.Unit | null = null;
    xnew.capture((unit: xnew.Unit) => unit.components.includes(AccordionContent), (unit: xnew.Unit) => {
        content = unit;
    });

    frame.on('-toggle', () => {
        if (content?.status === 1.0) {
            frame.emit('-close');
            content.close();
        } else if (content?.status === 0.0) {
            frame.emit('-open');
            content.open();
        }
    });
}

export function AccordionButton(button: xnew.Unit,
    {}: {} = {}
) {
    const { frame } = xnew.context('xnew.accordionframe');
    xnew.nest('<div>');

    xnew().on('click', () => frame.emit('-toggle'));
}

export function AccordionContent(content: xnew.Unit,
    { open = false, duration = 200, easing = 'ease'}: { open?: boolean, duration?: number, easing?: string } = {}
) {
    const { frame } = xnew.context('xnew.accordionframe');
    const outer = xnew.nest('<div>') as HTMLElement;
    const inner = xnew.nest('<div style="padding: 0; display: flex; flex-direction: column; box-sizing: border-box;">') as HTMLElement;

    let status = open ? 1.0 : 0.0;
    outer.style.display = status ? 'block' : 'none';
    
    return {
        get status() {
            return status;
        },
        open() {
            return xnew.transition((x: number) => content.transition(x), duration, easing);
        },
        close() {
            return xnew.transition((x: number) => content.transition(1.0 - x), duration, easing);
        },
        transition(x: number) {
            status = x;
            if (x === 0.0) {
                outer.style.display = 'none';
            } else if (x < 1.0) {
                outer.style.overflow = 'hidden';
                outer.style.height = inner.offsetHeight * x + 'px';
                outer.style.opacity = x.toString();
                outer.style.display = 'block';
            } else {
                outer.style.overflow = 'visible';
                outer.style.height = 'auto';
                outer.style.opacity = '1.0';
                outer.style.display = 'block';
            }
        },
    };
}

