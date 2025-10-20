import { xnew } from '../core/xnew';

export function TabFrame(frame: xnew.Unit, 
    { select = 0 } = {}
) {
    xnew.context('xnew.tabframe', frame);

    const tabs: xnew.Unit[] = [];
    const contents: xnew.Unit[] = [];
    
    const timeout = xnew.timeout(() => frame.select(select));
    return {
        get tabs() {
            return tabs;
        },
        get contents() {
            return contents;
        },
        select(index: number) {
            timeout.clear();
            const tab = tabs[index];
            const content = contents[index];
            tabs.filter((item: xnew.Unit) => item !== tab).forEach((item: xnew.Unit) => item.deselect());
            contents.filter((item: xnew.Unit) => item !== content).forEach((item: xnew.Unit) => item.deselect());
            tab.select();
            content.select();
        }
    }
}
export function TabButton(self: xnew.Unit, 
    {}: {} = {}
) {
    const frame = xnew.context('xnew.tabframe');
    frame.tabs.push(self);

    xnew.nest('<div>');

    self.on('click', () => {
        frame.select(frame.tabs.indexOf(self));
    });
    return {
        select() {
            Object.assign(self.element.style, { opacity: 1.0, cursor: 'text' });
        },
        deselect() {
            Object.assign(self.element.style, { opacity: 0.6, cursor: 'pointer' });
        }
    }
}

export function TabContent(self: xnew.Unit,
    { className, style }: { className?: string, style?: Partial<CSSStyleDeclaration> } = {}
) {
    const frame = xnew.context('xnew.tabframe');
    frame.contents.push(self);

    xnew.nest('<div>', { className, style });

    return {
        select() {
            Object.assign(self.element.style, { display: 'block' });
        },
        deselect() {
            Object.assign(self.element.style, { display: 'none' });
        }
    }
}