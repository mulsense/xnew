# xnew.nest

`xnew.nest` creates a new element as a child of the current element and replaces `unit.element`.

```js
xnew((self) => {
  const element = xnew.nest(attributes);

  self.element; // Access the new element
})
```

## Example
```js
xnew({ tag: 'div', name: 'A'}, (self) =>{
  self.element; // div A
});

xnew((self) => {
  xnew.nest({ tag: 'div', name: 'B' });
  self.element; // div B
}

xnew({ tag: 'div', name: 'C' }, (self) => {
  xnew.nest({ tag: 'div', name: 'D' }); // inner div
  self.element; // div D
}

const unit4 = xnew({ tag: 'div', name: 'E' }, 'aaa');
unit4.element; // div E

```

The above code produces the following HTML structure:
```html
<body>
  <div name="A"></div>
  <div name="B"></div>
  <div name="C">
    <div name="D"></div>
  </div>
  <div name="E">
    aaa
  </div>
</body>
```

:::note
The created elements are automatically removed when the units are finalized.
:::
