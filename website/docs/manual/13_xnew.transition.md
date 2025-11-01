# xnew.transition

`xnew.transition` executes repetitive processing for a specified period of time. The callback function is executed within the current `xnew` scope, ensuring it operates in the same context as other `xnew` operations.

```js
xnew.transition(callback, delay, easing);
```
<!-- The default value of delay is 0, and the default value of easing is 'linear'. -->

```js
xnew.transition(callback, delay, easing).next(callback, delay, easing).next ...
```
<!-- You can chain transitions continuously using the next function. -->

## Example

```js
xnew((unit) => {
  const transition = xnew.transition((progress) => {
    // This variable (progress) transitions from 0.0 to 1.0 in 5000[ms].
    // The callback is executed within the current xnew scope.
  }, 5000, 'ease');

  // If you cancel the transition, call the following:
  // transition.clear();
});
```

:::tip
If the parent unit is finalized, the transition is automatically cleared. Additionally, the callback function provided to `xnew.transition` will always execute within the current `xnew` scope.
:::
