(function (factory) {
    typeof define === 'function' && define.amd ? define(factory) :
    factory();
})((function () { 'use strict';

    Object.defineProperty(exports, "__esModule", { value: true });
    const tslib_1 = require("tslib");
    const xnew_1 = tslib_1.__importDefault(require("xnew"));
    (0, xnew_1.default)('#main', (self) => {
        (0, xnew_1.default)(Div1);
        (0, xnew_1.default)(Div2);
        (0, xnew_1.default)(Div3);
        (0, xnew_1.default)(Div4);
    });
    function Base(self, name) {
        xnew_1.default.nest({ style: { margin: '8px', padding: '8px', border: 'solid 1px #222' } });
        (0, xnew_1.default)({ tagName: 'p' }, name);
    }
    function Div1(self) {
        xnew_1.default.extend(Base, 'my div');
        (0, xnew_1.default)({ style: { display: 'flex' } }, () => {
            (0, xnew_1.default)({ style: { width: '160px', height: '36px', background: '#d66' } }, '1');
            (0, xnew_1.default)({ style: { width: '160px', height: '36px', background: '#6d6' } }, '2');
            (0, xnew_1.default)({ style: { width: '160px', height: '36px', background: '#66d' } }, '3');
        });
    }
    function Div2(self) {
        xnew_1.default.extend(Base, 'my button');
        const button = (0, xnew_1.default)({ tagName: 'button' }, 'click me');
        let count = 0;
        button.on('click', () => {
            button.element.textContent = `count: ${count++}`;
        });
    }
    function Div3(self) {
        xnew_1.default.extend(Base, 'my input text');
        const input = (0, xnew_1.default)({ tagName: 'input', type: 'text' });
        const span = (0, xnew_1.default)({ tagName: 'span', style: { margin: '0 8px' } });
        input.on('change input', () => {
            span.element.textContent = input.element.value;
        });
    }
    function Div4(self) {
        xnew_1.default.extend(Base, 'my select');
        const select = (0, xnew_1.default)({ tagName: 'select' }, () => {
            (0, xnew_1.default)({ tagName: 'option', value: 'one' }, 'one');
            (0, xnew_1.default)({ tagName: 'option', value: 'two' }, 'two');
            (0, xnew_1.default)({ tagName: 'option', value: 'three' }, 'three');
        });
        const text = (0, xnew_1.default)({ tagName: 'span', style: { margin: '0 8px' } }, 'one');
        select.on('change', (event) => {
            text.element.textContent = event.target.value;
        });
    }

}));
