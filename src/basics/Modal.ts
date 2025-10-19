import { xnew } from '../core/xnew';

export function ModalFrame(frame: xnew.Unit, 
    { className, style, duration = 200, easing = 'ease' }: { className?: string, style?: Partial<CSSStyleDeclaration>, duration?: number, easing?: string } = {}
) {
    xnew.context('xnew.modalframe', frame);
    const div = xnew.nest('<div style="position: fixed; inset: 0; opacity: 0;">', { className, style });

    let content: xnew.Unit | null = null;

    xnew().on('click', (event: Event) => {
        if (div === event.target) {
            frame.close();
        }
    });
    xnew.timeout(() => frame.open());
    return {
        set content(unit: xnew.Unit) {
            content = unit;
        },
        get content() : xnew.Unit | null {
            return content;
        },
        open() {
            xnew.transition((x: number) => div.style.opacity = x.toString(), duration, easing);
        },
        close() {
            xnew.transition((x: number) => div.style.opacity = (1.0 - x).toString(), duration, easing).next(() => frame.finalize());
        }
    }
}

export function ModalContent(content: xnew.Unit,
    { className, style }: { className?: string, style?: Partial<CSSStyleDeclaration> } = {}
) {
    const frame = xnew.context('xnew.modalframe');
    frame.content = content;

    xnew.nest('<div style="position: absolute; inset: 0; margin: auto; width: max-content; height: max-content;">');
    xnew.nest('<div>', { className, style });
}
