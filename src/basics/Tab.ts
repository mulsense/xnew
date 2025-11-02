import { xnew } from '../core/xnew';

export function TabFrame(frame: xnew.Unit, 
    { select = 0 } = {}
) {
    xnew.context('xnew.tabframe', frame);

    const buttons: xnew.Unit[] = [];
    const contents: xnew.Unit[] = [];

    xnew.capture((unit: xnew.Unit) => unit.components.has(TabButton), (unit: xnew.Unit) => {
        buttons.push(unit);
    });
    xnew.capture((unit: xnew.Unit) => unit.components.has(TabContent), (unit: xnew.Unit) => {
        contents.push(unit);
    });
    frame.on('-click', ({ unit } : { unit: xnew.Unit }) => execute(buttons.indexOf(unit)));

    const timeout = xnew.timeout(() => execute(select));

    function execute(index: number) {
        timeout.clear();
        const button = buttons[index];
        const content = contents[index];
        buttons.filter((item: xnew.Unit) => item !== button).forEach((item: xnew.Unit) => item.deselect());
        contents.filter((item: xnew.Unit) => item !== content).forEach((item: xnew.Unit) => item.deselect());
        button.select();
        content.select();
    }
}

export function TabButton(button: xnew.Unit, 
    {}: {} = {}
) {
    const frame = xnew.context('xnew.tabframe');

    xnew.nest('<div>');

    button.on('click', () => frame.emit('-click', { unit: button }));
    return {
        select() {
            Object.assign(button.element.style, { opacity: 1.0, cursor: 'text' });
        },
        deselect() {
            Object.assign(button.element.style, { opacity: 0.6, cursor: 'pointer' });
        }
    }
}

export function TabContent(self: xnew.Unit,
    {}: {} = {}
) {
    const frame = xnew.context('xnew.tabframe');

    xnew.nest('<div>');

    return {
        select() {
            Object.assign(self.element.style, { display: 'block' });
        },
        deselect() {
            Object.assign(self.element.style, { display: 'none' });
        }
    }
}