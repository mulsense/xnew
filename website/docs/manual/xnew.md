---
sidebar_position: 1
---

# xnew
How `xnew` works makes component-oriented programming easier.

## basic usage
### arguments
As shown below, `xnew` accepts some arguments.
```js
// target:    1. [an existing html element] or 
//            2. [attributes to create a html element]  
// Component: 1. [an component function] or 
//            2. [an inner html for the created html element]  
// ...args:   1. [arguments for the component function]
const unit = xnew(target, component, ...args);
```

These arguments are often omitted.  
```js
xnew(Component, ...args);           // target is omitted
xnew(target);                       // component is omitted
xnew();                             // ...
```

### component
First, let's set a component function to `xnew`.  
In the function, you will implement various features.  

```js
const unit = xnew(Component, ...args);    

function Component(self, ...args) {
  // ...
  // implement features
}
```

You can also use a arrow function.  `xnew((self) => {});`
```js
const unit = xnew((self) => {
  // ...
  // implement features
});
```
### target
`target` is set for the html element of the new unit. The element is accessed by `unit.element`.

#### Setting an existing html element  
```html
<body>
  <div id="hoge"></div>
  <script>
    xnew('#hoge', (self) => {

      self.element; // element (id = hoge)
    });
  </script>
</body>
```
:::note Setting variations
- `xnew('#hoge', ...)` string
- `xnew(document.querySelector('#hoge'), ...)` HTMLElement
- `xnew(window, ...)` Document
- `xnew(document, ...)` Windwow
:::

#### Creating a new html element   
```html
<body>
  <script>
    xnew({ tagName: 'div', id: 'hoge' }, (self) => {
      
      self.element; // element (id = hoge)
    });
  </script>
</body>
```

:::note Setting variations
- `xnew({ tagName: 'div', className: 'aaa', style: 'bbb', }, ...)`  
:::

If you omit the tagName property, `tagName: 'div'` will be set automatically.  

If you omit the `element` parameter, the parent unit's element or otherwise parent element of current scope is assigned. 
    
```html
<div id="hoge"></div>

<script>
  xnew((self) => {
    // self.element: document.body
  });

  xnew('#hoge', (self) => {
    // self.element: (id=hoge)

    xnew((self) => {
      // self.element: (id=hoge)
    });

    xnew({ tagName: 'div', id: 'fuga' }, (self) => {
      // self.element: (id=fuga) (as a child element of hoge)
    });
  });
</script>

<div id="parent">
  <script>
    xnew((self) => {
      // self.element: (id=parent)
    });
  </script>
</div>
```

### innerHTML
If you set string as `Compoennt`, innerHTML will be added in a created element.
```js
xnew({ tagName: 'p', id: 'hoge' }, 'aaa');
```
```html
<body>
  <p id="hoge">aaa</p>
</body>
```

## system properties
`unit` has some system properties for basic control.  
You can define the detail in the response of the component function.

```js
const unit = xnew((self) => {
  // initialize

  return {
    start() {
      // fires before first update.
    },
    update(count) {
      // executed repeatedly at the rate available for rendering.
    },
    stop() {
      // fires when unit.stop() is called.
    },
    finalize() {
      // fires when unit.finalize() is called.
      // note that it is also called automatically when the parent unit finalizes.
    },
  }
});

```

### `unit.start`
This method start update loop. units automatically calls `unit.start()`.  
If you want to avoid it, call `unit.stop()` inside the component function.  
```js
unit.start();
```

### `unit.stop`
This method stop update loop.
```js
unit.stop();
```

### `unit.finalize`
This method finalize the unit and the children.  
Related elements will be deleted and update processing will also stop.
```js
unit.finalize();
```

### `unit.reboot`
This method reboot the unit using the component function. 
```js
unit.reboot();
```

### calling order
`start`, `update`, `stop`, `finalize`, these methods have a calling order.  
The parent unit method is called after the children unit method is called.

```js
const parent = xnew(Patent);

function Parent(self) {
  xnew(Child1);
  xnew(Child2);

  return {
    start() { console.log('Parent start'); },
    update() { console.log('Parent update'); },
    stop() { console.log('Parent stop'); },
    finalize() { console.log('Parent finalize'); },
  }
}

function Child1(self) {
  return {
    start() { console.log('Child1 start'); },
    update() { console.log('Child1 update'); },
    stop() { console.log('Child1 stop'); },
    finalize() { console.log('Child1 finalize'); },
  }
}

function Child2(self) {
  return {
    start() { console.log('Child2 start'); },
    update() { console.log('Child2 update'); },
    stop() { console.log('Child2 stop'); },
    finalize() { console.log('Child2 finalize'); },
  }
}
```

```js
// Child1 start
// Child2 start
// Parent start

// Child1 update
// Child2 update
// Parent update

// ... update loop

parent.stop();
// Child1 stop
// Child2 stop
// Parent stop

parent.finalize();
// Child1 finalize
// Child2 finalize
// Parent finalize
```

## original properties
You can define original properties unless the properties are already defined.  
The following names are not available.
- `start`, `update`, `stop`, `finalize`, `reboot`, `element`, `on`, `off`, `_`

```js
const unit = xnew((self) =>  {
  let count = 0;

  return {
    countup () {
      count++;
    },
    set count(value) { // setter
      count = value;
    },
    get count() { // getter
      return count;
    }
  }
});

unit.countup();       // 0 -> 1
unit.count = 2;       // setter
const x = unit.count; // getter
```

## event listener
You can set a event listener using `unit.on`, and remove it using `unit.off`.

### `unit.on`
This method set a event listener.
```js
unit.on(type, listener);
```

### `unit.off`
This method unset event listeners.

```js
unit.off();                // clear all listeners
unit.off(type);            // clear the listeners (named type)
unit.off(type, listener);  // clear the listener (named type)
```

```js
xnew.emit(type, ...args);
```

### html event
```html
<div id="target"></div>
<script>
  const unit = xnew('#target', Component);
  
  function Component(self) {
    self.on('click', (event) => {
      // fires when the unit's element (id = target) is clicked.
    });
  });

  unit.on('click', (event) => {
    // fires when the unit's element (id = target) is clicked.
  });
</script>
```

### original event
#### from anywhere
If you set a listener using `+` token, the listener can recieve a event from anywhere.

```js
xnew(() => {
  xnew((self) => {
    self.on('+myevent', () => {
      //
    });
  });

  xnew((self) => {
    xnew.emit('+myevent'); // emit event
  });
});
```

#### from internal
If you set a listener using `-` token,
the listener can only recieve a event from within the component function.

```html
<div id="target"></div>
<script>
  const unit = xnew('#target', Component);

  unit.on('-myevent', (data) => {
    // fires when xnew.emit('-myevent', data) is called.
  });

  function Component(self) {
    xnew.timer(() => {
      const data = {};
      xnew.emit('-myevent', data);
    }, 1000)
  });

</script>
```

