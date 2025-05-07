import { xnew } from '../core/xnew';

export function Accordion(self, { open = true }, head, body) {
    xnew.nest({ tagName: 'div' });
    const div1 = xnew({});
    const div2 = xnew({});
    xnew(div1, (self) => {
        xnew.extend((self) => {
            return {
                open() {
                    div2.element.style.display = 'block';
                },
                close() {
                    div2.element.style.display = 'none';
                },
            }
        });
        const props = head(self);
        return {
            
        }
    });
    xnew(div2, (self) => {
        const props = body(self);
    });
}

