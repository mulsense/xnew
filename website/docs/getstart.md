---
sidebar_position: 1
---

# Get Started

**Learn how to use `xnew` in less than 10 minutes.**

## What is xnew?

`xnew` is a JavaScript / TypeScript library for component-oriented programming,
providing a flexible architecture well-suited for applications with dynamic scenes and games.

## Setup

Choose one of the following methods to include xnew in your project:

### Via CDN (Recommended for beginners)
Include the following script in your HTML file:
```html
<script src="https://unpkg.com/@mulsense/xnew@0.2.x/dist/xnew.js"></script>
```
### Via CDN (ESM)
Use the ES module version with an import map:
```html
<script type="importmap">
{
  "imports": {
    "@mulsense/xnew": "https://unpkg.com/@mulsense/xnew@0.2.x/dist/xnew.mjs"
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
npm install @mulsense/xnew@0.2.x
```

Then import it in your JavaScript file:
```js
import xnew from '@mulsense/xnew';
```

## Tutorial
### Units and Components
- **unit**: When you call `xnew()`, it creates a "unit" - a building block of your application
- **Component**: A function that defines what a unit does and how it behaves

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

Let's start with a simple example. This creates a basic component that displays some text:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/xnew@5.0.x/dist/xnew.js"></script>
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

Now let's create multiple elements and organize them using `xnew.nest`:

<iframe style={{width:'100%',height:'120px',border:'solid 1px #DDD',borderRadius:'6px'}} src="/xnew/0_manual/element.html" ></iframe>

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/xnew@5.0.x/dist/xnew.js"></script>
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

Now let's add events and animations! This example creates an interactive rotating box:

<iframe style={{width:'100%',height:'300px',border:'solid 1px #DDD',borderRadius:'6px'}} src="/xnew/0_manual/box.html" ></iframe>

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/xnew@5.0.x/dist/xnew.js"></script>
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
      unit.on('click', (event) => {
        running ? unit.stop() : unit.start();
      });

      // When animation starts
      unit.on('start', () => {
        running = true;
        text.element.textContent = 'start';
      });

      // Update animation frame
      let count = 0;
      unit.on('update', () => {
        unit.element.style.transform = `rotate(${count++}deg)`;
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

Now that you understand the basics:

1. **Explore the examples** - Check out more complex examples in the sidebar
2. **Read the manual** - Learn about advanced features like timers, contexts, and addons
3. **Try the addons** - Integrate with popular libraries like PixiJS and Three.js

Happy coding with xnew! 🚀
