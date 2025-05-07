# xnew.timer

`xnew.timer` creates a timer that executes a callback function after a specified delay. The callback function is executed within the current `xnew` scope, ensuring that it has access to the same context as other `xnew` operations.

```js
xnew.timer(callback, delay);
```

## Example

```js
xnew((self) => {
  const timer = xnew.timer(() => {
    // This function is called after 100 ms within the current xnew scope.
  }, 100);

  // To cancel the timer, call the following:
  // timer.clear();
});
```

:::tip
If the parent unit is finalized, the timer is automatically cleared. Additionally, the callback function provided to `xnew.timer` will always execute within the current `xnew` scope.
:::
