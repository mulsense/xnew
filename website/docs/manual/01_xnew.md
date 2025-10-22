# xnew

`xnew` is the core function of the library that creates interactive components and manages their lifecycle. This comprehensive guide covers all aspects of using `xnew` effectively.

## Overview

`xnew` simplifies component-oriented programming by providing a flexible and intuitive API. It allows you to:

- Create reusable components with custom behavior
- Manage HTML elements and their lifecycle
- Handle events and animations
- Build complex applications from simple building blocks

## Basic Syntax

There are two main ways to use `xnew`:

### 1. Creating Components
```js
const unit = xnew(Component, props);

function Component(self, props) {
  // Define component behavior here
}
```

### 2. Creating HTML Elements Directly
```js
const unit = xnew('<div class="my-class">', 'inner content');
```

### 3. Targeting Specific Elements
```js
const unit = xnew(target, Component, props);
// target: existing element, selector, or HTML string
```


## Components

Components are functions that define the behavior of your units. They receive two parameters:

- `self`: The unit instance (provides access to element, events, lifecycle methods)
- `props`: Optional data passed to the component

### Simple Component Example
```js
function MyComponent(self, { message }) {
  // Access the HTML element
  console.log(self.element);
  
  // Use props data
  self.element.textContent = props.message;
}

// Create a unit with this component
const unit = xnew(MyComponent, { message: 'Hello World' });
```

### Arrow Function Components
```js
const unit = xnew((self, props) => {
  // Component logic here
  self.element.style.color = 'blue';
});
```

## Element Targeting

The `target` parameter specifies which HTML element your component will be attached to. You can access this element via `self.element` in your component.

### Targeting Existing Elements

Use CSS selectors or direct element references to target existing HTML elements:

```html
<body>
  <div id="my-container"></div>
  <script>
    // Using CSS selector
    xnew('#my-container', (self) => {
      self.element.style.background = 'lightblue';
    });
  </script>
</body>
```

**Supported target types:**
- `'#my-id'` - CSS selector string
- `document.querySelector('#my-id')` - HTMLElement object
- `window` - Window object
- `document` - Document object

### Creating New Elements

Create new HTML elements by providing an HTML string as the target:

```html
<body>
  <script>
    xnew('<div class="new-element">', (self) => {
      self.element.textContent = 'I am a new element!';
    });
  </script>
</body>
```

### Element Inheritance

When no target is specified, xnew inherits the element from its parent context:

```html
<div id="parent"></div>
<script>
  xnew('#parent', (self) => {
    // self.element is the #parent div
    
    xnew((self) => {
      // self.element is inherited: still the #parent div
    });
    
    xnew('<span>', (self) => {
      // self.element is the new <span>, child of #parent
    });
  });
</script>
```

### Setting innerHTML

You can set the content directly when creating elements:

```js
// Create element with content
xnew('<p>', 'This is the paragraph content');

// Equivalent to:
xnew('<p>', (self) => {
  self.element.innerHTML = 'This is the paragraph content';
});
```

## Event System

The xnew event system allows you to handle DOM events, lifecycle events, and custom events. You can add and remove event listeners using `unit.on` and `unit.off`.

### Adding Event Listeners

Use `unit.on()` or `self.on()` to add event listeners:

```js
function MyComponent(self) {
  xnew.nest('<div>', 'click here');

  // Listen for click events on the element
  self.on('click', (event) => {
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
function MyComponent(self) {
  self.on('start', () => {
    // Called once before the first update
    console.log('Component started');
  });

  self.on('update', (frameCount) => {
    // Called continuously at ~60fps (or your browser's refresh rate)
    // Use for animations and real-time updates
    console.log('Frame:', frameCount);
  });

  self.on('stop', () => {
    // Called when the update loop is stopped
    console.log('Component stopped');
  });

  self.on('finalize', () => {
    // Called when the component is destroyed
    console.log('Component finalized');
  });
}

const unit = xnew(MyComponent);
```

### Lifecycle Example: Animated Counter

```js
function AnimatedCounter(self, { maxCount }) {
  xnew.nest('<div>');

  self.on('start', () => {
    self.element.textContent = '0';
  });
  
  self.on('update', (count) => {
    if (count < maxCount) {
      self.element.textContent = count++;
    } else {
      self.stop(); // Stop when target reached
    }
  });
  
  self.on('stop', () => {
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
const unit = xnew((self) => {
  self.stop(); // Prevent auto-start
  
  self.on('update', (count) => {
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
const unit = xnew((self) => {
  self.on('click', () => {
    self.stop(); // Stop updates when clicked
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
function RandomColor(self) {
  const colors = ['red', 'blue', 'green', 'yellow'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  self.element.style.background = randomColor;
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
function Parent(self) {
  xnew(Child1);
  xnew(Child2);
  
  self.on('start', () => console.log('Parent start'));
  self.on('update', () => console.log('Parent update'));
  self.on('stop', () => console.log('Parent stop'));
}

function Child1(self) {
  self.on('start', () => console.log('Child1 start'));
  self.on('update', () => console.log('Child1 update'));
  self.on('stop', () => console.log('Child1 stop'));
}

function Child2(self) {
  self.on('start', () => console.log('Child2 start'));
  self.on('update', () => console.log('Child2 update'));
  self.on('stop', () => console.log('Child2 stop'));
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
function InteractiveButton(self) {
  self.on('click', (event) => {
    console.log('Button clicked!');
    event.preventDefault(); // Standard DOM event object
  });
  
  self.on('mouseover', (event) => {
    self.element.style.background = 'lightblue';
  });
  
  self.on('mouseout', (event) => {
    self.element.style.background = '';
  });
}

const button = xnew('<button>Hover and click me</button>', InteractiveButton);
```

## Custom Events

xnew provides a powerful custom event system for communication between components.

### Global Events (+ prefix)

Global events can be heard by any component in your application:

```js
function Sender(self) {
  xnew.nest('<button>', 'Send Message');

  self.on('click', () => {
    // Emit global event
    self.emit('+message', { 
      text: 'Hello from sender!',
      timestamp: Date.now()
    });
  });
}

function Receiver(self) {
  xnew.nest('<div>', 'Waiting for message...');
 
 // Listen for global events
  self.on('+message', (data) => {
    console.log('Received message:', data.text);
    self.element.textContent = data.text;
  });
}

// These components can communicate even though they're not related
xnew(Sender);
xnew(Receiver);
```

### Internal Events (- prefix)

Internal events are scoped to the component and its parent:

```js
function Timer(self) {
  let seconds = 0;
  
  self.on('update', () => {
    seconds++;
    if (seconds % 60 === 0) {
      // Emit internal event every minute
      self.emit('-message', { minutes: seconds / 60 });
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
function Counter(self) {
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
function ColorBox(self) {
  let currentColor = 'red';
  
  // Set initial color
  self.element.style.background = currentColor;
  
  return {
    set color(newColor) {
      currentColor = newColor;
      self.element.style.background = currentColor;
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
- `element`, `on`, `off`, `emit`,
- `_` (internal use)

## Summary

The `xnew` function is the foundation of component-based development with this library. Key concepts to remember:

- **Components** define behavior through functions
- **Lifecycle events** manage component states automatically
- **Element targeting** gives you flexible DOM control
- **Event system** enables powerful component communication
- **Custom properties** create reusable component APIs

Next, explore `xnew.nest` for advanced component composition and organization!

