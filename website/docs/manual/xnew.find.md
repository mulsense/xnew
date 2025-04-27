---
sidebar_position: 205
---

# xnew.find

`xnew.find` retrieves all units created using a specific component function.

```js
xnew.find(Component); // Pass the component function as an argument
```

## Example

The following demonstrates how `xnew.find` works:

```js
// Create two units using the same component function
const unit1 = xnew(Component);
const unit2 = xnew(Component);

// Retrieve all units created with the Component function
const units = xnew.find(Component); // [unit1, unit2]
console.log(units);

function Component(self) {
  // Component logic here
}
```
