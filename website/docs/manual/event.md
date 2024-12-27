---
sidebar_position: 20
---

# event listener
You can set some event listener using `unit.on`.

# unit.on
this method set a event listener.
```js
unit.on(type, listener);
```

# unit.off
this method unset event listeners.

```js
unit.off();                // clear all events
unit.off(type);            // clear events (named type)
unit.off(type, callback);  // clear the callback event
```

### `unit.emit`
This method emit a event.
```js
unit.emit(type, ...args);
```

## example

### html event
```html
<div id="target"></div>
<script>
  const unit = xnew('#target', Component);
  
  function Component() {
    xnew.on('click', (event) => {
      // fires when the unit's element (id = target) is clicked.
    });
  });

  unit.on('click', (event) => {
    // fires when the unit's element (id = target) is clicked.
  });
</script>
```

### original event
```html
<div id="target"></div>
<script>
  const unit = xnew('#target', Component);
  
  function Component() {
    xnew.on('myevent', (data) => {
      // fires when unit.emit('myevent', data) is called.
    });
  });

  unit.on('myevent', (data) => {
    // fires when the unit's element (id = target) is clicked.
  });

  const data = {};
  unit.emit('myevent', data);
</script>
```


### broadcast
If you add `~` token, `unit.emit` broadcasts to all units.  
```js
xnew(() => {
  const unit1 = xnew.current;
  unit1.on('~myevent', () => {
    //
  });
});

xnew(() => {
  const unit2 = xnew.current;
  unit2.emit('~myevent'); // broadcast event
});

```