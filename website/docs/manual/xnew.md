---
sidebar_position: 1
---

# xnew
It create a new `unit`.  
How `xnew` works makes component-oriented programming easier.

## basic usage
### arguments
As shown below, `xnew` accepts some arguments.
```js
// parent:    [a unit object]
// target:    1. [an existing html element] or 
//            2. [attributes to create a html element]  
// Component: 1. [an component function] or 
//            2. [an inner html for the created html element]  
// ...args:   1. [arguments for the component function]
const unit = xnew(parent, target, component, ...args);
```

These arguments are often omitted.  
```js
xnew(Component, ...args);           // parent and target are omitted
xnew(parent, Component, ...args);   // target is omitted
xnew(target, Component, ...args);   // parent is omitted
xnew(parent, target);               // ...
xnew(parent);                       // ...
xnew(target);                       // ...
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

You can also use a function literal.  `xnew((self) => {});`
```js
const unit = xnew((self) => {
  // ...
  // implement features
});
```

### parent
`parent` parameter is set as parent `unit`.  
If you omit the `parent` parameter, the nesting higher unit or otherwise `null` is assigned.   
    
```js
xnew((self) => {
  // unit1.parent: null
  const unit1 = self;

  // unit2.parent: unit1
  const unit2 = xnew((self) => {
  });

  // unit3.parent: unit1
  const unit3 = xnew((self) => {
  });

  // unit4.parent: unit2
  const unit4 = xnew(unit2, (self) => {
  });
})
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
If you omit the `element` parameter, the parent unit's element or otherwise `document.body` is assigned. 
    
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
</script>;
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
    promise: new Promise((resolve, reject) => {
      // update will not start until this promise is resolved. (accessed by unit.promise)
    }), 
    start() {
      // fires before first update.
    },
    update() {
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
unit.reboot(...args); // ...args for the component function.
```

### `unit.state`
This variable represents the state of the unit.
```js
unit.state; // [pending → running ↔ stopped → finalized] 
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
- `promise`, `start`, `update`, `stop`, `finalize`, `reboot`, `state`
- `parent`,  `element`, `on`, `off`, `emit`, `key`, `_`

```js
const unit = xnew((self) =>  {
  let counter = 0;

  return {
    countup () {
      counter++;
    },
    set counter(value) { // setter
      counter = value;
    },
    get counter() { // getter
      return counter;
    }
  }
});

unit.countup();         // 0 -> 1
unit.counter = 2;       // setter
const x = unit.counter; // getter
```

