---
sidebar_position: 7
---

# xnew.emit
`xnew.on` set a event listener.

```js
xnew.find(Component); // component function
```
## eample
```js
const xnode = xnew(() => {
  const xnode = xnew.current;
  xnode.on('click', (event) => {
    // fires when the xnode's element is clicked.
  });

  // original event
  xnode.on('myevent', (data) => {
    // fires when xnode.emit('myevent', data) is called.
  });

  // xnode.off(); // unset all listeners in the xnode
  // xnode.off('myevent'); // unset 'myevent'
});

const data = {};
xnode.emit('myevent', data); 
```
### `xnode.on`
This method set a event listener.
```js
xnode.on(type, callback);
```
### `xnode.off`
This method remove event listeners.
```js
xnode.off();                // clear all events
xnode.off(type);            // clear events (named type)
xnode.off(type, callback);  // clear the callback event
```
### `xnode.emit`
This method emit a event.
```js
xnode.emit(type, ...args);
```
### broadcast
If you add `~` token, `xnode.emit` broadcasts to all xnodes.  
```js
xnew(() => {
  const xnode1 = xnew.current;
  xnode1.on('~myevent', () => {
    //
  });
});

xnew(() => {
  const xnode2 = xnew.current;
  xnode2.emit('~myevent'); // broadcast event
});

```

