# xnew.transition

`xnew.transition` executes repetitive processing for a specified period of time. The callback function is executed within the current `xnew` scope, ensuring it operates in the same context as other `xnew` operations.

```js
xnew.transition(callback, delay);
```

## Example

```js
xnew((self) => {
  const transition = xnew.transition((progress) => {
    // This variable (progress) transitions from 0.0 to 1.0 in 5000[ms].
    // The callback is executed within the current xnew scope.
  }, 5000);

  // If you cancel the transition, call the following:
  // transition.clear();
});
```

:::tip
If the parent unit is finalized, the transition is automatically cleared. Additionally, the callback function provided to `xnew.transition` will always execute within the current `xnew` scope.
:::
