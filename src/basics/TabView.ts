import { xnew } from '../core/xnew';

export function TabView(self: xnew.Unit, { select = 0, duration = 200, easing = 'ease' } = {}) {
    xnew.context('xnew.tabview', self);
   
    const tabs: xnew.Unit[] = [];
    const contents: xnew.Unit[] = [];
    
    const timer = xnew.timeout(() => {
        self.select(0);
    });
    return {
        tabs,
        contents,
        select(index: number) {
            timer.clear();
            const tab = tabs[index];
            const content = contents[index];
            tabs.filter((item: xnew.Unit) => item !== tab).forEach((item: xnew.Unit) => item.deselect());
            contents.filter((item: xnew.Unit) => item !== content).forEach((item: xnew.Unit) => item.deselect());
            tab.select();
            content.select();
        }
    }
}
export function TabButton(self: xnew.Unit) {
    xnew.nest('<div>');
    const tabview = xnew.context('xnew.tabview');
    tabview.tabs.push(self);

    self.on('click', () => {
        tabview.select(tabview.tabs.indexOf(self));
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

export function TabContent(self: xnew.Unit) {
    xnew.nest('<div>');
    const tabview = xnew.context('xnew.tabview');
    tabview.contents.push(self);

    return {
        select() {
            Object.assign(self.element.style, { display: 'block' });
        },
        deselect() {
            Object.assign(self.element.style, { display: 'none' });
        }
    }
}