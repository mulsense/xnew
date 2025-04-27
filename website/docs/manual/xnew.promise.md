---
sidebar_position: 206
---

# xnew.promise

The `xnew.promise` function allows you to handle asynchronous operations within the current `xnew` scope. Unlike a standard `Promise`, where the `then` or `catch` handlers execute independently of the `xnew` scope, using `xnew.promise` ensures that these handlers are executed within the current `xnew` context.

```js
xnew.promise(promise);
```

## Example

The following example demonstrates how `xnew.promise` integrates a `Promise` into the `xnew` scope:

```js
xnew((self) => {
  xnew.promise(new Promise((resolve, reject) => {
    xnew.timer(() => resolve(1), 1000); // Simulate a delay of 1 second
  }))
  .then((result) => {
    console.log(result); // 1
    // This `then` block runs within the current `xnew` scope
  })
  .catch((error) => {
    console.error(error);
    // This `catch` block also runs within the current `xnew` scope
  });
});
```
