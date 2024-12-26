---
sidebar_position: 6
---

# xnew.off
`xnew.off` unset event listeners.

```js
xnew.off();                 // clear all events
xnew.off(type);             // clear events (named type)
xnew.off(type, callback);   // clear the callback event

xnode.off();                // clear all events
xnode.off(type);            // clear events (named type)
xnode.off(type, callback);  // clear the callback event
```

## example
```js
xnew(() => {
  xnew.on('click', (event) => {
    // fires when the xnode's element is clicked.
  });

  xnew.off('click');
});

```
