# xnew.extend

`xnew.extend` adds functionality from another component to the current unit without creating a new element. This enables powerful composition patterns by mixing multiple behaviors into a single component.

## Usage

```js
xnew.extend(Component, props);
```

**Parameters:**
- `Component`: A component function to extend with
- `props`: Optional properties passed to the component function

**Behavior:**
- Executes the component function immediately
- Merges returned properties/methods into the current unit
- Accumulates event handlers (doesn't override)
- Later property definitions override earlier ones

## Example

### Basic Extension

```js
function Logger(unit) {
  return {
    log(message) {
      console.log(`[${new Date().toISOString()}]`, message);
    }
  };
}

const unit = xnew((unit) => {
  xnew.extend(Logger);

  unit.log('Application started'); // Method available immediately
});

// Output: [2025-01-15T10:30:00.000Z] Application started
```

:::note
`xnew.extend` can only be called during component initialization (inside the component function). You cannot call it after the unit is created.
:::

