import { xnew } from '../core/xnew';

export function InputFrame(frame: xnew.Unit,
    { className, style }: { className?: string, style?: Partial<CSSStyleDeclaration> } = {}
) {
    xnew.context('xnew.inputframe', frame);

    xnew.nest('<div>', { className, style });
    let status: xnew.Unit | null = null;
    xnew('<div>', (self: xnew.Unit) => {
        status = xnew('<div style="font-size: 0.8em; display: flex; flex-direction: row; justify-content: space-between;">');
    });
 
    let input: xnew.Unit | null = null;
    return {
        set input(unit: xnew.Unit) {
            input = unit;
        },
        get input(): xnew.Unit | null {
            return input;
        },
        reset() {
            status?.reboot();
            xnew(status?.element, (self: xnew.Unit) => {
                const element = input?.element as HTMLInputElement;
                console.log('update', element)
                xnew('<div style="flex: auto">', element.name ?? '');
                // if (element.type === 'range') {
                //     const div = xnew('<div style="flex: none">', element.value?.toString() ?? '0' );
                //     xnew.listener(element).on('input change', (event: Event) => {
                //         div.element.textContent = element.value;
                //     });
                // }
            });
        }
    }
}

export function InputRange(input: xnew.Unit,
    attributes: any = {}
) {
    const frame = xnew.context('xnew.inputframe');
    if (frame) {
        frame.input = input;
    }

    xnew.nest('<input type="range"">', attributes);
    frame.reset();
}

export function InputText(self: xnew.Unit,
    { className, style, label, name, value }: { className?: string, style?: Partial<CSSStyleDeclaration>, name?: string; label?: string; min?: number; max?: number; step?: number; value?: number; } = {}
) {
    xnew.nest('<div>');

    xnew('<div style="font-size: 0.8em; display: flex; flex-direction: row; justify-content: space-between;">', () => {
        xnew('<div style="flex: auto">', name ?? '');
    });
    xnew.nest('<input type="text"">', { className, style, value });

}
