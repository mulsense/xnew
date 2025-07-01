# xnew.timeout

`xnew.timeout` creates a timer that executes a callback function after a specified delay. The callback function is executed within the current `xnew` scope, ensuring that it has access to the same context as other `xnew` operations.

```js
xnew.timeout(callback, delay);
```

## Example

```js
xnew((self) => {
  const timeout = xnew.timeout(() => {
    // This function is called after 100 ms within the current xnew scope.
  }, 100);

  // To cancel the timeout, call the following:
  // timeout.clear();
});
```

:::tip
If the parent unit is finalized, the timer is automatically cleared. Additionally, the callback function provided to `xnew.timeout` will always execute within the current `xnew` scope.
:::
