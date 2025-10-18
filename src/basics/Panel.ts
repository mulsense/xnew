import { xnew } from '../core/xnew';
import { BulletArrow } from './Bullet';

export function Panel(self: xnew.Unit, { name }: { name: string } ) {
    xnew.nest('<div style="overflow: hidden; padding: 4px; user-select: none;">');
    xnew('<div style="margin: 4px;">', name)
}

export function PanelGroup(group: xnew.Unit, { name = 'group', open = false }: { name?: string; open?: boolean } = {}) {
    xnew.nest('<div>');
    let isOpen = open;
    xnew('<div style="margin: 4px; cursor: pointer;">', (self: xnew.Unit) => {
        const arrow = xnew(BulletArrow, { rotate: isOpen ? 90 : 0 });
        const span = xnew('<span>', name);
        self.on('click', () => {
            isOpen = !isOpen;
            group.toggle();
            arrow.rotate(isOpen ? 90 : 0);
        });
        self.on('mouseenter', () => {
            span.element.style.opacity = '0.7';
        });
        self.on('mouseleave', () => {
            span.element.style.opacity = '1.0';
        });
    })

    xnew.extend(xnew.Accordion, { open });
} 