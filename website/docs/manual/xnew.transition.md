---
sidebar_position: 5
---

# xnew.transition
`xnew.transition` execute repetitive processing for a specified period of time.

```js
xnew.transition(callback, interval);
```
## example

```js
xnew((self) => {
  const transition = xnew.transition(({ progress }) => {
    // this variable ({ progress }) transitions from 0.0 to 1.0 in 5000[ms].

  }, 5000);

  // If you cancel the transition, call bellow.
  // transition.clear();
});

```
:::tip
If the parent unit finalize, the transition is automatically cleared.
:::
