import { xnew } from '../core/xnew';
import { AccordionFrame, AccordionButton, AccordionContent } from './Accordion';

export function PanelFrame(frame: xnew.Unit) {
    xnew.context('xnew.panelframe', frame);
}

export function PanelGroup(group: xnew.Unit,
    { className, style, name, open = false }: { className?: string, style?: Partial<CSSStyleDeclaration>, name?: string; open?: boolean } = {}
) {
    xnew.context('xnew.panelgroup', group);

    xnew.extend(AccordionFrame, { className, style });

    xnew((button: xnew.Unit) => {
        xnew.extend(AccordionButton);
        xnew.nest('<div style="margin: 0.2em; cursor: pointer">');
        const arrow = xnew(BulletArrow, { rotate: open ? 90 : 0 });
        xnew('<span style="margin-left: 0.4em;">', name);
        group.on('-open', () => arrow.rotate(90));
        group.on('-close', () => arrow.rotate(0));
        button.on('mouseenter', () => button.element.style.opacity = '0.7');
        button.on('mouseleave', () => button.element.style.opacity = '1.0');
    });

    xnew.extend(AccordionContent, { open });
}

function BulletArrow(self: xnew.Unit,
    { rotate = 0 }: { rotate?: number; color?: string } = {}
) {
    const arrow = xnew(`<div style="display:inline-block; width: 0.5em; height: 0.5em; border-right: 0.12em solid currentColor; border-bottom: 0.12em solid currentColor; box-sizing: border-box; transform-origin: center center;">`);

    arrow.element.style.transform = `rotate(${rotate - 45}deg)`;

    return {
        rotate(rotate: number, transition: number = 200, easing: string = 'ease') {
            arrow.element.style.transition = `transform ${transition}ms ${easing}`;
            arrow.element.style.transform = `rotate(${rotate - 45}deg)`;
        }
    }
}