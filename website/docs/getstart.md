---
sidebar_position: 1
---

# Get Started

**Learn how to use `xnew` in less than 10 minutes.**

## Setup
### Via CDN
Include the following script in your HTML file:
```html
<script src="https://unpkg.com/xnew@5.0.x/dist/xnew.js"></script>
```

### Via CDN (ESM)
Use the ES module version with an import map:
```html
<script type="importmap">
{
  "imports": {
    "xnew": "https://unpkg.com/xnew@5.0.x/dist/xnew.mjs"
  }
}
</script>

<script type="module">
import xnew from 'xnew';

// Your code here
</script>
```

### Via npm
Install `xnew` using npm:
```bash
npm install xnew@5.0.x
```

Then import it in your JavaScript file:
```js
import xnew from 'xnew';
```

## Tutorial
### Basic Usage
Calling `xnew` creates a unit (`self`). You can define a component function to implement features.

```js
const unit = xnew(Component, ...args);

function Component(self, ...args) {
  // Implement features here
}
```

You can also create a HTML element with `xnew`:
```js
const unit = xnew({ className: '...', style: '...', ... }, 'inner html');

unit.element; // Access the created element
```

### Example 1: Creating HTML Elements
Use `xnew` and `xnew.nest` to create HTML elements.

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
    // Create first component.
    xnew(Component);

    function Component(self) {
      // Pattern 1: Create new HTML element.
      xnew('<p>', 'Create new HTML elements.');
    
      // Pattern 2: Create child component.
      xnew(ChildComponent);
    }

    function ChildComponent(self) {
      // Pattern 3: Create new HTML element and nest the following elements.
      xnew.nest('<div style="display: flex;">');

      // The following elements are nested.
      xnew('<div style="width: 160px; height: 36px; background: #d66;">', '1');
      xnew('<div style="width: 160px; height: 36px; background: #6d6;">', '2');
      xnew('<div style="width: 160px; height: 36px; background: #66d;">', '3');
    }
  </script>
</body>
</html>
```

The above program will generate the following HTML elements:

```html
<body>
  <p>my div</p>
  <div style="display: flex;">
    <div style="width: 160px; height: 36px; background: #d66;">1</div>
    <div style="width: 160px; height: 36px; background: #6d6;">2</div>
    <div style="width: 160px; height: 36px; background: #66d;">3</div>
  </div>
</body>
```

### Example 2: Adding Events and Animations
You can implement event listeners and animations in the component function.  
In the demo program below, a box is animated.
Clicking on the box will toggle it start / stop.
<iframe style={{width:'100%',height:'300px',border:'solid 1px #DDD',borderRadius:'6px'}} src="/xnew/0_manual/box.html" ></iframe>

```html
<body>
  <script>
    xnew(Component);

    function Component(self) {
      xnew.nest('<div style="position: absolute; width: 200px; height: 200px; inset: 0; margin: auto; background: #08F">');
      
      const text = xnew('<span>');

      self.on('click', (event) => {
        self.state === 'started' ? self.stop() : self.start();
      });

      self.on('start', () => {
        text.element.textContent = 'start';
      });

      self.on('update', (count) => {
        self.element.style.transform = `rotate(${count}deg)`;
      });
      
      self.on('stop', () => {
        text.element.textContent = 'stop';
      });
    }
  </script>
</body>
```

### Example 3: Parent-Child Relation
When `xnew` is called inside a component function, a parent-child relation is established.  
Connected units work together. For example, stopping the parent component also stops its children.

<iframe style={{width:'100%',height:'300px',border:'solid 1px #DDD',borderRadius:'6px'}} src="/xnew/0_manual/boxinbox.html" ></iframe>

```html
<body>
  <script>
    xnew(Component);

    function Parent(self) {
      xnew.nest('<div style="position: absolute; width: 200px; height: 200px; inset: 0; margin: auto; background: #08F">');
      
      const text = xnew('<span>');
      xnew(Child);

      self.on('click', () => {
        self.state === 'started' ? self.stop() : self.start();
      });

      self.on('start', () => {
        text.element.textContent = 'parent: start';
      });

      self.on('update', (count) => {
        self.element.style.transform = `rotate(${count}deg)`;
      });
      
      self.on('stop', () => {
        text.element.textContent = 'parent: stop';
      });
    }

    function Child(self) {
      xnew.nest('<div style="position: absolute; width: 100px; height: 100px; inset: 0; margin: auto; background: #F80">');
     
      const text = xnew('<span>');

      self.on('click', (event) => {
        event.stopPropagation(); // cancel propagation to the parent element
        self.state === 'started' ? self.stop() : self.start();
      });

      self.on('start', () => {
        text.element.textContent = 'child: start';
      });

      self.on('update', (count) => {
        self.element.style.transform = `rotate(${count}deg)`;
      });
      
      self.on('stop', () => {
        text.element.textContent = 'child: stop';
      });
    }
  </script>
</body>
```