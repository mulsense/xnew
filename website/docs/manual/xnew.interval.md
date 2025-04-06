---
sidebar_position: 5
---

# xnew.interval
`xnew.interval` create a interval function that repeatedly call a callback function for a specified time.

```js
xnew.interval(callback, delay);
```
## example

```js
xnew((self) => {
  const interval = xnew.interval(() => {
    // This function is called at 100 ms intervals.
  }, 100);

  // If you cancel the interval, call bellow.
  // interval.clear();
});

```
:::tip
If the parent unit finalize, the interval is automatically cleared.
:::
