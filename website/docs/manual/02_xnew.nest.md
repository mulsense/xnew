# xnew.nest

`xnew.nest` creates a new html element and the following elements are nested.

```js
xnew((self) => {
  const element = xnew.nest(html);

  element; // Access the new element
})
```

## Example
```js
xnew('<div id="A">', (self) =>{
  self.element; // div A

  xnew('<p>', 'in A');
});

xnew((self) => {
  const div = xnew.nest('<div id="B">');

  self.element; // div A
  div; // div B

  xnew('<p>', 'in B');
}

xnew('<div id="C">', (self) => {
  const div = xnew.nest('<div id="D">');

  self.element; // div C
  div; // div D

  xnew('<p>', 'in D');
}

const unit = xnew('<div id="E">', 'in E');
unit.element; // div E

```

The above code produces the following HTML structure:
```html
<body>
  <div id="A">
    <p>in A</p>
  </div>
  <div id="B">
    <p>in B</p>
  </div>
  <div id="C">
    <div id="D">
      <p>in D</p>
    </div>
  </div>
  <div id="E">
    in E
  </div>
</body>
```

:::note
The created elements are automatically removed when the units are finalized.
:::
