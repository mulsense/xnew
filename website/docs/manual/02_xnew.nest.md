# xnew.nest

`xnew.nest` creates a new HTML element inside the current element and makes it the new target for subsequent child elements.

## Basic Usage

```js
xnew((self) => {
  const element = xnew.nest('<div>');

  element; // Access the newly created element
  self.element === element; // true - self.element now points to the nested element
})
```

## How `self.element` Changes with `xnew.nest`

When you call `xnew.nest()`, it changes what `self.element` refers to:

```js
const unit = xnew('<div id="A">', (self) => {
  self.element; // div#A

  self.on('click', () => {
    self.element; // div#A (captured at this point)
  });

  xnew.nest('<div id="B">');
  self.element; // div#B (now points to the nested element)

  self.on('click', () => {
    self.element; // div#B (captured at this new point)
  });

  const child = xnew('<div id="C">');
  child.element; // div#C (child of div#B because B is the current element)
})
```

**Key points:**
- Before `xnew.nest()`: `self.element` points to the parent element (div#A)
- After `xnew.nest('<div id="B">')`: `self.element` changes to point to the nested element (div#B)
- New child elements are created inside the current `self.element`
- Event handlers capture the value of `self.element` at the time they are registered
## Example

### Without `xnew.nest`

```js
// Case 1: Create div#A and add a paragraph inside it
xnew('<div id="A">', (self) => {
  self.element; // div#A

  xnew('<p>', 'in A'); // Creates <p> inside div#A
});

// Result: <div id="A"><p>in A</p></div>
```

### With `xnew.nest`

```js
// Case 2: Using nest changes the target element
xnew((self) => {
  const div = xnew.nest('<div id="B">');

  self.element; // div#B (changed by nest)
  div; // div#B (same reference)

  xnew('<p>', 'in B'); // Creates <p> inside div#B
});

// Result: <div id="B"><p>in B</p></div>
```

### Nesting Inside an Element

```js
// Case 3: Nesting creates a child element
xnew('<div id="C">', (self) => {
  const div = xnew.nest('<div id="D">');

  self.element; // div#D (changed by nest)
  div; // div#D (same reference)

  xnew('<p>', 'in D'); // Creates <p> inside div#D
});

// Result: <div id="C"><div id="D"><p>in D</p></div></div>
```

### Simple Element Creation

```js
// Case 4: Create element with text content only
const unit = xnew('<div id="E">', 'in E');
unit.element; // div#E

// Result: <div id="E">in E</div>
```

### Final HTML Structure

The above code produces:

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
