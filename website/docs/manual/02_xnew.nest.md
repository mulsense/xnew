# xnew.nest

`xnew.nest` creates a new HTML element as a child of the current element and shifts the context to that new element. After calling `xnew.nest`, subsequent operations work on the newly created element instead of the original parent.

## Usage

```js
const element = xnew.nest(htmlString);
```

**Parameters:**
- `htmlString`: HTML string to create the element (e.g., `'<div>'`, `'<span class="highlight">'`)

**Returns:**
- The newly created HTMLElement

**Side effect:**
- `unit.element` now points to the newly created element

## How It Works

`xnew.nest` serves two purposes:

1. **Creates a new element** as a child of the current element
2. **Changes the context** so `unit.element` points to the new element

This allows you to build nested structures naturally by working "inside" elements as you create them.

## Example

### Basic Nesting

```js
xnew((unit) => {
  // Initially, unit.element is document.body

  xnew.nest('<header>');
  // Now unit.element === header

  xnew.nest('<h1>');
  unit.element.textContent = 'Welcome';
  // h1 is created inside header
});

// Result:
// <header>
//   <h1>Welcome</h1>
// </header>
```

### Managing Nesting Levels

```js
function Card(unit, { title, content }) {
  xnew.nest('<div class="card">');
  unit.element.style.border = '1px solid #ddd';
  unit.element.style.padding = '15px';

  // Create and immediately exit header
  xnew((unit) => {
    xnew.nest('<div class="card-header">');
    unit.element.style.fontWeight = 'bold';
    unit.element.textContent = title;
  });
  // After the nested xnew, we're back to the card level

  // Create body at card level
  xnew((unit) => {
    xnew.nest('<div class="card-body">');
    unit.element.textContent = content;
  });
}

xnew(Card, {
  title: 'My Card',
  content: 'This is the card content'
});

// Result:
// <div class="card">
//   <div class="card-header">My Card</div>
//   <div class="card-body">This is the card content</div>
// </div>
```

## Key Concepts

- **Context shift**: `xnew.nest` changes `unit.element` to point to the newly created element
- **Nesting scope**: Use nested `xnew()` calls to control which element is the parent
- **Return value**: `xnew.nest` returns the created element for immediate access
- **Automatic cleanup**: Nested elements are automatically removed when the parent unit is finalized

:::tip
Use nested `xnew()` calls to maintain proper element hierarchy. After a nested `xnew()` completes, the context returns to the parent level.
:::
