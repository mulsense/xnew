# xnew.append

`xnew.append` dynamically adds child components to existing units. You can append to a specific unit or to all units of a particular component type. This enables powerful patterns for extending functionality after component creation.

## Usage

### Append to a Specific Unit

```js
xnew.append(unit, ChildComponent, props);
```

### Append to All Units of a Component Type

```js
xnew.append(Component, ChildComponent, props);
```

**Parameters:**
- `unit` or `Component`: Target unit instance or component function
- `ChildComponent`: Component function to create as a child
- `props`: Optional properties to pass to the child component

## Example

### Appending to a Specific Unit

```js
function Container(unit) {
  xnew.nest('<div>');
  unit.element.style.border = '1px solid #ccc';
  unit.element.style.padding = '10px';
}

function Item(unit, { text }) {
  xnew.nest('<div>');
  unit.element.textContent = text;
  unit.element.style.margin = '5px';
}

const container = xnew(Container);

// Add items dynamically
xnew.append(container, Item, { text: 'First item' });
xnew.append(container, Item, { text: 'Second item' });
xnew.append(container, Item, { text: 'Third item' });
```

### Appending to All Units of a Type

```js
function Card(unit, { title }) {
  xnew.nest('<div>');
  unit.element.style.border = '1px solid #ddd';
  unit.element.style.padding = '10px';
  unit.element.style.margin = '5px';
  unit.element.innerHTML = `<h3>${title}</h3>`;
}

function DeleteButton(unit) {
  xnew.nest('<button>');
  unit.element.textContent = 'Delete';
  unit.element.style.marginTop = '10px';

  unit.on('click', () => {
    // Find the parent Card unit and remove it
    unit._.parent.finalize();
  });
}

// Create multiple cards
xnew(Card, { title: 'Card 1' });
xnew(Card, { title: 'Card 2' });
xnew(Card, { title: 'Card 3' });

// Add delete buttons to all existing cards
xnew.append(Card, DeleteButton);
```

## Use Cases

`xnew.append` is particularly useful for:

- **Dynamic feature addition**: Add functionality to components after creation
- **Plugin systems**: Extend components with optional plugins
- **Bulk operations**: Add the same child to multiple parents at once
- **Conditional enhancements**: Add features based on runtime conditions
- **Event-driven architecture**: Respond to events by attaching components
- **Lazy loading**: Add components only when needed

:::note
Child units created with `xnew.append` are automatically cleaned up when their parent units are finalized, ensuring proper memory management.
:::
