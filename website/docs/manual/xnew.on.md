---
sidebar_position: 5
---

# xnew.on
`xnew.on` set a event listener.

```js
xnew.on(type, listener);

xnode.on(type, listener);
```

## example

### html event
```html
<div id="target"></div>
<script>
  const xnode = xnew('#target', Component);
  
  function Component() {
    xnew.on('click', (event) => {
      // fires when the xnode's element (id = target) is clicked.
    });
  });

  xnode.on('click', (event) => {
    // fires when the xnode's element (id = target) is clicked.
  });
</script>
```

### original event
```html
<div id="target"></div>
<script>
  const xnode = xnew('#target', Component);
  
  function Component() {
    xnew.on('myevent', (data) => {
      // fires when xnode.emit('myevent', data) is called.
    });
  });

  xnode.on('myevent', (data) => {
    // fires when the xnode's element (id = target) is clicked.
  });

  const data = {};
  xnode.emit('myevent', data);
</script>
```