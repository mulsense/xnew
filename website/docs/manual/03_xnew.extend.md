# xnew.extend
`xnew.extend` allows you to extend a component function by combining it with another one.

```js
xnew.extend(component, ...args);
```

## Example

Here is an example demonstrating how to use `xnew.extend`:

```js
// Base component function
function Base(self) {
  self.on('update', () => {
    console.log('base update');
  });

  return {
    hoge() {
      console.log('base hoge');
    },
  };
}
```

```js
// Derived component using xnew.extend
const unit = xnew((self) => {
  xnew.extend(Base); // Extend the current component with the Base component

  self.on('update', () => {
    console.log('derived update');
  });

  return {
    hoge() {
      console.log('derived hoge');
    },
  };
});

// Call the 'hoge' method from the Base component
unit.hoge(); // Output: derived hoge

// Call the 'update' methods
// Output:
// base update
// derived update

// ... update loop
```

