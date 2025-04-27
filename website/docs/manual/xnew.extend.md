---
sidebar_position: 103
---

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
  return {
    update() {
      console.log('base update');
    },
    hoge() {
      console.log('base hoge');
    },
  };
}
```

```js
// Derived component using xnew.extend
const unit = xnew((self) => {
  // Extend the current component with the Base component
  xnew.extend(Base);

  return {
    update() {
      console.log('derived update');
    },
    // Uncommenting the following will override the base 'hoge' method
    // hoge() {
    //   console.log('derived hoge');
    // },
  };
});

// Call the 'hoge' method from the Base component
unit.hoge(); // Output: base hoge

// Call the 'update' methods
// Output:
// base update
// derived update

// ... update loop
```

:::tip
If system properties (`promise`, `start`, `update`, `stop`, `finalize`) are defined in both component functions, they are automatically merged.
:::
