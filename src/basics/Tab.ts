import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

export function TabFrame(frame: Unit, 
    { select }: { select?: string } = {}
) {
    const internal = xnew((internal: Unit) => {
        const buttons = new Map<string, Unit>();
        const contents = new Map<string, Unit>();
        return { frame, buttons, contents };
    });
    xnew.context('xnew.tabframe', internal);

    xnew.timeout(() => internal.emit('-select', { key: select ?? [...internal.buttons.keys()][0] }));
}

export function TabButton(button: Unit, 
    { key }: { key?: string } = {}
) {
    const internal = xnew.context('xnew.tabframe');

    const div = xnew.nest('<div>');

    key = key ?? (internal.buttons.size).toString();
    internal.buttons.set(key, button);

    button.on('click', () => {
        internal.emit('-select', { key });
    });
    internal.on('-select', ({ key } : { key: string }) => {
        const select = internal.buttons.get(key);
        if (select === button) {
            button.select({ element: div });
        } else {
            button.deselect({ element: div });
        }
    });
    return {
        select({ element }: { element: HTMLElement }) {
            Object.assign(element.style, { opacity: 1.0, cursor: 'text' });
        },
        deselect({ element }: { element: HTMLElement }) {
            Object.assign(element.style, { opacity: 0.6, cursor: 'pointer' });
        }
    }
}

export function TabContent(content: Unit,
    { key }: { key?: string } = {}
) {
    const internal = xnew.context('xnew.tabframe');

    const div = xnew.nest('<div style="display: none;">');

    key = key ?? (internal.contents.size).toString();
    internal.contents.set(key, content);

    internal.on('-select', ({ key } : { key: string }) => {
        const select = internal.contents.get(key);
        if (select === content) {
            content.select({ element: div });
        } else {
            content.deselect({ element: div });
        }
    });
    return {
        select({ element }: { element: HTMLElement }) {
            Object.assign(element.style, { display: 'block' });
        },
        deselect({ element }: { element: HTMLElement }) {
            Object.assign(element.style, { display: 'none' });
        }
    }
}