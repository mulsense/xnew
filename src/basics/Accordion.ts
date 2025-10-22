import { xnew } from '../core/xnew';

export function AccordionFrame(frame: xnew.Unit, 
    { duration = 200, easing = 'ease' }: { className?: string, style?: Partial<CSSStyleDeclaration>, duration?: number, easing?: string } = {}
) {
    xnew.context('xnew.accordionframe', frame);
}

export function AccordionButton(button: xnew.Unit,
    {}: {} = {}
) {
    const frame = xnew.context('xnew.accordionframe');
    xnew.nest('<div>');

    button.on('click', () => frame.emit('-toggle'));
}

export function AccordionContent(content: xnew.Unit,
    { open = false, duration = 200, easing = 'ease' }: { open?: boolean, duration?: number, easing?: string } = {}
) {
    const frame = xnew.context('xnew.accordionframe');
    const outer = xnew.nest('<div>') as HTMLElement;
    const inner = xnew.nest('<div style="padding: 0; display: flex; flex-direction: column; box-sizing: border-box;">') as HTMLElement;

    let state = open ? 'open' : 'closed';
    outer.style.display = state === 'open' ? 'block' : 'none';
    
    frame.on('-toggle', () => {
        if (state === 'open') {
            content.close();
        } else if (state === 'closed') {
            content.open();
        }
    });

    return {
        get state() {
            return state;
        },
        open() {
            if (state === 'closed') {
                state = 'opening';
                xnew.transition((x: number) => content.transition(outer, inner, x), duration, easing).next(() => state = 'open');
            }
        },
        close() {
            if (state === 'open') {
                state = 'closing';
                xnew.transition((x: number) => content.transition(outer, inner, 1.0 - x), duration, easing).next(() => state = 'closed');
            }
        },
        transition(outer: HTMLElement, inner: HTMLElement, x: number) {
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

