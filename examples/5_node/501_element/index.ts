import xnew from 'xnew'

xnew('#main', (self: xnew.Unit) => {
    xnew(Div1);
    xnew(Div2);
    xnew(Div3);
    xnew(Div4);
});

function Base(self: xnew.Unit, name: string) {
    xnew.nest({ style: { margin: '8px', padding: '8px', border: 'solid 1px #222' } });
    xnew({ tagName: 'p' }, name);
}

function Div1(self: xnew.Unit) {
    xnew.extend(Base, 'my div');

    xnew({ style: { display: 'flex' } }, () => {
        xnew({ style: { width: '160px', height: '36px', background: '#d66' } }, '1');
        xnew({ style: { width: '160px', height: '36px', background: '#6d6' } }, '2');
        xnew({ style: { width: '160px', height: '36px', background: '#66d' } }, '3');
    });
}

function Div2(self: xnew.Unit) {
    xnew.extend(Base, 'my button');

    const button = xnew({ tagName: 'button' }, 'click me');

    let count = 0;
    button.on('click', () => {
        button.element.textContent = `count: ${count++}`;
    })
}

function Div3(self: xnew.Unit) {
    xnew.extend(Base, 'my input text');

    const input = xnew({ tagName: 'input', type: 'text' });
    const span = xnew({ tagName: 'span', style: { margin: '0 8px' } });

    input.on('change input', () => {
        span.element.textContent = input.element.value;
    })
}

function Div4(self: xnew.Unit) {
    xnew.extend(Base, 'my select');

    const select = xnew({ tagName: 'select' }, () => {
        xnew({ tagName: 'option', value: 'one' }, 'one');
        xnew({ tagName: 'option', value: 'two' }, 'two');
        xnew({ tagName: 'option', value: 'three' }, 'three');
    });

    const text = xnew({ tagName: 'span', style: { margin: '0 8px' } }, 'one');

    select.on('change', (event: any) => {
        text.element.textContent = event.target.value;
    });
}