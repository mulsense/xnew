import { xnew } from '../core/xnew';
import { AccordionFrame, AccordionButton, AccordionBullet, AccordionContent } from './Accordion';

export function PanelFrame(frame: xnew.Unit) {
    xnew.context('xnew.panelframe', frame);
}

export function PanelGroup(group: xnew.Unit,
    { name, open = false }: { name?: string; open?: boolean } = {}
) {
    xnew.extend(AccordionFrame);

    xnew((button: xnew.Unit) => {
        xnew.nest('<div style="margin: 0.2em 0;">');
        xnew.extend(AccordionButton);
        xnew(AccordionBullet);
        xnew('<div>', name);
    });

    xnew.extend(AccordionContent, { open });
}
