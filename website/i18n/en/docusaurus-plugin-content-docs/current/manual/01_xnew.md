# xnew

`xnew` is the core function of the library. It creates a **unit** — a self-contained component instance that owns its DOM element, its event listeners, and its lifecycle.

The key insight: when a unit is destroyed, everything inside it — timers, listeners, child elements — is cleaned up automatically. You never have to write teardown code by hand.

## Overview

`xnew` gives you:

- **Reusable components** — plain functions; no class syntax needed
- **Automatic DOM management** — create or attach elements declaratively
- **A built-in event system** — DOM events, lifecycle events, and custom events in one unified API
- **Composable building blocks** — nest components inside each other to build any structure

## Usage

All arguments are optional, so `xnew` scales from a single throwaway element to a full component tree.

```js
const unit = xnew(target, Component, props); // or xnew(Component, props)

function Component(unit, props) {
  // Define component behavior here
}
```
- `target` *(optional)* — the HTML element to attach to. Pass a DOM element, an HTML string like `'<div class="box">'`, or omit to inherit from the parent context.
- `Component` *(optional)* — a function that defines what this unit does.
- `props` *(optional)* — data passed as the second argument to the component function.

## Components

A component is just a function. It receives the unit it belongs to and any props passed in from the caller. There's nothing special to inherit or extend.

### Simple Component Example
```js
function MyComponent(unit, { message }) {
  // Access the HTML element
  console.log(unit.element);
  
  // Use props data
  unit.element.textContent = props.message;
}

// Create a unit with this component
const unit = xnew(MyComponent, { message: 'Hello World' });
```

### Arrow Function Components
```js
const unit = xnew((unit, props) => {
  // Component logic here
  unit.element.style.color = 'blue';
});
```

## Targeting

The `target` parameter determines which element the component is attached to. Access it anywhere inside the component via `unit.element`.

### Targeting Existing Elements

Use element references to target existing HTML elements:

```html
<body>
  <div id="my-container"></div>
  <script>
    const element = document.querySelector('#my-container'); // HTML element
    xnew(element, (unit) => {
      unit.element.style.background = 'my text';
    });
  </script>
</body>
```

### Creating New Elements

Create new HTML elements by providing an HTML string as the target:

```html
<body>
  <script>
    xnew('<div class="new-element">', (unit) => {
      unit.element.textContent = 'I am a new element!';
    });
  </script>
</body>
```

### Element Inheritance

When no target is specified, xnew inherits the element from its parent context:

```html
<div id="parent"></div>
<script>
  xnew(document.querySelector('#parent'), (unit) => {
    // unit.element is the #parent div
    
    xnew((unit) => {
      // unit.element is inherited: still the #parent div
    });
    
    xnew('<span>', (unit) => {
      // unit.element is the new <span>, child of #parent
    });
  });
</script>
```

### Setting textContent

You can set the content directly when creating elements:

```js
// Create element with content
xnew('<p>', 'This is the paragraph content');

// Equivalent to:
xnew('<p>', (unit) => {
  unit.element.textContent = 'This is the paragraph content';
});
```

## Event System

xnew uses a single unified API — `unit.on` / `unit.off` — for DOM events, lifecycle events, and custom events. There's nothing extra to learn for each category.

### Adding Event Listeners

```js
function MyComponent(unit) {
  xnew.nest('<div>', 'click here');

  // Listen for click events on the element
  unit.on('click', ({ event }) => {
    console.log('Element was clicked!');
  });
}

const unit = xnew(MyComponent);

// You can also add listeners from outside the component
unit.on('click', ({ event }) => {
  console.log('External click listener');
});
```

### Removing Event Listeners

Use `unit.off()` to remove event listeners:

```js
const unit = xnew(MyComponent);

// Remove all listeners
unit.off();

// Remove all listeners of a specific type
unit.off('click');

// Remove a specific listener function
function myClickHandler({ event }) {
  console.log('Clicked');
}
unit.on('click', myClickHandler);
unit.off('click', myClickHandler);
```

## Lifecycle Events

These five events cover the entire life of a component. You only need to listen to the ones you care about.

### Available Lifecycle Events

```js
function MyComponent(unit) {
  unit.on('start', () => {
    // Called once before the first update
    console.log('Component started');
  });

  unit.on('update', () => {
    // Called continuously at ~60fps (or your browser's refresh rate)
    // Use for animations and real-time updates
    console.log('update');
  });

  unit.on('render', () => {
    // render after update
    console.log('render');
  });

  unit.on('stop', () => {
    // Called when the update loop is stopped
    console.log('Component stopped');
  });

  unit.on('finalize', () => {
    // Called when the component is destroyed
    console.log('Component finalized');
  });
}

const unit = xnew(MyComponent);
```

### Lifecycle Example: Animated Counter

```js
function AnimatedCounter(unit, { maxCount }) {
  xnew.nest('<div>');

  unit.on('start', () => {
    unit.element.textContent = '0';
  });

  let count = 0;
  unit.on('update', (count) => {
    if (count < maxCount) {
      unit.element.textContent = count++;
    } else {
      unit.stop(); // Stop when target reached
    }
    unit.element.textContent = count;
  });

  unit.on('stop', () => {
    console.log('Counting finished!');
  });
}

const counter = xnew('<div>', AnimatedCounter, { maxCount: 50 });
```

## Lifecycle Control Methods

Three methods give you full control over a unit's life:  `start` it, `stop` it, or `finalize` it for good.

### `unit.start()`
Starts the update loop. Components start automatically by default.

```js
const unit = xnew((unit) => {
  unit.stop(); // Prevent auto-start

  unit.on('update', () => {
    console.log('Updating...');
  });
});

// Manually start later
xnew.timeout(() => {
  unit.start();
}, 2000);
```

### `unit.stop()`
Stops the update loop. The component remains alive but doesn't update.

```js
const unit = xnew((unit) => {
  unit.on('click', () => {
    unit.stop(); // Stop updates when clicked
  });
});
```

### `unit.finalize()`
Completely destroys the component and removes its element from the DOM.

```js
const unit = xnew('<div>', 'Click to destroy me');

unit.on('click', () => {
  unit.finalize(); // Element will be removed from DOM
});
```

```js
function RandomColor(unit) {
  const colors = ['red', 'blue', 'green', 'yellow'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  unit.element.style.background = randomColor;
}

const unit = xnew('<div style="width:100px;height:100px;">', RandomColor);

// Reboot to get a new random color
xnew.interval(() => {
  unit.reboot();
}, 1000);
```

### Lifecycle Execution Order

Child events always fire **before** parent events. This means children finish their setup before the parent's `start` runs, and finish tearing down before the parent's `stop` runs.

```js
function Parent(unit) {
  xnew(Child1);
  xnew(Child2);

  unit.on('start', () => console.log('Parent start'));
  unit.on('update', () => console.log('Parent update'));
  unit.on('render', () => console.log('Parent render'));
  unit.on('stop', () => console.log('Parent stop'));
}

function Child1(unit) {
  unit.on('start', () => console.log('Child1 start'));
  unit.on('update', () => console.log('Parent update'));
  unit.on('render', () => console.log('Child1 render'));
  unit.on('stop', () => console.log('Child1 stop'));
}

function Child2(unit) {
  unit.on('start', () => console.log('Child2 start'));
  unit.on('update', () => console.log('Parent update'));
  unit.on('render', () => console.log('Child2 render'));
  unit.on('stop', () => console.log('Child2 stop'));
}

const parent = xnew(Parent);
```

**Output:**
```
Child1 start
Child2 start
Parent start

Child1 update
Child2 update
Parent update
Child1 render
Child2 render
Parent render
(repeats...)

// When parent.stop() is called:
Child1 stop
Child2 stop
Parent stop
```

## DOM Events

Standard DOM event names work out of the box through `unit.on`. The callback receives `{ event }` — the native DOM Event object.

```js
function InteractiveButton(unit) {
  unit.on('click', ({ event }) => {
    console.log('Button clicked!');
    event.preventDefault(); // Standard DOM event object
  });
  
  unit.on('mouseover', ({ event }) => {
    unit.element.style.background = 'lightblue';
  });
  
  unit.on('mouseout', ({ event }) => {
    unit.element.style.background = '';
  });
}

const button = xnew('<button>Hover and click me</button>', InteractiveButton);
```

## Custom Events

Components need to talk to each other without tight coupling. xnew solves this with a prefix-based event system.

### Global Events (+ prefix)

A `+` prefix makes the event visible to every active component in the app — useful for things like score updates, game-over signals, or theme changes:

```js
function Sender(unit) {
  xnew.nest('<button>', 'Send Message');

  unit.on('click', () => {
    // Emit global event
    xnew.emit('+message', { 
      text: 'Hello from sender!',
      timestamp: Date.now()
    });
  });
}

function Receiver(unit) {
  xnew.nest('<div>', 'Waiting for message...');
 
 // Listen for global events
  unit.on('+message', (data) => {
    console.log('Received message:', data.text);
    unit.element.textContent = data.text;
  });
}

// These components can communicate even though they're not related
xnew(Sender);
xnew(Receiver);
```

### Internal Events (- prefix)

A `-` prefix scopes the event to the component and its direct parent only — perfect for a child reporting back to its owner without leaking into the rest of the app:

```js
function Timer(unit) {
  let seconds = 0;

  unit.on('update', () => {
    seconds++;
    if (seconds % 60 === 0) {
      // Emit internal event every minute
      xnew.emit('-message', { minutes: seconds / 60 });
    }
  });
}

// Parent can listen to child's internal events
const timer = xnew(Timer);
timer.on('-message', (data) => {
  console.log(`${data.minutes} minute(s) have passed!`);
});
```

## Custom Methods

Return an object from your component function and those properties become part of the unit's public API. This is the cleanest way to expose behavior to callers without breaking encapsulation.

### Basic Custom Methods

```js
function Counter(unit) {
  let count = 0;
  
  // Return public API (methods, getter, setter)
  return {
    increment() {
      count++;
    },
    value() {
      return count;
    },
  };
}

const counter = xnew(Counter);

// Use custom methods
counter.increment();          // count: 1
console.log(counter.value()); // 1
```

### Getters and Setters

```js
function ColorBox(unit) {
  let currentColor = 'red';
  
  // Set initial color
  unit.element.style.background = currentColor;
  
  return {
    set color(newColor) {
      currentColor = newColor;
      unit.element.style.background = currentColor;
    },
    
    get color() {
      return currentColor;
    },
    
    randomize() {
      const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }
  };
}

const box = xnew('<div style="width:100px;height:100px;">', ColorBox);

// Use getters and setters
box.color = 'blue';        // Setter
console.log(box.color);    // Getter: "blue"
box.randomize();           // Custom method
```

### Reserved Property Names

Avoid these reserved names when creating custom properties:
- `start`, `stop`, `finalize`
- `element`, `on`, `off`,
- `_` (internal use)


Next, check out [`xnew.nest`](./xnew.nest) to see how to build nested element structures cleanly.

