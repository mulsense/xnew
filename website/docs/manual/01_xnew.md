# xnew

`xnew` is the core function of the library that creates interactive components and manages their lifecycle. This comprehensive guide covers all aspects of using `xnew` effectively.

## Overview

`xnew` simplifies component-oriented programming by providing a flexible and intuitive API. It allows you to:

- Create reusable components with custom behavior
- Manage HTML elements and their lifecycle
- Handle events and animations
- Build complex applications from simple building blocks

## Usage

There are two main ways to use `xnew`:

### A. Creating Components
```js
const unit = xnew(Component, props);

function Component(unit, props) {
  // Define component behavior here
}
```

### B. Targeting Specific Elements
```js
const unit = xnew(target, Component, props);
// target: existing element, selector, or HTML string
// Component, props: can be omitted
```


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

## Targeting

The `target` parameter specifies which HTML element your component will be attached to. You can access this element via `unit.element` in your component.

### Targeting Existing Elements

Use CSS selectors or direct element references to target existing HTML elements:

**Supported target types:**
- `'#my-id'` - CSS selector string
- `document.querySelector('#my-id')` - HTMLElement object
- `window` - Window object
- `document` - Document object

### Creating New Elements

Create new HTML elements by providing an HTML string as the target.

### Element Inheritance

When no target is specified, xnew inherits the element from its parent context.

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

Use `unit.on()` to add event listeners:

```js
function MyComponent(unit) {
  xnew.nest('<div>');
  unit.element.textContent = 'click here';

  // Listen for click events on the element
  unit.on('click', (event) => {
    console.log('Element was clicked!');
  });
}

const unit = xnew(MyComponent);
```

### Removing Event Listeners

Use `unit.off()` to remove event listeners. You can remove all listeners, all listeners of a specific type, or a specific listener function.

## Lifecycle Events

xnew provides built-in lifecycle events that help you manage your component's behavior throughout its existence.

### Available Lifecycle Events

- `start`: Called once before the first update
- `update`: Called continuously at ~60fps for animations and real-time updates
- `stop`: Called when the update loop is stopped
- `finalize`: Called when the component is destroyed

### Lifecycle Example: Animated Counter

```js
function AnimatedCounter(unit, { maxCount }) {
  xnew.nest('<div>');

  unit.on('start', () => {
    unit.element.textContent = '0';
  });
  
  let count = 0;
  unit.on('update', () => {
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

### `unit.stop()`
Stops the update loop. The component remains alive but doesn't update.

### `unit.finalize()`
Completely destroys the component and removes its element from the DOM.

### `unit.reboot()`
Restarts the component, re-running its component function.

### Lifecycle Execution Order

Important: Child components execute their lifecycle events **before** their parent components.

## DOM Events

xnew automatically handles standard DOM events like click, mouseover, keydown, etc.

## Custom Events

xnew provides a powerful custom event system for communication between components.

### Global Events (+ prefix)

Global events can be heard by any component in your application.

### Internal Events (- prefix)

Internal events are scoped to the component and its parent.

## Custom Properties and Methods

You can extend your components with custom properties and methods by returning an object from your component function. This creates a public API for your component.

### Custom Methods Example

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

