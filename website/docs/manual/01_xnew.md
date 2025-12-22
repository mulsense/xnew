# xnew

`xnew` is the core function of the library that creates interactive components and manages their lifecycle. This comprehensive guide covers all aspects of using `xnew` effectively.

## Overview

`xnew` simplifies component-oriented programming by providing a flexible and intuitive API. It allows you to:

- Create reusable components with custom behavior
- Manage HTML elements and their lifecycle
- Handle events and animations
- Build complex applications from simple building blocks

## Usage

`xnew` accepts the following arguments:

```js
const unit = xnew(target, Component, props);

function Component(unit, props) {
  // Define component behavior here
}
```
All arguments are optional.

- `target` (optional)  
Specifies the base HTML element for the generated unit.
- `Component` (optional)  
A function that defines the behavior of the unit.
- `props` (optional)  
An object containing properties to be passed to the Component function. 

## Components

Components are functions that define the behavior of your units. They receive two parameters:

- `unit`: The unit instance (provides access to element, events, lifecycle methods)
- `props`: Optional data passed to the component

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

The `target` parameter specifies which HTML element your component will be attached to. You can access this element via `unit.element` in your component.

### Targeting Existing Elements

Use CSS selectors or direct element references to target existing HTML elements:

```html
<body>
  <div id="my-container"></div>
  <script>
    // Using CSS selector
    xnew('#my-container', (unit) => {
      unit.element.style.background = 'lightblue';
    });
  </script>
</body>
```

**Supported target types:**
- `'#my-id'` - CSS selector string
- `document.querySelector('#my-id')` - HTMLElement object

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
  xnew('#parent', (unit) => {
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

The xnew event system allows you to handle DOM events, lifecycle events, and custom events. You can add and remove event listeners using `unit.on` and `unit.off`.

### Adding Event Listeners

Use `unit.on()` or `unit.on()` to add event listeners:

```js
function MyComponent(unit) {
  xnew.nest('<div>', 'click here');

  // Listen for click events on the element
  unit.on('click', (event) => {
    console.log('Element was clicked!');
  });
}

const unit = xnew(MyComponent);

// You can also add listeners from outside the component
unit.on('click', (event) => {
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
function myClickHandler(event) {
  console.log('Clicked');
}
unit.on('click', myClickHandler);
unit.off('click', myClickHandler);
```

## Lifecycle Events

xnew provides built-in lifecycle events that help you manage your component's behavior throughout its existence.

### Available Lifecycle Events

```js
function MyComponent(unit) {
  unit.on('start', () => {
    // Called once before the first update
    console.log('Component started');
  });

  unit.on('update', (frameCount) => {
    // Called continuously at ~60fps (or your browser's refresh rate)
    // Use for animations and real-time updates
    console.log('Frame:', frameCount);
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

  unit.on('update', (count) => {
    if (count < maxCount) {
      unit.element.textContent = count++;
    } else {
      unit.stop(); // Stop when target reached
    }
  });

  unit.on('stop', () => {
    console.log('Counting finished!');
  });
}

const counter = xnew('<div>', AnimatedCounter, { maxCount: 50 });
```

## Lifecycle Control Methods

You can control your component's lifecycle using these methods:

### `unit.start()`
Starts the update loop. Components start automatically by default.

```js
const unit = xnew((unit) => {
  unit.stop(); // Prevent auto-start

  unit.on('update', (count) => {
    console.log('Updating...', count);
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

### `unit.reboot()`
Restarts the component, re-running its component function.

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

Important: Child components execute their lifecycle events **before** their parent components.

```js
function Parent(unit) {
  xnew(Child1);
  xnew(Child2);

  unit.on('start', () => console.log('Parent start'));
  unit.on('update', () => console.log('Parent update'));
  unit.on('stop', () => console.log('Parent stop'));
}

function Child1(unit) {
  unit.on('start', () => console.log('Child1 start'));
  unit.on('update', () => console.log('Child1 update'));
  unit.on('stop', () => console.log('Child1 stop'));
}

function Child2(unit) {
  unit.on('start', () => console.log('Child2 start'));
  unit.on('update', () => console.log('Child2 update'));
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
(repeats...)

// When parent.stop() is called:
Child1 stop
Child2 stop
Parent stop
```

## DOM Events

xnew automatically handles standard DOM events like click, mouseover, keydown, etc.

```js
function InteractiveButton(unit) {
  unit.on('click', (event) => {
    console.log('Button clicked!');
    event.preventDefault(); // Standard DOM event object
  });
  
  unit.on('mouseover', (event) => {
    unit.element.style.background = 'lightblue';
  });
  
  unit.on('mouseout', (event) => {
    unit.element.style.background = '';
  });
}

const button = xnew('<button>Hover and click me</button>', InteractiveButton);
```

## Custom Events

xnew provides a powerful custom event system for communication between components.

### Global Events (+ prefix)

Global events can be heard by any component in your application:

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

Internal events are scoped to the component and its parent:

```js
function Timer(unit) {
  let seconds = 0;

  unit.on('-update', () => {
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

## Custom Properties and Methods

You can extend your components with custom properties and methods by returning an object from your component function. This creates a public API for your component.

### Basic Custom Methods

```js
function Counter(unit) {
  let count = 0;
  
  // Return public API
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
- `start`, `stop`, `finalize`, `reboot`
- `element`, `on`, `off`,
- `_` (internal use)


Next, explore `xnew.nest` for advanced component composition and organization!

