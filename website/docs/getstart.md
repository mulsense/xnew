---
sidebar_position: 1
---

# Get Started

**Your first component will be running in under 10 minutes.**

## What is xnew?

`xnew` is a JavaScript / TypeScript library for component-oriented programming.

The core idea is simple: a component is just a function. Call `xnew(MyComponent)` and xnew takes care of the DOM, the lifecycle, and the event wiring for you. No classes, no boilerplate — just functions that describe what your component does.

What makes xnew particularly useful:

- **Automatic cleanup** — timers, event listeners, and DOM elements created inside a component are all torn down together when the component is destroyed. No more hunting for memory leaks.
- **A built-in animation loop** — the `update` event fires every frame (~60fps), so animations are trivial to write.
- **Flexible event system** — components can talk to each other through global (`+event`) or internal (`-event`) custom events without tight coupling.
- **Game-ready addons** — first-party PixiJS and Three.js integrations let you build complex interactive apps with the same component model.

## Setup

Choose one of the following methods to include xnew in your project:

### Via CDN (Recommended for beginners)
Include the following script in your HTML file:
```html
<script src="https://unpkg.com/@mulsense/xnew@0.6.x/dist/xnew.js"></script>
```
### Via CDN (ESM)
Use the ES module version with an import map:
```html
<script type="importmap">
{
  "imports": {
    "@mulsense/xnew": "https://unpkg.com/@mulsense/xnew@0.6.x/dist/xnew.mjs"
  }
}
</script>

<script type="module">
import xnew from '@mulsense/xnew';

// Your code here
</script>
```

### Via npm
Install `xnew` using npm:
```bash
npm install @mulsense/xnew@0.6.x
```

Then import it in your JavaScript file:
```js
import xnew from '@mulsense/xnew';
```

## Tutorial

Two concepts to know, and then you're off:

- **unit** — the object returned by `xnew()`. It holds the DOM element, lifecycle controls, and event listeners for one component instance.
- **component** — a plain function that receives `(unit, props)` and defines what that unit does.

### Basic Syntax
There are two main ways to use `xnew`:

#### 1. Creating Components
```js
const unit = xnew(Component, props);

function Component(unit, props) {
  // Define behavior here
  // props = data passed to the component
}
```

#### 2. Creating HTML Elements
```js
const unit = xnew('<div class="my-class">', 'inner text');
unit.element; // Access the created DOM element
```

### Example 1: Your First Component

The smallest possible xnew program — one component, one element, five lines:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/xnew@0.6.x/dist/xnew.js"></script>
</head>
<body>
  <script>
    // Create your first component
    xnew(MyFirstComponent);

    function MyFirstComponent(unit) {
      // Create a simple paragraph element
      xnew('<p>', 'Hello, xnew!');
    }
  </script>
</body>
</html>
```

This will generate:
```html
<body>
  <p>Hello, xnew!</p>
</body>
```

### Example 2: Creating Multiple Elements

`xnew.nest()` shifts the nesting context so subsequent elements are placed inside a container. This is how you build structured layouts without writing a wall of HTML:

<iframe style={{width:'100%',height:'120px',border:'solid 1px #DDD',borderRadius:'6px'}} src="/xnew/0_manual/element.html" ></iframe>

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/xnew@0.6.x/dist/xnew.js"></script>
</head>
<body>
  <script>
    // Create main component
    xnew(MainComponent);

    function MainComponent(unit) {
      // Create a paragraph element
      xnew('<p>', 'Create new HTML elements.');
    
      // Create a child component
      xnew(ColorBoxes);
    }

    function ColorBoxes(unit) {
      // Create a container and nest child elements inside it
      xnew.nest('<div style="display: flex;">');

      // The following elements will be nested inside the container
      xnew('<div style="width: 160px; height: 36px; background: #d66;">', '1');
      xnew('<div style="width: 160px; height: 36px; background: #6d6;">', '2');
      xnew('<div style="width: 160px; height: 36px; background: #66d;">', '3');
    }
  </script>
</body>
</html>
```

This generates:
```html
<body>
  <p>Create new HTML elements.</p>
  <div style="display: flex;">
    <div style="width: 160px; height: 36px; background: #d66;">1</div>
    <div style="width: 160px; height: 36px; background: #6d6;">2</div>
    <div style="width: 160px; height: 36px; background: #66d;">3</div>
  </div>
</body>
```

**Key concepts:**
- `xnew.nest()` creates a container element and nests subsequent elements inside it
- Components can call other components to organize your code
- Each component is a reusable function

### Example 3: Adding Interactivity

Here's where xnew really shines. Click the box below to start and stop a CSS rotation animation. Notice how the `start`, `update`, and `stop` lifecycle events handle everything — no manual `requestAnimationFrame` bookkeeping needed:

<iframe style={{width:'100%',height:'300px',border:'solid 1px #DDD',borderRadius:'6px'}} src="/xnew/0_manual/box.html" ></iframe>

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/xnew@0.6.x/dist/xnew.js"></script>
</head>
<body>
  <script>
    xnew(RotatingBox);

    function RotatingBox(unit) {
      // Create a centered blue box and nest content inside it
      xnew.nest('<div style="position: absolute; width: 200px; height: 200px; inset: 0; margin: auto; background: #08F; cursor: pointer;">');
      
      // Add text inside the box
      const text = xnew('<span style="color: white; font-size: 24px; display: flex; justify-content: center; align-items: center; height: 100%;">');

      // Handle click events - toggle start/stop
      let running = false;
      unit.on('click', ({ event }) => {
        running ? unit.stop() : unit.start();
      });

      // When animation starts
      unit.on('start', () => {
        running = true;
        text.element.textContent = 'start';
      });

      // Update animation frame
      let rotate = 0;
      unit.on('update', () => {
        rotate++;
        unit.element.style.transform = `rotate(${rotate}deg)`;
      });

      // When animation stops
      unit.on('stop', () => {
        running = false;
        text.element.textContent = 'stop';
      });
    }
  </script>
</body>
</html>
```

**Key concepts:**
- `unit.on()` adds event listeners to your component
- `unit.start()` and `unit.stop()` control animations
- The 'update' event fires continuously during animation

## Next Steps

You now know everything to start building with xnew. Here's where to go next:

1. **[Manual — xnew](./manual/xnew)** — full API reference: events, lifecycle, custom methods, and more
2. **[Manual — xnew.timeout / interval / transition](./manual/xnew-timeout)** — timers with automatic cleanup and chainable transitions
3. **[Addons — xpixi / xthree](./addons/xpixi)** — drop-in PixiJS and Three.js integration
4. **[AI Prompt](./ai-prompt)** — paste this into any AI assistant to get xnew-aware coding help instantly
