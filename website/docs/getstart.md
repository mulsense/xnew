---
sidebar_position: 1
---

# Get Started

**Learn how to use `xnew` in less than 10 minutes.**

## Setup
### Via CDN
Include the following script in your HTML file:
```html
<script src="https://unpkg.com/@mulsense/xnew@2.5.x/dist/xnew.js"></script>
```

### Via CDN (ESM)
Use the ES module version with an import map:
```html
<script type="importmap">
{
  "imports": {
    "xnew": "https://unpkg.com/@mulsense/xnew@2.5.x/dist/xnew.module.js"
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
npm install @mulsense/xnew@2.5.x
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

<iframe style={{width:'100%',height:'120px',border:'solid 1px #DDD',borderRadius:'6px'}} src="/xnew/0_manual/getstart.html" ></iframe>

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/@mulsense/xnew@2.5.x/dist/xnew.js"></script>
</head>
<body>
  <script>
    xnew(Div);

    function Div(self) {
      xnew.nest({ style: { margin: '4px', padding: '4px', border: 'solid 1px #222' } });

      xnew({ tagName: 'p' }, 'my div');
      xnew(Divs);
    }

    function Divs(self) {
      xnew.nest({ style: { display: 'flex' } });

      xnew({ style: { width: '160px', height: '36px', background: '#d66' } }, '1');
      xnew({ style: { width: '160px', height: '36px', background: '#6d6' } }, '2');
      xnew({ style: { width: '160px', height: '36px', background: '#66d' } }, '3');
    }
  </script>
</body>
</html>
```

### Example 2: Adding Events and Animations
You can implement event listeners and animations in the component function.

<iframe style={{width:'100%',height:'300px',border:'solid 1px #DDD',borderRadius:'6px'}} src="/xnew/0_manual/box.html" ></iframe>

```html
<body>
  <script>
    xnew(Component);

    function Component(self) {
      xnew.nest({ style: { position: 'absolute', width: '200px', height: '200px', inset: 0, margin: 'auto', background: '#08F' } });

      const text = xnew({ tagName: 'span' });

      let isRunning = false;
      self.on('click', (event) => {
        isRunning ? self.stop() : self.start();
      });

      return {
        start() {
          isRunning = true;
          text.element.textContent = 'start';
        },
        update(count) {
          text.element.style.transform = `rotate(${count}deg)`;
        },
        stop() {
          isRunning = false;
          text.element.textContent = 'stop';
        },
      };
    }
  </script>
</body>
```

### Example 3: Parent-Child Relationship
When `xnew` is called inside a component function, a parent-child relationship is established.  
Connected units work together. For example, stopping the parent component also stops its children.

<iframe style={{width:'100%',height:'300px',border:'solid 1px #DDD',borderRadius:'6px'}} src="/xnew/0_manual/boxinbox.html" ></iframe>

```html
<body>
  <script>
    xnew(Parent);

    function Parent(self) {
      xnew.nest({ style: { position: 'absolute', width: '200px', height: '200px', inset: 0, margin: 'auto', background: '#08F' } });

      const text = xnew({ tagName: 'span' });

      xnew(Child);

      let isRunning = false;
      self.on('click', () => {
        isRunning ? self.stop() : self.start();
      });

      return {
        start() {
          isRunning = true;
          text.element.textContent = 'parent: start';
        },
        update(count) {
          self.element.style.transform = `rotate(${count}deg)`;
        },
        stop() {
          isRunning = false;
          text.element.textContent = 'parent: stop';
        },
      };
    }

    function Child(self) {
      xnew.nest({ style: { position: 'absolute', width: '100px', height: '100px', inset: 0, margin: 'auto', background: '#F80' } });

      const text = xnew({ tagName: 'span' });

      let isRunning = false;
      self.on('click', (event) => {
        event.stopPropagation(); // Prevent propagation to the parent element
        isRunning ? self.stop() : self.start();
      });

      return {
        start() {
          isRunning = true;
          text.element.textContent = 'child: start';
        },
        update(count) {
          self.element.style.transform = `rotate(${count}deg)`;
        },
        stop() {
          isRunning = false;
          text.element.textContent = 'child: stop';
        },
      };
    }
  </script>
</body>
```