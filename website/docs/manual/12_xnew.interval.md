# xnew.interval

`xnew.interval` creates an interval function that repeatedly calls a callback function at a specified time interval. The callback function is executed within the current `xnew` scope, ensuring it operates in the same context as other `xnew` operations.

```js
xnew.interval(callback, delay);
```

## Example

```js
xnew((self) => {
  const interval = xnew.interval(() => {
    // This function is called at 100 ms intervals within the current xnew scope.
  }, 100);

  // If you cancel the interval, call the following:
  // interval.clear();
});
```

:::tip
If the parent unit is finalized, the interval is automatically cleared. Additionally, the callback function provided to `xnew.interval` will always execute within the current `xnew` scope.
:::
