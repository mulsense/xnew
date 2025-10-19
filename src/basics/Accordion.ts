import { xnew } from '../core/xnew';

export function AccordionFrame(frame: xnew.Unit, 
    { className, style, duration = 200, easing = 'ease' }: { className?: string, style?: Partial<CSSStyleDeclaration>, duration?: number, easing?: string } = {}
) {
    xnew.context('xnew.accordionframe', frame);
    const div = xnew.nest('<div>', { className, style }) as HTMLElement;

    let content: xnew.Unit | null = null;

    return {
        set content(unit: xnew.Unit) {
            content = unit;
        },
        get content() : xnew.Unit | null {
            return content;
        },
    }
}

export function AccordionButton(button: xnew.Unit
    { className, style }: { className?: string, style?: Partial<CSSStyleDeclaration> } = {}
) {
    const frame = xnew.context('xnew.accordionframe');
    const div = xnew.nest('<div>', { className, style }) as HTMLElement;

    button.on('click', () => frame.content?.toggle());
}

export function AccordionContent(content: xnew.Unit,
    { className, style, open = false, duration = 200, easing = 'ease' }: { className?: string, style?: Partial<CSSStyleDeclaration>, open?: boolean, duration?: number, easing?: string } = {}
) {
    const frame = xnew.context('xnew.accordionframe');
    frame.content = content;

    const outer = xnew.nest('<div>') as HTMLElement;
    const inner = xnew.nest('<div style="padding: 0; display: flex; flex-direction: column; box-sizing: border-box;">') as HTMLElement;
    xnew.nest('<div>', { className, style });

    let state = open ? 'open' : 'closed';
    outer.style.display = state === 'open' ? 'block' : 'none';

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
        toggle() {
            if (state === 'open') {
                content.close();
            } else if (state === 'closed') {
                content.open();
            }
        },
    };
}

