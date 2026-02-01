import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
export function TextStream(unit: Unit, { text = '', speed = 50, fade = 300 }: { text?: string, speed?: number, fade?: number } = {}) {
    const chars: Unit[] = [];

    for (let i = 0; i < text.length; i++) {
        const unit = xnew('<span>');
        unit.element.textContent = text[i];
        unit.element.style.opacity = '0';
        unit.element.style.transition = `opacity ${fade}ms ease-in-out`;
        chars.push(unit);
    }

    let start = 0;
    unit.on('start', () => {
        start = new Date().getTime();
    });

    let state = 0;
    unit.on('update', () => {
        const index = Math.floor((new Date().getTime() - start) / speed);

        // Display characters up to the current index (fade in)
        for (let i = 0; i < chars.length; i++) {
            if (i <= index) {
                chars[i].element.style.opacity = '1';
            }
        }
        if (state === 0 && index >= text.length) {
            action();
        }
    });
    xnew.timeout(() => {
        xnew(document.body).on('click wheel', action);
        unit.on('keydown', action);
    }, 100);

    function action() {
        if (state === 0) {
            state = 1;
            for (let i = 0; i < chars.length; i++) {
                chars[i].element.style.opacity = '1';
            }
            xnew.emit('-complete');
        } else if (state === 1) {
            state = 2;
            xnew.emit('-next');
        }
    }

}