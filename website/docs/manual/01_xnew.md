# xnew
`xnew` simplifies component-oriented programming by providing a flexible and intuitive API.

## Basic Usage
### Arguments
`xnew` accepts the following arguments:
```js
// target:    1. [an existing HTML element] or 
//            2. [attributes to create a new HTML element]  
// Component: 1. [a component function] or 
//            2. [innerHTML for the created HTML element]  
// ...args:   1. [arguments for the component function]
const unit = xnew(target, component, ...args);
```

There is no need to understand the details here.

All arguments are optional:
```js
xnew(Component, ...args);   // target is omitted
xnew(target);               // Component is omitted
xnew();                     // both are omitted
```

### Component
Define a component function to implement features for the unit:

```js
const unit = xnew(Component, ...args);

function Component(self, ...args) {
  // Implement features here
}
```

You can also use an arrow function:
```js
const unit = xnew((self) => {
  // Implement features here
});
```

### Target
The `target` specifies the HTML element for the new unit. Access it via `unit.element`.

#### Using an Existing HTML Element
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

:::note Variations
- `xnew('#hoge', ...)` (string)
- `xnew(document.querySelector('#hoge'), ...)` (HTMLElement)
- `xnew(window, ...)` (Window)
- `xnew(document, ...)` (Document)
:::

#### Creating a New HTML Element
```html
<body>
  <script>
    xnew({ tag: 'div', id: 'hoge' }, (self) => {
      self.element; // element (id = hoge)
    });
  </script>
</body>
```

:::note Variations
- `xnew({ tag: 'div', className: 'aaa', style: 'bbb' }, ...)`
:::

If `tag` is omitted, it defaults to `'div'`.

#### Inheriting Parent Elements
If `target` is omitted, the parent unit's element or the current scope's parent element is used.

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

    xnew({ tag: 'div', id: 'fuga' }, (self) => {
      // self.element: (id=fuga)
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

### InnerHTML
If `Component` is a string, it is set as the `innerHTML` of the created element.

```js
xnew({ tag: 'p', id: 'hoge' }, 'aaa');
```

```html
<body>
  <p id="hoge">aaa</p>
</body>
```

## System Properties
`unit` provides system properties for basic control. These are defined in the return value of the component function.

```js
const unit = xnew((self) => {
  // Initialization

  return {
    start() {
      // Called before the first update
    },
    update(count) {
      // Called repeatedly at rendering speed
    },
    stop() {
      // Called when unit.stop() is invoked
    },
    finalize() {
      // Called when unit.finalize() is invoked
      // Automatically called when the parent unit finalizes
    },
  };
});
```

### `unit.start`
Starts the update loop. By default, `unit.start()` is called automatically.  
To prevent this, call `unit.stop()` inside the component function.

```js
unit.start();
```

### `unit.stop`
Stops the update loop.
```js
unit.stop();
```

### `unit.finalize`
Finalizes the unit and its children. Associated elements are removed, and updates stop.
```js
unit.finalize();
```

### `unit.reboot`
Reboots the unit using the component function.
```js
unit.reboot();
```

### Calling Order
The methods `start`, `update`, `stop`, and `finalize` are called in a specific order:  
Child units are processed before their parent unit.

```js
const parent = xnew(Parent);

function Parent(self) {
  xnew(Child1);
  xnew(Child2);

  return {
    start() { console.log('Parent start'); },
    update() { console.log('Parent update'); },
    stop() { console.log('Parent stop'); },
    finalize() { console.log('Parent finalize'); },
  };
}

function Child1(self) {
  return {
    start() { console.log('Child1 start'); },
    update() { console.log('Child1 update'); },
    stop() { console.log('Child1 stop'); },
    finalize() { console.log('Child1 finalize'); },
  };
}

function Child2(self) {
  return {
    start() { console.log('Child2 start'); },
    update() { console.log('Child2 update'); },
    stop() { console.log('Child2 stop'); },
    finalize() { console.log('Child2 finalize'); },
  };
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

## Custom Properties
You can define custom properties unless they conflict with system properties. Reserved names include:
- `start`, `update`, `stop`, `finalize`, `reboot`, `element`, `on`, `off`, `_`

```js
const unit = xnew((self) => {
  let count = 0;

  return {
    countup() {
      count++;
    },
    set count(value) { // Setter
      count = value;
    },
    get count() { // Getter
      return count;
    },
  };
});

unit.countup();       // 0 -> 1
unit.count = 2;       // Setter
const x = unit.count; // Getter
```

## Event Listener
Use `unit.on` to add event listeners and `unit.off` to remove them.

### `unit.on`
Adds an event listener.
```js
unit.on(type, listener);
```

### `unit.off`
Removes event listeners.

```js
unit.off();                // Removes all listeners
unit.off(type);            // Removes listeners of a specific type
unit.off(type, listener);  // Removes a specific listener
```

### HTML Events
```html
<div id="target"></div>
<script>
  const unit = xnew('#target', Component);

  function Component(self) {
    self.on('click', (event) => {
      console.log('Clicked!');
    });
  }

  unit.on('click', (event) => {
    console.log('Clicked!');
  });
</script>
```

### Custom Events
#### Global Events
Use the `+` prefix to listen for events from anywhere.

```js
xnew(() => {
  xnew((self) => {
    self.on('+myevent', () => {
      console.log('Event received');
    });
  });

  xnew((self) => {
    xnew.emit('+myevent'); // Emit event
  });
});
```

#### Internal Events
Use the `-` prefix to listen for events emitted within the component function.

```html
<div id="target"></div>
<script>
  const unit = xnew('#target', Component);

  unit.on('-myevent', (data) => {
    console.log('Internal event received', data);
  });

  function Component(self) {
    xnew.timer(() => {
      const data = { key: 'value' };
      xnew.emit('-myevent', data);
    }, 1000);
  }
</script>
```

