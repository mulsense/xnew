import { xnew } from '../core/xnew';

export function Accordion(self: xnew.Unit, isOpen = true, duration = 200, easing = 'ease') {
    const outer = xnew.nest({ style: { display: isOpen ? 'block' : 'none', overflow: 'hidden', }});
    const inner = xnew.nest({ style: { padding: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' } });
     
    let transition = false;
    return {
        open() {
            if (transition === false) {
                transition = true;
                isOpen = true;
                outer.style.display = 'block';
                xnew.transition((progress: number) => {
                    outer.style.height = inner.offsetHeight * progress + 'px';
                    outer.style.opacity = progress;
                    if (progress === 1) {
                        outer.style.height = 'auto';
                        transition = false;
                    }
                }, duration, easing);
            }
        },
        close() {
            if (transition === false) {
                transition = true;
                xnew.transition((progress: number) => {
                    outer.style.height = inner.offsetHeight * (1 - progress) + 'px';
                    outer.style.opacity = 1 - progress;
                    if (progress === 1) {
                        isOpen = false;
                        outer.style.display = 'none';
                        outer.style.height = '0px';
                        transition = false;
                    }
                }, duration, easing);
            }
        },
        toggle() {
            isOpen ? self.close() : self.open();
        },
    };
}

