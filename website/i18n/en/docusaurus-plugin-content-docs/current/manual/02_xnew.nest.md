# xnew.nest

`xnew.nest` creates a child element and shifts `unit.element` to point to it. Any elements created after the call are placed inside the new element automatically — no manual parent references needed.

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

`xnew.nest` does two things at once:

1. Creates the new element as a child of the current element.
2. Shifts `unit.element` so the next `xnew()` calls land inside it.

Wrapping a block in a nested `xnew(() => { ... })` call limits the context shift to that scope, so the parent level is restored when the inner function returns. This is how you build multi-level layouts cleanly.

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

- **Context shift** — `xnew.nest` changes `unit.element` to the newly created element.
- **Scoped nesting** — wrap blocks in a nested `xnew()` call to contain the context shift; the parent level is restored when the inner function returns.
- **Return value** — `xnew.nest` returns the raw `HTMLElement` for cases where you need direct access.
- **Automatic cleanup** — nested elements are removed when the parent unit is finalized.

:::tip
Use nested `xnew()` calls to maintain proper element hierarchy. After a nested `xnew()` completes, the context returns to the parent level.
:::
